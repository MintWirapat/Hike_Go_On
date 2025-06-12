import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const requestData = await request.json()
    const { id, username, fullName, phone, avatarUrl } = requestData

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!id) {
      return NextResponse.json({ error: "ไม่พบข้อมูล ID ผู้ใช้" }, { status: 400 })
    }

    // สร้าง Supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนอัพเดทข้อมูล" }, { status: 401 })
    }

    // ตรวจสอบว่า ID ที่ส่งมาตรงกับ ID ของผู้ใช้ที่เข้าสู่ระบบหรือไม่
    if (id !== session.user.id) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ในการอัพเดทข้อมูลของผู้ใช้อื่น" }, { status: 403 })
    }

    // อัพเดทข้อมูลผู้ใช้
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: id,
          username: username,
          full_name: fullName,
          phone: phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัพเดทข้อมูล" }, { status: 500 })
  }
}
