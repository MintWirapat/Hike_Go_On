"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

// ฟังก์ชันตรวจสอบความพร้อมของโซน
export async function checkZoneAvailability(campsiteId, zoneName, checkInDate, checkOutDate) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ดึงข้อมูลการจองที่มีอยู่แล้วสำหรับโซนนี้
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("check_in_date, check_out_date, notes, status")
      .eq("campsite_id", campsiteId)
      .neq("status", "cancelled") // ไม่รวมการจองที่ถูกยกเลิกแล้ว

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError)
      return { available: false, error: "เกิดข้อผิดพลาดในการตรวจสอบข้อมูลการจอง" }
    }

    // กรองเฉพาะการจองที่เกี่ยวข้องกับโซนที่ต้องการ
    const zoneBookings = bookings.filter((booking) => {
      const notes = booking.notes || ""
      return notes.includes(`โซนที่จอง: ${zoneName}`)
    })

    // แปลงวันที่เป็น Date objects
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)

    // ตรวจสอบว่ามีการจองที่ทับซ้อนกันหรือไม่
    for (const booking of zoneBookings) {
      const bookingCheckIn = new Date(booking.check_in_date)
      const bookingCheckOut = new Date(booking.check_out_date)

      // แก้ไขเงื่อนไขการตรวจสอบการทับซ้อน
      // วันที่เช็คอินใหม่ต้องไม่อยู่ในช่วงการจองที่มีอยู่แล้ว (ยกเว้นวันที่เช็คเอาท์ของการจองที่มีอยู่)
      // และวันที่เช็คเอาท์ใหม่ต้องไม่อยู่ในช่วงการจองที่มีอยู่แล้ว (ยกเว้นวันที่เช็คอินของการจองที่มีอยู่)

      // ตรวจสอบว่าวันที่เช็คอินใหม่ไม่ตรงกับวันที่เช็คอินเดิม
      // และวันที่เช็คอินใหม่ไม่อยู่ระหว่างวันที่เช็คอินเดิมและวันก่อนวันที่เช็คเอาท์เดิม
      const checkInConflict = checkIn >= bookingCheckIn && checkIn < bookingCheckOut

      // ตรวจสอบว่าวันที่เช็คเอาท์ใหม่ไม่ตรงกับวันที่เช็คเอาท์เดิม
      // และวันก่อนวันที่เช็คเอาท์ใหม่ไม่อยู่ระหว่างวันที่เช็คอินเดิมและวันก่อนวันที่เช็คเอาท์เดิม
      const checkOutConflict = checkOut > bookingCheckIn && checkOut <= bookingCheckOut

      // ตรวจสอบว่าการจองใหม่ครอบคลุมการจองเดิมหรือไม่
      const surroundConflict = checkIn <= bookingCheckIn && checkOut >= bookingCheckOut

      if (checkInConflict || checkOutConflict || surroundConflict) {
        return {
          available: false,
          error: `โซน ${zoneName} ไม่ว่างในช่วงวันที่คุณเลือก เนื่องจากมีการจองในวันที่ ${new Date(booking.check_in_date).toLocaleDateString("th-TH")} ถึง ${new Date(booking.check_out_date).toLocaleDateString("th-TH")}`,
        }
      }
    }

    return { available: true }
  } catch (error) {
    console.error("Error checking zone availability:", error)
    return { available: false, error: "เกิดข้อผิดพลาดในการตรวจสอบความพร้อมของโซน" }
  }
}

// ฟังก์ชันสร้างการจอง
export async function createBooking(bookingData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบความพร้อมของโซนอีกครั้งก่อนสร้างการจอง
    const zoneInfo = bookingData.notes || ""
    const zoneName = zoneInfo.match(/โซนที่จอง: (.+)/)
    const zoneNameValue = zoneName ? zoneName[1] : ""

    if (zoneNameValue) {
      const availabilityCheck = await checkZoneAvailability(
        bookingData.campsite_id,
        zoneNameValue,
        bookingData.check_in_date,
        bookingData.check_out_date,
      )

      if (!availabilityCheck.available) {
        return { success: false, error: availabilityCheck.error }
      }
    }

    // สร้างการจอง
    const { data: booking, error } = await supabase.from("bookings").insert(bookingData).select().single()

    if (error) {
      console.error("Error creating booking:", error)
      return { success: false, error: `เกิดข้อผิดพลาดในการสร้างการจอง: ${error.message}` }
    }

    // ส่งการแจ้งเตือนให้เจ้าของแคมป์
    try {
      // ดึงข้อมูลเจ้าของแคมป์
      const { data: campsite } = await supabase
        .from("campsites")
        .select("user_id, name")
        .eq("id", bookingData.campsite_id)
        .single()

      if (campsite) {
        // สร้างการแจ้งเตือน
        await supabase.from("notifications").insert({
          user_id: campsite.user_id,
          type: "new_booking",
          message: `มีการจองใหม่สำหรับ ${campsite.name}`,
          data: JSON.stringify({
            booking_id: booking.id,
            campsite_id: bookingData.campsite_id,
            campsite_name: campsite.name,
          }),
          read: false,
        })
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError)
      // ไม่ต้องส่งข้อผิดพลาดกลับ เพราะการจองสำเร็จแล้ว
    }

    revalidatePath(`/profile/booking/${booking.id}`)
    revalidatePath(`/profile`)
    revalidatePath(`/admin/booking/${booking.id}`)
    revalidatePath(`/admin/campsite`)

    return { success: true, booking }
  } catch (error) {
    console.error("Error in createBooking:", error)
    return { success: false, error: `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}` }
  }
}

// ฟังก์ชันอื่นๆ ที่เกี่ยวข้องกับการจอง...
