import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    // สร้าง Supabase client
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนอัพโหลดรูปภาพ" }, { status: 401 })
    }

    // รับข้อมูลจาก FormData
    const formData = await request.formData()
    const file = formData.get("file")
    const fileName = formData.get("fileName") || `${session.user.id}-${Date.now()}.${file.name.split(".").pop()}`

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่อัพโหลด" }, { status: 400 })
    }

    // แปลง File เป็น ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // ใช้ client ปกติเนื่องจากเราได้ตั้งค่า RLS policies เรียบร้อยแล้ว
    // อัพโหลดไฟล์ไปยัง bucket 'avatars'
    const { data, error } = await supabase.storage.from("avatars").upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      console.error("Storage upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // สร้าง URL สำหรับรูปที่อัพโหลด
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ" }, { status: 500 })
  }
}
