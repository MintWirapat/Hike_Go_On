/**
 * Server actions สำหรับจัดการการจองสถานที่แคมป์ปิ้ง
 */
"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createNotification } from "./notification-actions"

/**
 * สร้างการจองใหม่
 * @param {Object} bookingData - ข้อมูลการจอง
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function createBooking(bookingData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนจองสถานที่แคมป์" }
    }

    // ดึงข้อมูลโซนจาก notes
    const zoneInfo = bookingData.notes || ""
    const zoneName = zoneInfo.match(/โซนที่จอง: (.+)/)
    const zoneNameValue = zoneName ? zoneName[1] : ""

    // ตรวจสอบว่ามีการจองในช่วงวันที่เลือกหรือไม่
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("*")
      .eq("campsite_id", bookingData.campsite_id)
      .or(`check_in_date.lte.${bookingData.check_out_date},check_out_date.gte.${bookingData.check_in_date}`)
      .neq("status", "cancelled") // ไม่รวมการจองที่ถูกยกเลิกแล้ว

    if (checkError) {
      console.error("Error checking bookings:", checkError)
      return { success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบการจอง" }
    }

    // ตรวจสอบว่ามีการจองโซนนี้ในช่วงวันที่เลือกหรือไม่
    const zoneBookings = existingBookings.filter(
      (booking) => booking.notes && booking.notes.includes(`โซนที่จอง: ${zoneNameValue}`),
    )

    if (zoneBookings.length > 0) {
      return {
        success: false,
        error: `โซน ${zoneNameValue} ถูกจองในช่วงวันที่คุณเลือกแล้ว กรุณาเลือกโซนอื่นหรือวันที่อื่น`,
        conflictBookings: zoneBookings,
      }
    }

    // เพิ่ม user_id ให้กับข้อมูลการจอง
    const bookingWithUser = {
      ...bookingData,
      user_id: session.user.id,
    }

    // ลบ zone_id ออกจากข้อมูลการจอง (ถ้ามี)
    if (bookingWithUser.zone_id) {
      delete bookingWithUser.zone_id
    }

    // สร้างการจองใหม่
    const { data: booking, error } = await supabase.from("bookings").insert(bookingWithUser).select().single()

    if (error) {
      console.error("Error creating booking:", error)
      return { success: false, error: error.message }
    }

    // ดึงข้อมูลสถานที่แคมป์
    const { data: campsite } = await supabase
      .from("campsites")
      .select("name, owner_id")
      .eq("id", bookingData.campsite_id)
      .single()

    if (campsite) {
      // สร้างการแจ้งเตือนสำหรับผู้จอง
      await createNotification({
        user_id: session.user.id,
        title: "การจองสำเร็จ",
        message: `คุณได้จอง ${campsite.name} เรียบร้อยแล้ว กรุณารอการยืนยันจากเจ้าของสถานที่`,
        type: "booking",
        reference_id: booking.id,
        is_read: false,
      })

      // สร้างการแจ้งเตือนสำหรับเจ้าของสถานที่
      await createNotification({
        user_id: campsite.owner_id,
        title: "มีการจองใหม่",
        message: `มีผู้จอง ${campsite.name} กรุณาตรวจสอบและยืนยันการจอง`,
        type: "booking_request",
        reference_id: booking.id,
        is_read: false,
      })
    }

    // Revalidate paths
    revalidatePath("/profile/bookings")
    revalidatePath(`/campsite/${bookingData.campsite_id}`)

    return { success: true, booking }
  } catch (error) {
    console.error("Error in createBooking:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ยกเลิกการจอง
 * @param {string} bookingId - ID ของการจอง
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function cancelBooking(bookingId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนยกเลิกการจอง" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของการจองหรือไม่
    const { data: existingBooking, error: checkError } = await supabase
      .from("bookings")
      .select("user_id, status, campsite_id")
      .eq("id", bookingId)
      .single()

    if (checkError) {
      return { success: false, error: checkError.message }
    }

    if (existingBooking.user_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ยกเลิกการจองนี้" }
    }

    if (existingBooking.status === "cancelled") {
      return { success: false, error: "การจองนี้ถูกยกเลิกไปแล้ว" }
    }

    if (existingBooking.status === "completed") {
      return { success: false, error: "ไม่สามารถยกเลิกการจองที่เสร็จสิ้นแล้วได้" }
    }

    // อัปเดตสถานะการจองเป็น "cancelled"
    const { error: updateError } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // ดึงข้อมูลสถานที่แคมป์และเจ้าของ
    const { data: campsite } = await supabase
      .from("campsites")
      .select("name, owner_id")
      .eq("id", existingBooking.campsite_id)
      .single()

    if (campsite) {
      // สร้างการแจ้งเตือนสำหรับเจ้าของสถานที่
      await createNotification({
        user_id: campsite.owner_id,
        title: "การจองถูกยกเลิก",
        message: `การจอง ${campsite.name} ถูกยกเลิกโดยผู้จอง`,
        type: "booking_cancelled",
        reference_id: bookingId,
        is_read: false,
      })
    }

    // Revalidate paths
    revalidatePath("/profile/bookings")
    revalidatePath(`/campsite/${existingBooking.campsite_id}`)

    return { success: true }
  } catch (error) {
    console.error("Error in cancelBooking:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลการจองของผู้ใช้
 * @returns {Object} ผลลัพธ์การ���ำเนินการ
 */
