"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format, parseISO, differenceInDays } from "date-fns"
import { th } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AlertCircle,
  MapPin,
  Calendar,
  Users,
  Phone,
  Mail,
  ArrowLeft,
  Loader2,
  Ban,
  Banknote,
  CreditCard,
  RefreshCw,
  Clock,
  CheckCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cancelBooking } from "@/lib/supabase/booking-actions"
import { getCampsiteOwnerBankAccounts, getPaymentByBookingId, setCashPayment } from "@/lib/actions/payment-actions"
import PaymentSlipUpload from "@/components/payment/payment-slip-upload"
import PaymentInfo from "@/components/payment/payment-info"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { formatNumber } from "@/lib/utils/format-utils"

export default function BookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = params.id

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [payment, setPayment] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankTransferDialogOpen, setBankTransferDialogOpen] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false)
  const [cancelledByOwner, setCancelledByOwner] = useState(false)

  useEffect(() => {
    fetchBookingDetails()
  }, [bookingId])

  const fetchBookingDetails = async () => {
    try {
      setLoading(true)
      const supabase = await createClient()

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
        router.push("/login?redirect=/profile/booking/" + bookingId)
        return
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          campsite:campsite_id(*,
            images:campsite_images(*),
            owner:owner_id(*)
          ),
          user:user_id(*)
        `)
        .eq("id", bookingId)
        .single()

      if (error) throw error

      // ตรวจสอบว่าผู้ใช้ปัจจุบันเป็นเจ้าของการจองนี้หรือไม่
      if (data.user_id !== sessionData.session.user.id) {
        setError("คุณไม่มีสิทธิ์ดูข้อมูลการจองนี้")
        setLoading(false)
        return
      }

      setBooking(data)
      console.log("Booking data:", data)

      // ตรวจสอบว่าการยกเลิกเกิดจากเจ้าของแคมป์หรือไม่
      // โดยดูจากการแจ้งเตือน
      if (data.status === "cancelled") {
        const { data: notifications } = await supabase
          .from("notifications")
          .select("*")
          .eq("reference_id", bookingId)
          .eq("type", "booking_rejected")
          .limit(1)

        setCancelledByOwner(notifications && notifications.length > 0)
      }

      // ดึงข้อมูลการชำระเงิน
      try {
        const paymentData = await getPaymentByBookingId(bookingId)
        console.log("Payment data:", paymentData)
        setPayment(paymentData)
      } catch (paymentError) {
        console.error("Error fetching payment:", paymentError)
      }

      // ดึงข้อมูลบัญชีธนาคารของเจ้าของแคมป์
      try {
        const bankAccountsData = await getCampsiteOwnerBankAccounts(data.campsite.owner_id)
        setBankAccounts(bankAccountsData)
      } catch (bankError) {
        console.error("Error fetching bank accounts:", bankError)
      }
    } catch (error) {
      console.error("Error fetching booking details:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelBooking = async () => {
    try {
      setIsCancelling(true)
      const { success, error } = await cancelBooking(bookingId)

      if (error) throw new Error(error)

      if (success) {
        // รีโหลดข้อมูลการจอง
        await fetchBookingDetails()
        setCancelDialogOpen(false)
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      alert(`ไม่สามารถยกเลิกการจองได้: ${error.message}`)
    } finally {
      setIsCancelling(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBookingDetails()
    setRefreshing(false)
  }

  // แปลงสถานะการจองเป็นภาษาไทย
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "รอการยืนยัน"
      case "confirmed":
        return "ยืนยันแล้ว"
      case "cancelled":
        // ตรวจสอบว่าถูกยกเลิกโดยเจ้าของแคมป์หรือไม่
        return cancelledByOwner ? "ถูกปฏิเสธ" : "ยกเลิกแล้ว"
      case "completed":
        return "เสร็จสิ้นแล้ว"
      default:
        return status
    }
  }

  // กำหนดสีของ Badge ตามสถานะ
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "confirmed":
        return "bg-green-500"
      case "cancelled":
        return "bg-red-500"
      case "completed":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  // แยกข้อมูลโซนจาก notes
  const extractZoneInfo = (notes) => {
    if (!notes) return null
    const zoneMatch = notes.match(/โซนที่จอง: (.+?)(?:\n|$)/)
    return zoneMatch ? zoneMatch[1] : null
  }

  // หาภาพหลักของสถานที่แคมป์
  const getCampsiteMainImage = (images) => {
    if (!images || images.length === 0) return "/mountain-vista-camp.png"
    const mainImage = images.find((img) => img.is_main) || images[0]
    return mainImage.image_url || "/mountain-vista-camp.png"
  }

  // ฟังก์ชันสำหรับตั้งค่าวิธีการชำระเงินเป็นเงินสด
  const handleSetPaymentMethodToCash = async () => {
    if (!booking || processingPayment) return

    try {
      setProcessingPayment(true)

      // ใช้ฟังก์ชันจาก payment-actions.js
      const result = await setCashPayment(bookingId, booking.total_price)

      if (!result.success) {
        throw new Error(result.error || "ไม่สามารถตั้งค่าวิธีการชำระเงินได้")
      }

      // อัพเดทข้อมูลการชำระเงินในหน้า UI
      await fetchBookingDetails()
      setPaymentMethodDialogOpen(false)

      toast({
        title: "ตั้งค่าวิธีการชำระเงินสำเร็จ",
        description: "คุณเลือกชำระเงินที่แคมป์ในวันเช็คอิน",
      })
    } catch (err) {
      console.error("Error setting payment method:", err)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: err.message || "ไม่สามารถตั้งค่าวิธีการชำระเงินได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  // ตรวจสอบว่าผู้ใช้ได้อัปโหลดสลิปแล้วหรือไม่
  const hasUploadedSlip = payment && payment.payment_method === "bank_transfer" && payment.slip_image_url

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-green-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
        <Button onClick={() => router.push("/profile?tab=bookings")} variant="outline" className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปยังรายการจอง
        </Button>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>ไม่พบข้อมูลการจอง</p>
        </div>
        <Button onClick={() => router.push("/profile?tab=bookings")} variant="outline" className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปยังรายการจอง
        </Button>
      </div>
    )
  }

  // คำนวณจำนวนวันที่พัก
  const nights = differenceInDays(parseISO(booking.check_out_date), parseISO(booking.check_in_date))

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="mb-6">
        <Button onClick={() => router.push("/profile?tab=bookings")} variant="outline" className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          กลับไปยังรายการจอง
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* รายละเอียดการจอง */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl font-bold">รายละเอียดการจอง</h1>
                <Badge className={`${getStatusColor(booking.status)} text-white px-3 py-1`}>
                  {getStatusText(booking.status)}
                </Badge>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{booking.campsite?.name}</h2>
                  <div className="flex items-start text-gray-600 mb-1">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p>
                      {booking.campsite?.location}, {booking.campsite?.district}, {booking.campsite?.province}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">วันที่เช็คอิน</h3>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-green-600" />
                      <p className="font-semibold">
                        {format(parseISO(booking.check_in_date), "EEEE d MMMM yyyy", { locale: th })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 ml-7">
                      เช็คอินได้ตั้งแต่: {booking.campsite?.check_in_time || "14:00 น."}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">วันที่เช็คเอาท์</h3>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-red-600" />
                      <p className="font-semibold">
                        {format(parseISO(booking.check_out_date), "EEEE d MMMM yyyy", { locale: th })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 ml-7">
                      เช็คเอาท์ก่อน: {booking.campsite?.check_out_time || "12:00 น."}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-600 mb-1">จำนวนผู้เข้าพัก</h3>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    <p className="font-semibold">{booking.guests} คน</p>
                  </div>
                </div>

                {extractZoneInfo(booking.notes) && (
                  <div>
                    <h3 className="font-medium text-gray-600 mb-1">โซนที่จอง</h3>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                      <p className="font-semibold">{extractZoneInfo(booking.notes)}</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <h3 className="font-medium text-gray-600 mb-2">รายละเอียดราคา</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p>
                        {formatNumber(booking.campsite?.price, "บาท")} x {nights} คืน
                      </p>
                      <p>{formatNumber(booking.campsite?.price * nights, "บาท")}</p>
                    </div>
                    {booking.additional_fees > 0 && (
                      <div className="flex justify-between">
                        <p>ค่าบริการเพิ่มเติม</p>
                        <p>{formatNumber(booking.additional_fees, "บาท")}</p>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <p>ราคารวมทั้งหมด</p>
                      <p className="text-green-600">{formatNumber(booking.total_price, "บาท")}</p>
                    </div>
                  </div>
                </div>

                {booking.special_requests && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-600 mb-1">คำขอพิเศษ</h3>
                      <p className="bg-gray-50 p-3 rounded-md">{booking.special_requests}</p>
                    </div>
                  </>
                )}

                {booking.status === "pending" && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      ยกเลิกการจอง
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ส่วนการชำระเงิน */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">การชำระเงิน</h2>
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                  รีเฟรช
                </Button>
              </div>

              {payment ? (
                <>
                  {/* แสดงข้อความแจ้งเตือนสถานะการชำระเงิน */}
                  {hasUploadedSlip && payment.payment_status === "pending" && (
                    <div className="p-4 border rounded-md bg-blue-50 mb-4">
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-blue-700 font-medium">ท่านชำระผ่านธนาคารไปแล้ว กรุณารอเจ้าของแคมป์อนุมัติ</p>
                          <p className="text-sm text-blue-600 mt-1">เจ้าของแคมป์จะตรวจสอบและยืนยันการชำระเงินของท่านเร็วๆ นี้</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {payment.payment_status === "verified" && (
                    <div className="p-4 border rounded-md bg-green-50 mb-4">
                      <div className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-green-700 font-medium">การชำระเงินของท่านได้รับการยืนยันแล้ว</p>
                          <p className="text-sm text-green-600 mt-1">
                            ขอบคุณสำหรับการชำระเงิน เราหวังว่าท่านจะมีความสุขกับการเข้าพัก
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <PaymentInfo bookingId={bookingId} onRefresh={fetchBookingDetails} />

                  {/* แสดงสลิปการชำระเงิน */}
                  {hasUploadedSlip && (
                    <div className="mt-4 border-t pt-4">
                      <h3 className="font-medium mb-2">สลิปการชำระเงิน</h3>
                      <div className="border rounded-md overflow-hidden">
                        <img
                          src={payment.slip_image_url || "/placeholder.svg"}
                          alt="สลิปการชำระเงิน"
                          className="w-full object-contain max-h-60"
                          onClick={() => window.open(payment.slip_image_url, "_blank")}
                          style={{ cursor: "pointer" }}
                        />
                        <p className="text-xs text-center text-gray-500 p-2">คลิกที่รูปภาพเพื่อขยาย</p>
                      </div>
                    </div>
                  )}

                  {/* แสดงปุ่มเปลี่ยนวิธีการชำระเงิน */}
                  {payment.payment_status === "pending" && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-sm text-gray-600 mb-2">ต้องการเปลี่ยนวิธีการชำระเงินหรือไม่?</p>
                      <Button
                        variant="outline"
                        className="flex items-center"
                        onClick={() => setPaymentMethodDialogOpen(true)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        เปลี่ยนวิธีการชำระเงิน
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 border rounded-md bg-yellow-50">
                    <p className="text-yellow-700 font-medium">กรุณาเลือกวิธีการชำระเงิน</p>
                    <p className="text-sm text-yellow-600 mt-1">เลือกวิธีการชำระเงินที่สะดวกสำหรับคุณ</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 border rounded-md ${processingPayment ? "bg-gray-100" : "hover:bg-gray-50 cursor-pointer"} transition flex flex-col items-center`}
                      onClick={processingPayment ? null : handleSetPaymentMethodToCash}
                    >
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <Banknote className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-medium mb-1">ชำระเงินที่แคมป์</h3>
                      <p className="text-sm text-gray-600 text-center">คุณสามารถชำระเงินได้ที่แคมป์ในวันเช็คอิน</p>
                      {processingPayment && (
                        <div className="mt-2 flex items-center text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          <span className="text-xs">กำลังดำเนินการ...</span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-4 border rounded-md ${processingPayment ? "bg-gray-100" : "hover:bg-gray-50 cursor-pointer"} transition flex flex-col items-center`}
                      onClick={processingPayment ? null : () => setBankTransferDialogOpen(true)}
                    >
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <CreditCard className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-medium mb-1">โอนเงินผ่านธนาคาร</h3>
                      <p className="text-sm text-gray-600 text-center">โอนเงินและอัปโหลดสลิปเพื่อยืนยันการชำระเงิน</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ข้อมูลสถานที่แคมป์และเจ้าของ */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">ข้อมูลสถานที่แคมป์</h2>

              <div className="relative h-48 rounded-md overflow-hidden mb-4">
                <Image
                  src={getCampsiteMainImage(booking.campsite?.images) || "/placeholder.svg"}
                  alt={booking.campsite?.name}
                  fill
                  className="object-cover"
                />
              </div>

              <Link href={`/campsite/${booking.campsite_id}`}>
                <Button className="w-full mb-6 bg-green-600 hover:bg-green-700">ดูรายละเอียดสถานที่แคมป์</Button>
              </Link>

              <Separator className="mb-4" />

              <h2 className="text-lg font-semibold mb-4">ข้อมูลเจ้าของสถานที่</h2>

              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-200 mr-3">
                    {booking.campsite?.owner?.avatar_url ? (
                      <Image
                        src={booking.campsite.owner.avatar_url || "/placeholder.svg"}
                        alt={booking.campsite.owner.username || "เจ้าของสถานที่"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                        {booking.campsite?.owner?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{booking.campsite?.owner?.username || "เจ้าของสถานที่"}</p>
                    <p className="text-sm text-gray-500">
                      เข้าร่วมเมื่อ {new Date(booking.campsite?.owner?.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>

                {booking.campsite?.owner?.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{booking.campsite.owner.phone}</span>
                  </div>
                )}

                {booking.campsite?.owner?.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{booking.campsite.owner.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog ยืนยันการยกเลิกการจอง */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การยกเลิกการจองที่ {booking.campsite?.name} ในวันที่{" "}
              {format(parseISO(booking.check_in_date), "PPP", { locale: th })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {isCancelling ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for bank transfer */}
      <Dialog open={bankTransferDialogOpen} onOpenChange={setBankTransferDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>โอนเงินผ่านธนาคาร</DialogTitle>
          </DialogHeader>

          {bankAccounts.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">บัญชีธนาคารสำหรับการโอนเงิน</h3>
                <div className="space-y-2">
                  {bankAccounts.map((account) => (
                    <div key={account.id} className="p-3 border rounded-md bg-gray-50">
                      <p className="font-medium">{account.bank_name}</p>
                      <p>{account.account_name}</p>
                      <p className="font-mono">{account.account_number}</p>
                      {account.is_default && <span className="text-xs text-green-600">บัญชีหลัก</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <PaymentSlipUpload
                  bookingId={bookingId}
                  onSuccess={() => {
                    setBankTransferDialogOpen(false)
                    fetchBookingDetails()
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-amber-600">เจ้าของแคมป์ยังไม่ได้เพิ่มบัญชีธนาคาร</p>
              <p className="text-sm text-gray-500 mt-1">กรุณาติดต่อเจ้าของแคมป์เพื่อขอข้อมูลการชำระเงิน</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog เลือกวิธีการชำระเงิน */}
      <Dialog open={paymentMethodDialogOpen} onOpenChange={setPaymentMethodDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>เลือกวิธีการชำระเงิน</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">กรุณาเลือกวิธีการชำระเงินที่ต้องการเปลี่ยน</p>

            <div className="grid grid-cols-1 gap-4">
              <div
                className={`p-4 border rounded-md ${processingPayment ? "bg-gray-100" : "hover:bg-gray-50 cursor-pointer"} transition flex flex-col items-center`}
                onClick={processingPayment ? null : handleSetPaymentMethodToCash}
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                  <Banknote className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-medium mb-1">ชำระเงินที่แคมป์</h3>
                <p className="text-sm text-gray-600 text-center">คุณสามารถชำระเงินได้ที่แคมป์ในวันเช็คอิน</p>
                {processingPayment && (
                  <div className="mt-2 flex items-center text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    <span className="text-xs">กำลังดำเนินการ...</span>
                  </div>
                )}
              </div>

              <div
                className={`p-4 border rounded-md ${processingPayment ? "bg-gray-100" : "hover:bg-gray-50 cursor-pointer"} transition flex flex-col items-center`}
                onClick={
                  processingPayment
                    ? null
                    : () => {
                        setPaymentMethodDialogOpen(false)
                        setBankTransferDialogOpen(true)
                      }
                }
              >
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-medium mb-1">โอนเงินผ่านธนาคาร</h3>
                <p className="text-sm text-gray-600 text-center">โอนเงินและอัปโหลดสลิปเพื่อยืนยันการชำระเงิน</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
