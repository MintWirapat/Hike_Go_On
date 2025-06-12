import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 })
    }

    // รับข้อมูลจาก request body
    const { bookingId, amount } = await request.json()

    if (!bookingId) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจอง" }, { status: 400 })
    }

    // ตรวจสอบว่าเป็นเจ้าของการจองหรือไม่
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("user_id, total_price")
      .eq("id", bookingId)
      .single()

    if (bookingError) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจอง" }, { status: 404 })
    }

    if (booking.user_id !== session.user.id) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขการจองนี้" }, { status: 403 })
    }

    // อัปเดตวิธีการชำระเงิน
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_method: "cash",
        payment_status: "pending",
      })
      .eq("id", bookingId)

    if (updateError) {
      console.error("Error updating booking:", updateError)
      return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูลการจอง" }, { status: 500 })
    }

    // สร้างรายการชำระเงิน
    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: booking.total_price,
      payment_method: "cash",
      payment_status: "pending",
      notes: "ชำระเงินที่แคมป์",
    })

    if (paymentError) {
      console.error("Error creating payment:", paymentError)
      return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน" }, { status: 500 })
    }

    // รีเฟรชข้อมูลทั้งในหน้าผู้ใช้และหน้าแอดมิน
    revalidatePath(`/profile/booking/${bookingId}`)

    // ดึงข้อมูลแคมป์เพื่อหา owner_id
    const { data: campData, error: campError } = await supabase
      .from("bookings")
      .select("campsite_id")
      .eq("id", bookingId)
      .single()

    if (!campError && campData) {
      const { data: campsiteData } = await supabase
        .from("campsites")
        .select("owner_id")
        .eq("id", campData.campsite_id)
        .single()

      if (campsiteData) {
        // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์
        await supabase.from("notifications").insert({
          user_id: campsiteData.owner_id,
          title: "มีการเลือกวิธีชำระเงิน",
          message: `มีการเลือกชำระเงินที่แคมป์สำหรับการจอง #${bookingId}`,
          type: "payment_method_selected",
          reference_id: bookingId,
          is_read: false,
        })

        // รีเฟรชข้อมูลในหน้าแอดมิน
        revalidatePath(`/admin/booking/${bookingId}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in set-cash-payment:", error)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่ไม่คาดคิด" }, { status: 500 })
  }
}
