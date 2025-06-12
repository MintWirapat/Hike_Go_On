"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/supabase-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatThaiDate } from "@/lib/utils/date-utils"
import { formatCurrency } from "@/lib/utils/format-utils"
import { Check, X, Clock, AlertCircle } from "lucide-react"

export default function AdminBookingPage() {
  const { supabase, user } = useSupabase()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [myCampsites, setMyCampsites] = useState([])
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState("pending")

  // ตรวจสอบการเข้าสู่ระบบ
  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/admin/booking")
    } else {
      fetchMyCampsites()
    }
  }, [user, router])

  // ดึงข้อมูลแคมป์ของผู้ใช้
  const fetchMyCampsites = async () => {
    setIsLoading(true)
    try {
      const { data: campsites, error } = await supabase.from("campsites").select("*").eq("owner_id", user.id)

      if (error) throw error

      setMyCampsites(campsites)

      if (campsites.length > 0) {
        fetchBookings(campsites.map((camp) => camp.id))
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error fetching campsites:", error)
      setIsLoading(false)
    }
  }

  // ดึงข้อมูลการจองของแคมป์
  const fetchBookings = async (campsiteIds) => {
    try {
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select(`
          *,
          campsites:campsite_id(name),
          profiles:user_id(username, full_name, avatar_url)
        `)
        .in("campsite_id", campsiteIds)
        .order("created_at", { ascending: false })

      if (error) throw error

      setBookings(bookingData)
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // อัปเดตสถานะการจอง
  const updateBookingStatus = async (bookingId, status) => {
    try {
      // แปลงค่าสถานะให้ตรงกับข้อจำกัดในฐานข้อมูล
      let dbStatus = status
      if (status === "approved") dbStatus = "confirmed"
      if (status === "rejected") dbStatus = "cancelled"

      const { error } = await supabase.from("bookings").update({ status: dbStatus }).eq("id", bookingId)

      if (error) throw error

      // อัปเดตข้อมูลการจองในหน้า (ยังคงใช้ค่า status เดิมสำหรับการแสดงผล)
      setBookings((prevBookings) =>
        prevBookings.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
      )

      // สร้างการแจ้งเตือนสำหรับผู้จอง
      const booking = bookings.find((b) => b.id === bookingId)
      if (booking) {
        const notificationType = status === "approved" ? "booking_approved" : "booking_rejected"
        const notificationTitle = status === "approved" ? "การจองได้รับการอนุมัติ" : "การจองถูกปฏิเสธ"
        const notificationMessage =
          status === "approved"
            ? `การจอง ${booking.campsites.name} ของคุณได้รับการอนุมัติแล้ว`
            : `การจอง ${booking.campsites.name} ของคุณถูกปฏิเสธ`

        await supabase.from("notifications").insert({
          user_id: booking.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          reference_id: bookingId,
          is_read: false,
        })
      }
    } catch (error) {
      console.error("Error updating booking status:", error)
    }
  }

  // กรองการจองตามสถานะ
  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === "pending") return booking.status === "pending"
    if (activeTab === "approved") return booking.status === "approved" || booking.status === "confirmed"
    if (activeTab === "rejected") return booking.status === "rejected" || booking.status === "cancelled"
    return true
  })

  // แสดงสถานะการจอง
  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center text-yellow-500">
            <Clock className="h-4 w-4 mr-1" /> รอการอนุมัติ
          </span>
        )
      case "approved":
      case "confirmed":
        return (
          <span className="flex items-center text-green-500">
            <Check className="h-4 w-4 mr-1" /> อนุมัติแล้ว
          </span>
        )
      case "rejected":
      case "cancelled":
        return (
          <span className="flex items-center text-red-500">
            <X className="h-4 w-4 mr-1" /> ปฏิเสธแล้ว
          </span>
        )
      default:
        return (
          <span className="flex items-center text-gray-500">
            <AlertCircle className="h-4 w-4 mr-1" /> ไม่ทราบสถานะ
          </span>
        )
    }
  }

  // Add this function to render payment status
  const renderPaymentStatus = (status) => {
    switch (status) {
      case "paid":
      case "verified":
        return (
          <span className="flex items-center text-green-500">
            <Check className="h-4 w-4 mr-1" /> ชำระแล้ว
          </span>
        )
      case "pending":
        return (
          <span className="flex items-center text-yellow-500">
            <Clock className="h-4 w-4 mr-1" /> รอตรวจสอบ
          </span>
        )
      case "rejected":
        return (
          <span className="flex items-center text-red-500">
            <X className="h-4 w-4 mr-1" /> ปฏิเสธ
          </span>
        )
      case "unpaid":
      default:
        return (
          <span className="flex items-center text-gray-500">
            <AlertCircle className="h-4 w-4 mr-1" /> ยังไม่ชำระ
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">รายการจอง</h1>

      {myCampsites.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">คุณยังไม่มีแคมป์</h2>
          <p className="text-gray-600 mb-4">เพิ่มแคมป์ของคุณเพื่อเริ่มรับการจอง</p>
          <Link
            href="/post"
            className="inline-block bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
          >
            เพิ่มแคมป์ใหม่
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">การจองทั้งหมด</h2>
            <p className="text-gray-600 mt-1">จัดการการจองสำหรับแคมป์ของคุณ</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="pending">รอการอนุมัติ</TabsTrigger>
                <TabsTrigger value="approved">อนุมัติแล้ว</TabsTrigger>
                <TabsTrigger value="rejected">ปฏิเสธแล้ว</TabsTrigger>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="p-0">
              {filteredBookings.length === 0 ? (
                <div className="p-6 text-center text-gray-500">ไม่พบการจองในสถานะนี้</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ผู้จอง
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          แคมป์
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วันที่เข้าพัก
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จำนวนคืน
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ราคารวม
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          การชำระเงิน
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          สถานะ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          การจัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 mr-3 overflow-hidden">
                                {booking.profiles?.avatar_url ? (
                                  <img
                                    src={booking.profiles.avatar_url || "/placeholder.svg"}
                                    alt={booking.profiles.username}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  booking.profiles?.username?.charAt(0).toUpperCase() || "U"
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {booking.profiles?.full_name || booking.profiles?.username || "ไม่ระบุชื่อ"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.campsites?.name || "ไม่ระบุชื่อแคมป์"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatThaiDate(booking.check_in_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.nights} คืน</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatCurrency(booking.total_price)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{renderPaymentStatus(booking.payment_status)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{renderStatus(booking.status)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <Link href={`/admin/booking/${booking.id}`} className="text-blue-600 hover:text-blue-800">
                                ดูรายละเอียด
                              </Link>

                              {booking.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, "approved")}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    อนุมัติ
                                  </button>
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, "rejected")}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
