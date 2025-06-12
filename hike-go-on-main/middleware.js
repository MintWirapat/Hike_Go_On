import { NextResponse } from "next/server"

export async function middleware(request) {
  const url = request.nextUrl.clone()
  const { pathname, search, hash } = url

  // ตรวจสอบว่ามี error parameters หรือไม่
  if (pathname === "/" && (search.includes("error=") || hash.includes("error="))) {
    // ถ้ามี error parameters ให้ redirect ไปยังหน้า verify-email
    return NextResponse.redirect(new URL("/verify-email", url.origin))
  }

  // ตรวจสอบว่าเป็น URL ของหน้า campsite หรือไม่
  if (pathname.startsWith("/campsite/") && !pathname.includes("/edit/") && !pathname.includes("/booking/")) {
    // ตรวจสอบ��่า URL เป็น UUID หรือไม่
    const campsiteId = pathname.split("/").pop()

    // ถ้าเป็น UUID ให้ redirect ไปยัง URL ที่มี slug
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campsiteId)) {
      try {
        // แทนที่จะเรียก API โดยตรง ให้ redirect ไปยังหน้าที่มี UUID เดิมก่อน
        // แล้วค่อยจัดการ slug ในหน้า page.jsx
        return NextResponse.next()
      } catch (error) {
        console.error("Error in middleware:", error)
        return NextResponse.next()
      }
    }
  }

  return NextResponse.next()
}

// ระบุ path ที่ middleware นี้จะทำงาน
export const config = {
  matcher: [
    "/", // เพิ่ม path "/" เพื่อให้ middleware ทำงานกับหน้าหลัก
    "/campsite/:path*",
  ],
}