export async function getUserBookings() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดูประวัติการจอง" }
    }

    // ดึงข้อมูลการจองพร้อมข้อมูลสถานที่แคมป์
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        campsite:campsites(id, name, location, province)
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching bookings:", error)
      return { success: false, error: error.message }
    }

    return { success: true, bookings }
  } catch (error) {
    console.error("Error in getUserBookings:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลการจองของสถานที่แคมป์
 * @param {string} campsiteId - ID ของสถานที่แคมป์
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function getCampsiteBookings(campsiteId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดูข้อมูลการจอง" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
    const { data: campsite, error: checkError } = await supabase
      .from("campsites")
      .select("owner_id")
      .eq("id", campsiteId)
      .single()

    if (checkError) {
      return { success: false, error: checkError.message }
    }

    if (campsite.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ดูข้อมูลการจองของสถานที่แคมป์นี้" }
    }

    // ดึงข้อมูลการจองพร้อมข้อมูลผู้จอง
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(id, username, full_name, avatar_url, phone)
      `)
      .eq("campsite_id", campsiteId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campsite bookings:", error)
      return { success: false, error: error.message }
    }

    return { success: true, bookings }
  } catch (error) {
    console.error("Error in getCampsiteBookings:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลการจองทั้งหมดของเจ้าของสถานที่แคมป์
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function getOwnerBookings() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดูข้อมูลการจอง" }
    }

    // ดึงข้อมูลสถานที่แคมป์ของผู้ใช้
    const { data: campsites, error: campsitesError } = await supabase
      .from("campsites")
      .select("id")
      .eq("owner_id", session.user.id)

    if (campsitesError) {
      console.error("Error fetching campsites:", campsitesError)
      return { success: false, error: campsitesError.message }
    }

    if (!campsites || campsites.length === 0) {
      return { success: true, bookings: [] }
    }

    // สร้างรายการ ID ของสถานที่แคมป์
    const campsiteIds = campsites.map((campsite) => campsite.id)

    // ดึงข้อมูลการจองพร้อมข้อมูลผู้จองและสถานที่แคมป์
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        *,
        user:profiles!bookings_user_id_fkey(id, username, full_name, avatar_url, phone),
        campsite:campsites(id, name, location, province)
      `)
      .in("campsite_id", campsiteIds)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching owner bookings:", error)
      return { success: false, error: error.message }
    }

    return { success: true, bookings }
  } catch (error) {
    console.error("Error in getOwnerBookings:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปเดตสถานะการจอง
 * @param {string} bookingId - ID ของการจอง
 * @param {string} status - สถานะใหม่ (confirmed, cancelled, completed)
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
// export async function updateBookingStatus(bookingId, status) {
//   try {
//     const cookieStore = cookies()
//     const supabase = createClient(cookieStore)

//     // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
//     const {
//       data: { session },
//     } = await supabase.auth.getSession()

//     if (!session) {
//       return { success: false, error: "กรุณาเข้าสู่ระบบก่อนอัปเดตสถานะการจอง" }
//     }

//     // ดึงข้อมูลการจอง
//     const { data: booking, error: bookingError } = await supabase
//       .from("bookings")
//       .select("campsite_id, user_id")
//       .eq("id", bookingId)
//       .single()

//     if (bookingError) {
//       return { success: false, error: bookingError.message }
//     }

//     // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
//     const { data: campsite, error: campsiteError } = await supabase
//       .from("campsites")
//       .select("owner_id, name")
//       .eq("id", booking.campsite_id)
//       .single()

//     if (campsiteError) {
//       return { success: false, error: campsiteError.message }
//     }

//     if (campsite.owner_id !== session.user.id) {
//       return { success: false, error: "คุณไม่มีสิทธิ์อัปเดตสถานะการจองนี้" }
//     }

//     // อัปเดตสถานะการจอง
//     const { error: updateError } = await supabase.from("bookings").update({ status }).eq("id", bookingId)

//     if (updateError) {
//       return { success: false, error: updateError.message }
//     }

//     // สร้างการแจ้งเตือนสำหรับผู้จอง
//     let notificationTitle = ""
//     let notificationMessage = ""

//     if (status === "confirmed") {
//       notificationTitle = "การจองได้รับการยืนยัน"
//       notificationMessage = `การจอง ${campsite.name} ของคุณได้รับการยืนยันแล้ว`
//     } else if (status === "cancelled") {
//       notificationTitle = "การจองถูกยกเลิก"
//       notificationMessage = `การจอง ${campsite.name} ของคุณถูกยกเลิกโดยเจ้าของสถานที่`
//     } else if (status === "completed") {
//       notificationTitle = "การจองเสร็จสิ้น"
//       notificationMessage = `การจอง ${campsite.name} ของคุณเสร็จสิ้นแล้ว ขอบคุณที่ใช้บริการ`
//     }

//     await createNotification({
//       user_id: booking.user_id,
//       title: notificationTitle,
//       message: notificationMessage,
//       type: "booking_status",
//       reference_id: bookingId,
//       is_read: false,
//     })

//     // Revalidate paths
//     revalidatePath("/profile/bookings")
//     revalidatePath(`/campsite/${booking.campsite_id}`)
//     revalidatePath("/admin/campsite")
//     revalidatePath(`/admin/booking/${bookingId}`)

//     return { success: true }
//   } catch (error) {
//     console.error("Error in updateBookingStatus:", error)
//     return { success: false, error: error.message }
//   }
// }

/**
 * ตรวจสอบความพร้อมของโซน
 * @param {Object} checkData - ข้อมูลที่ใช้ในการตรวจสอบ
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function checkZoneAvailability(checkData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่ามีการจองในช่วงวันที่เลือกหรือไม่
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("*")
      .eq("campsite_id", checkData.campsite_id)
      .or(`check_in_date.lte.${checkData.check_out_date},check_out_date.gte.${checkData.check_in_date}`)
      .neq("status", "cancelled") // ไม่รวมการจองที่ถูกยกเลิกแล้ว

    if (checkError) {
      console.error("Error checking bookings:", checkError)
      return { success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบการจอง" }
    }

    // ตรวจสอบว่ามีการจองโซนนี้ในช่วงวันที่เลือกหรือไม่
    // แก้ไขการตรวจสอบให้เจาะจงกับโซนที่เลือกเท่านั้น
    const zoneBookings = existingBookings.filter((booking) => {
      // ดึงข้อมูลโซนจาก notes
      const zoneInfo = booking.notes || ""
      const zoneName = zoneInfo.match(/โซนที่จอง: (.+)/)
      const zoneNameValue = zoneName ? zoneName[1] : ""

      // เปรียบเทียบชื่อโซนที่จองกับโซนที่ต้องการตรวจสอบ
      return zoneNameValue === checkData.zone_name
    })

    if (zoneBookings.length > 0) {
      return {
        success: true,
        available: false,
        message: `โซน ${checkData.zone_name} ถูกจองในช่วงวันที่คุณเลือกแล้ว กรุณาเลือกโซนอื่นหรือวันที่อื่น`,
        conflictBookings: zoneBookings,
      }
    }

    return {
      success: true,
      available: true,
      message: `โซน ${checkData.zone_name} ว่างในช่วงวันที่คุณเลือก สามารถจองได้`,
    }
  } catch (error) {
    console.error("Error in checkZoneAvailability:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลการจองตาม ID
 * @param {string} bookingId - ID ของการจอง
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function getBookingById(bookingId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนดูข้อมูลการจอง" }
    }

    // ดึงข้อมูลการจอง
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        campsite:campsites(*),
        user:profiles!bookings_user_id_fkey(id, username, full_name, avatar_url, phone, email)
      `)
      .eq("id", bookingId)
      .single()

    if (bookingError) {
      return { success: false, error: bookingError.message }
    }

    // ตรวจสอบสิทธิ์การเข้าถึง (ต้องเป็นผู้จองหรือเจ้าของสถานที่แคมป์)
    if (booking.user_id !== session.user.id && booking.campsite.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ดูข้อมูลการจองนี้" }
    }

    return { success: true, booking }
  } catch (error) {
    console.error("Error in getBookingById:", error)
    return { success: false, error: error.message }
  }
}

// เพิ่มฟังก์ชันสำหรับสร้างการแจ้งเตือนเมื่อมีการจองใหม่
export async function createBookingWithNotification(bookingData, campsiteData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // สร้างการจอง
    const { data: booking, error } = await supabase.from("bookings").insert(bookingData).select().single()

    if (error) {
      console.error("Error creating booking:", error)
      return { success: false, error: error.message }
    }

    // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์
    await createNotification({
      user_id: campsiteData.owner_id,
      title: "มีการจองใหม่",
      message: `มีผู้จอง ${campsiteData.name} ในวันที่ ${new Date(bookingData.check_in_date).toLocaleDateString("th-TH")} กรุณาตรวจสอบและอนุมัติ`,
      type: "booking_request",
      reference_id: booking.id,
      is_read: false,
    })

    return { success: true, booking }
  } catch (error) {
    console.error("Error in createBookingWithNotification:", error)
    return { success: false, error: error.message }
  }
}

// เพิ่มฟังก์ชันสำหรับอัปเดตสถานะการจอง
export async function updateBookingStatus(bookingId, status, userId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // อัปเดตสถานะการจอง
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId)

    if (error) {
      console.error("Error updating booking status:", error)
      return { success: false, error: error.message }
    }

    // ดึงข้อมูลการจองและแคมป์
    const { data: booking } = await supabase
      .from("bookings")
      .select(`
        *,
        campsites:campsites(name, owner_id)
      `)
      .eq("id", bookingId)
      .single()

    if (booking) {
      // สร้างการแจ้งเตือนสำหรับผู้จอง
      const notificationType = status === "approved" ? "booking_approved" : "booking_rejected"
      const notificationTitle = status === "approved" ? "การจองได้รับการอนุมัติ" : "การจองถูกปฏิเสธ"
      const notificationMessage =
        status === "approved"
          ? `การจอง ${booking.campsites.name} ของคุณได้รับการอนุมัติแล้ว`
          : `การจอง ${booking.campsites.name} ของคุณถูกปฏิเสธ`

      await createNotification({
        user_id: booking.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        reference_id: bookingId,
        is_read: false,
      })
    }

    // Revalidate paths
    revalidatePath("/profile/bookings")
    revalidatePath(`/campsite/${booking.campsites.id}`)
    revalidatePath("/admin/campsite")
    revalidatePath(`/admin/booking/${bookingId}`)

    return { success: true }
  } catch (error) {
    console.error("Error in updateBookingStatus:", error)
    return { success: false, error: error.message }
  }
}
