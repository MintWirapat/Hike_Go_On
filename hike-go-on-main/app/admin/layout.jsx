import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/server"
import { Tent, CalendarDays, CreditCard, Package2 } from "lucide-react"

export default async function AdminLayout({ children }) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect=/admin")
  }

  // ตรวจสอบว่าผู้ใช้เป็นเจ้าของแคมป์หรือไม่
  const { data: campsites, error } = await supabase
    .from("campsites")
    .select("id")
    .eq("owner_id", session.user.id)
    .limit(1)

  if (error || !campsites || campsites.length === 0) {
    redirect("/profile")
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r hidden md:block">
        <div className="p-4">
          <h2 className="text-xl font-bold">จัดการแคมป์</h2>
          <p className="text-sm text-gray-500">ยินดีต้อนรับ, {session.user.email}</p>
        </div>
        <nav className="mt-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/admin/campsite"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <Tent className="w-5 h-5 mr-3" />
                จัดการแคมป์
              </Link>
            </li>
            <li>
              <Link
                href="/admin/equipment"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <Package2 className="w-5 h-5 mr-3" />
                จัดการอุปกรณ์
              </Link>
            </li>
            <li>
              <Link
                href="/admin/booking"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <CalendarDays className="w-5 h-5 mr-3" />
                รายการจอง
              </Link>
            </li>
            <li>
              <Link
                href="/admin/finance"
                className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <CreditCard className="w-5 h-5 mr-3" />
                การเงิน
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-gray-50">{children}</div>
    </div>
  )
}
