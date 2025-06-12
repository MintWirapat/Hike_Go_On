import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    await supabase.auth.exchangeCodeForSession(code)

    // หลังจากแลกเปลี่ยน code เป็น session แล้ว ให้ redirect ไปยังหน้า verify-email
    return NextResponse.redirect(new URL("/verify-email", requestUrl.origin))
  }

  // ถ้าไม่มี code ให้ redirect ไปยังหน้า verify-email แทนที่จะไปหน้าหลัก
  // เพื่อให้ผู้ใช้เห็นหน้า verify-email เสมอ
  return NextResponse.redirect(new URL("/verify-email", request.nextUrl.origin))
}

export const dynamic = "force-dynamic"
