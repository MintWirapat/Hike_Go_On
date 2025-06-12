"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSupabase } from "@/lib/supabase/supabase-provider"
import { formatThaiDate } from "@/lib/utils/date-utils"
import { formatCurrency } from "@/lib/utils/format-utils"
import { Check, X, Clock, MapPin, Calendar, Users, CreditCard, MessageSquare, RefreshCw } from "lucide-react"
import PaymentInfo from "@/components/payment/payment-info"
import PaymentVerification from "@/components/payment/payment-verification"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function AdminBookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payment, setPayment] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const bookingId = params.id

  // แก้ไขฟังก์ชัน fetchPaymentData เพื่อแก้ปัญหาการดึงข้อมูลเมื่อไม่มีข้อมูลการชำระเงิน
  const fetchPaymentData = async () => {
    try {
      setIsRefreshing(true)
      // ดึงข้อมูลการชำระเงินโดยตรงจาก Supabase โดยไม่ใช้ .single()
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Error fetching payment data:", error)
        setPayment(null)
        return
      }

      // ตรวจสอบว่ามีข้อมูลหรือไม่
      if (!data || data.length === 0) {
        console.log("No payment data found for booking:", bookingId)
        setPayment(null)
        return
      }

      // ถ้ามีข้อมูล ใช้ข้อมูลแรก
      const paymentData = data[0]
      console.log("Payment data fetched:", paymentData)

      // ถ้ามี verified_by ให้ดึงข้อมูลผู้ยืนยันแยกต่างหาก
      if (paymentData.verified_by) {
        const { data: verifierData, error: verifierError } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", paymentData.verified_by)
          .single()

        if (!verifierError && verifierData) {
          paymentData.verified_by_user = verifierData
        }
      }

      setPayment(paymentData)
    } catch (error) {
      console.error("Error in fetchPaymentData:", error)
      setPayment(null)
    } finally {
      setIsRefreshing(false)
    }
  }

  // ดึงข้อมูลการจอง
  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/admin/booking/" + params.id)
      return
    }

    const fetchBookingDetails = async () => {
      setIsLoading(true)
      try {
        // ดึงข้อมูลการจอง
        const { data: bookingData, error: bookingError } = await supabase
          .from("bookings")
          .select(`
            *,
            campsites:campsite_id(*),
            profiles:user_id(id, username, full_name, avatar_url, phone)
          `)
          .eq("id", params.id)
          .single()

        if (bookingError) throw bookingError

        // ตรวจสอบว่าผู้ใช้เป็นเจ้าของแคมป์หรือไม่
        if (bookingData.campsites.owner_id !== user.id) {
          setError("คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้")
          setIsLoading(false)
          return
        }

        setBooking(bookingData)

        // ดึงข้อมูลการชำระเงินทันทีหลังจากได้ข้อมูลการจอง
        await fetchPaymentData()
      } catch (error) {
        console.error("Error fetching booking details:", error)
        setError("ไม่สามารถดึงข้อมูลการจองได้")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookingDetails()
  }, [params.id, supabase, user, router])

  // แก้ไขฟังก์ชัน updateBookingStatus เพื่อใช้ค่าสถานะที่ถูกต้องตามข้อจำกัดของฐานข้อมูล
  // เปลี่ยนจาก "approved" เป็น "confirmed" และ "rejected" เป็น "cancelled"

  // แก้ไขฟังก์ชัน updateBookingStatus
  const updateBookingStatus = async (status) => {
    try {
      // แปลงค่าสถานะให้ตรงกับข้อจำกัดของฐานข้อมูล
      let dbStatus = status
      if (status === "approved") dbStatus = "confirmed"
      if (status === "rejected") dbStatus = "cancelled"

      const { error } = await supabase.from("bookings").update({ status: dbStatus }).eq("id", params.id)

      if (error) throw error

      // อัปเดตข้อมูลการจองในหน้า
      setBooking((prev) => ({ ...prev, status: dbStatus }))

      // สร้างการแจ้งเตือนสำหรับผู้จอง
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
        reference_id: params.id,
        is_read: false,
      })

      toast({
        title: status === "approved" ? "อนุมัติการจองสำเร็จ" : "ปฏิเสธการจองสำเร็จ",
      })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะการจองได้",
        variant: "destructive",
      })
    }
  }

  // แก้ไขฟังก์ชัน renderStatus เพื่อให้แสดงสถานะได้ถูกต้อง
  const renderStatus = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="flex items-center text-yellow-500">
            <Clock className="h-5 w-5 mr-2" /> รอการอนุมัติ
          </span>
        )
      case "confirmed": // เปลี่ยนจาก approved เป็น confirmed
        return (
          <span className="flex items-center text-green-500">
            <Check className="h-5 w-5 mr-2" /> อนุมัติแล้ว
          </span>
        )
      case "cancelled": // เปลี่ยนจาก rejected เป็น cancelled
        return (
          <span className="flex items-center text-red-500">
            <X className="h-5 w-5 mr-2" /> ถูกปฏิเสธ
          </span>
        )
      default:
        return <span className="text-gray-500">ไม่ทราบสถานะ</span>
    }
  }

  // ดึงข้อมูลโซนจากหมายเหตุ
  const extractZoneInfo = (notes) => {
    if (!notes) return null

    const zoneMatch = notes.match(/โซน\s*:\s*([^\n]+)/i)
    return zoneMatch ? zoneMatch[1].trim() : null
  }

  const handleRefresh = async () => {
    await fetchPaymentData()
    toast({
      title: "รีเฟรชข้อมูลสำเร็จ",
      description: "ข้อมูลการชำระเงินได้รับการอัปเดตแล้ว",
    })
  }

  // ตรวจสอบว่ามีการอัปโหลดสลิปหรือไม่
  const hasUploadedSlip = payment && payment.payment_method === "bank_transfer" && payment.slip_image_url

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <Link href="/admin/campsite" className="text-green-600 hover:underline">
            &larr; กลับไปยังหน้าจัดการแคมป์
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          <p>ไม่พบข้อมูลการจอง</p>
        </div>
        <div className="mt-4">
          <Link href="/admin/campsite" className="text-green-600 hover:underline">
            &larr; กลับไปยังหน้าจัดการแคมป์
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/campsite" className="text-green-600 hover:underline">
          &larr; กลับไปยังหน้าจัดการแคมป์
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">รายละเอียดการจอง</h1>
            <div>{renderStatus(booking.status)}</div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* ข้อมูลแคมป์ */}
            <div>
              <h2 className="text-xl font-semibold mb-4">ข้อมูลแคมป์</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">{booking.campsites.name}</h3>
                <p className="text-gray-600 mb-4">{booking.campsites.description}</p>

                {extractZoneInfo(booking.notes) && (
                  <div className="flex items-center text-purple-600 mb-2">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>โซน: {extractZoneInfo(booking.notes)}</span>
                  </div>
                )}

                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>วันที่เข้าพัก: {formatThaiDate(booking.check_in_date)}</span>
                </div>

                <div className="flex items-center text-gray-600 mb-2">
                  <Users className="h-5 w-5 mr-2" />
                  <span>จำนวนผู้เข้าพัก: {booking.guests} คน</span>
                </div>

                <div className="flex items-center text-gray-600 mb-2">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>จำนวนคืน: {booking.nights} คืน</span>
                </div>

                <div className="flex items-center text-gray-600 mb-2">
                  <CreditCard className="h-5 w-5 mr-2" />
                  <span>ราคารวม: {formatCurrency(booking.total_price)}</span>
                </div>

                {booking.notes && (
                  <div className="mt-4">
                    <div className="flex items-start text-gray-600">
                      <MessageSquare className="h-5 w-5 mr-2 mt-1" />
                      <div>
                        <span className="font-medium">หมายเหตุ:</span>
                        <p className="whitespace-pre-line">{booking.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ข้อมูลผู้จอง */}
            <div>
              <h2 className="text-xl font-semibold mb-4">ข้อมูลผู้จอง</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 mr-4 overflow-hidden">
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
                    <h3 className="text-lg font-medium">
                      {booking.profiles?.full_name || booking.profiles?.username || "ไม่ระบุชื่อ"}
                    </h3>
                    <p className="text-gray-600">ID: {booking.profiles?.id}</p>
                  </div>
                </div>

                {booking.profiles?.phone && (
                  <div className="mb-2">
                    <span className="font-medium">เบอร์โทรศัพท์:</span> {booking.profiles.phone}
                  </div>
                )}

                <div className="mb-2">
                  <span className="font-medium">วันที่จอง:</span> {formatThaiDate(booking.created_at)}
                </div>
              </div>

              {/* ปุ่มจัดการการจอง */}
              {booking.status === "pending" && (
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => updateBookingStatus("approved")}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
                  >
                    อนุมัติการจอง
                  </button>
                  <button
                    onClick={() => updateBookingStatus("rejected")}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                  >
                    ปฏิเสธการจอง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Payment Information */}
      {booking && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">ข้อมูลการชำระเงิน</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                รีเฟรชข้อมูล
              </Button>
            </div>

            {payment ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4 p-4 rounded-lg bg-gray-50">
                      <h3 className="text-lg font-medium mb-2">สถานะการชำระเงิน</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">วิธีการชำระเงิน:</span>
                          <span className="font-medium">
                            {payment.payment_method === "cash" ? "ชำระเงินที่แคมป์" : "โอนผ่านธนาคาร"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">สถานะ:</span>
                          <span
                            className={`font-medium ${
                              payment.payment_status === "verified"
                                ? "text-green-600"
                                : payment.payment_status === "rejected"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                            }`}
                          >
                            {payment.payment_status === "verified"
                              ? "ยืนยันแล้ว"
                              : payment.payment_status === "rejected"
                                ? "ปฏิเสธแล้ว"
                                : "รอการยืนยัน"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">จำนวนเงิน:</span>
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                        {payment.transaction_date && (
                          <div className="flex justify-between">
                            <span className="font-medium">วันที่ทำรายการ:</span>
                            <span>{formatThaiDate(payment.transaction_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <PaymentInfo bookingId={bookingId} onRefresh={fetchPaymentData} />

                    {/* แสดงสลิปการชำระเงินแบบเด่นชัด */}
                    {hasUploadedSlip && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3">สลิปการชำระเงิน</h3>
                        <div className="border rounded-md p-2 bg-white">
                          <img
                            src={payment.slip_image_url || "/placeholder.svg"}
                            alt="สลิปการชำระเงิน"
                            className="w-full rounded-md object-contain max-h-80"
                            onClick={() => window.open(payment.slip_image_url, "_blank")}
                            style={{ cursor: "pointer" }}
                          />
                          <p className="text-xs text-center text-gray-500 mt-2">คลิกที่รูปภาพเพื่อขยาย</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <PaymentVerification payment={payment} onSuccess={fetchPaymentData} />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
                <p>ยังไม่มีข้อมูลการชำระเงิน</p>
                <p className="text-sm mt-2">หากคุณเพิ่งอัปเดตข้อมูลการชำระเงิน กรุณากดปุ่มรีเฟรชข้อมูลด้านบน</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
