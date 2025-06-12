import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { createBookingNotification } from "@/lib/supabase/notification-actions"

/**
 * ตรวจสอบความพร้อมใช้งานของโซนในช่วงวันที่กำหนด
 * @param {string} campsiteId - รหัสสถานที่แคมป์
 * @param {string} zoneId - รหัสโซน
 * @param {string} checkInDate - วันที่เช็คอิน
 * @param {string} checkOutDate - วันที่เช็คเอาท์
 * @returns {Object} ผลลัพธ์การตรวจสอบ
 */
export async function checkZoneAvailability(campsiteId, zoneName, checkInDate, checkOutDate) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่ามีการจองในช่วงวันที่เลือกหรือไม่
    const { data: existingBookings, error: checkError } = await supabase
      .from("bookings")
      .select("*")
      .eq("campsite_id", campsiteId)
      .or(`check_in_date.lte.${checkOutDate},check_out_date.gte.${checkInDate}`)
      .neq("status", "cancelled") // ไม่รวมการจองที่ถูกยกเลิกแล้ว

    if (checkError) {
      console.error("Error checking bookings:", checkError)
      return { available: false, error: "เกิดข้อผิดพลาดในการตรวจสอบการจอง" }
    }

    // ตรวจสอบว่ามีการจองโซนนี้ในช่วงวันที่เลือกหรือไม่
    const zoneBookings = existingBookings.filter((booking) => {
      // ดึงข้อมูลโซนจาก notes
      const bookingZoneInfo = booking.notes || ""
      const bookingZoneName = bookingZoneInfo.match(/โซนที่จอง: (.+)/)
      const bookingZoneNameValue = bookingZoneName ? bookingZoneName[1] : ""

      // เปรียบเทียบชื่อโซนที่จองกับโซนที่ต้องการจอง
      return bookingZoneNameValue === zoneName
    })

    if (zoneBookings.length > 0) {
      return {
        available: false,
        error: `โซน ${zoneName} ถูกจองในช่วงวันที่คุณเลือกแล้ว กรุณาเลือกโซนอื่นหรือวันที่อื่น`,
        conflictBookings: zoneBookings,
      }
    }

    return { available: true }
  } catch (error) {
    console.error("Error in checkZoneAvailability:", error)
    return { available: false, error: error.message }
  }
}

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
    // แก้ไขการตรวจสอบให้เจาะจงกับโซนที่เลือกเท่านั้น
    const zoneBookings = existingBookings.filter((booking) => {
      // ดึงข้อมูลโซนจาก notes
      const bookingZoneInfo = booking.notes || ""
      const bookingZoneName = bookingZoneInfo.match(/โซนที่จอง: (.+)/)
      const bookingZoneNameValue = bookingZoneName ? bookingZoneName[1] : ""

      // เปรียบเทียบชื่อโซนที่จองกับโซนที่ต้องการจอง
      return bookingZoneNameValue === zoneNameValue
    })

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

    // สร้างการแจ้งเตือนสำหรับการจองใหม่
    await createBookingNotification(booking, session.user)

    // Revalidate paths
    revalidatePath("/profile/bookings")
    revalidatePath(`/campsite/${bookingData.campsite_id}`)

    return { success: true, booking }
  } catch (error) {
    console.error("Error in createBooking:", error)
    return { success: false, error: error.message }
  }
}

// Re-export functions from utils/supabase/actions.js from "@/utils/supabase/actions"
