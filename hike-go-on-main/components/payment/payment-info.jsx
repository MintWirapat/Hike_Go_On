"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatThaiDate } from "@/lib/utils/date-utils"
import { formatCurrency } from "@/lib/utils/format-utils"
import { CreditCard, Banknote, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { getPaymentByBookingId } from "@/lib/actions/payment-actions"
import { Button } from "@/components/ui/button"

export default function PaymentInfo({ bookingId, onRefresh, showChangeOption = false, onChangeMethod = () => {} }) {
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPayment = async () => {
    try {
      setLoading(true)
      const data = await getPaymentByBookingId(bookingId)
      console.log("Payment data in PaymentInfo:", data) // เพิ่ม log เพื่อตรวจสอบข้อมูล
      setPayment(data)
    } catch (error) {
      console.error("Error fetching payment:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayment()
    console.log("Payment info props:", { bookingId, showChangeOption })
  }, [bookingId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPayment()
    if (onRefresh) {
      await onRefresh()
    }
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gray-200 rounded-md mb-4"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md text-yellow-700">
        <div className="flex justify-between items-center">
          <p>ยังไม่มีข้อมูลการชำระเงิน</p>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            ยืนยันแล้ว
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            ปฏิเสธแล้ว
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="h-3.5 w-3.5 mr-1" />
            รอการยืนยัน
          </Badge>
        )
    }
  }

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "bank_transfer":
        return <CreditCard className="h-5 w-5 text-blue-600" />
      case "cash":
        return <Banknote className="h-5 w-5 text-green-600" />
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />
    }
  }

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "bank_transfer":
        return "โอนผ่านธนาคาร"
      case "cash":
        return "ชำระเงินที่แคมป์"
      default:
        return method
    }
  }

  // ตรวจสอบว่ามีการอัปโหลดสลิปหรือไม่
  const hasUploadedSlip = payment.payment_method === "bank_transfer" && payment.slip_image_url

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            {getPaymentMethodIcon(payment.payment_method)}
            <h3 className="text-lg font-medium ml-2">{getPaymentMethodText(payment.payment_method)}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(payment.payment_status)}
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {payment.payment_status === "pending" && (
          <div
            className={`p-3 rounded-md ${hasUploadedSlip ? "bg-blue-50" : payment.payment_method === "cash" ? "bg-yellow-50" : "bg-gray-50"}`}
          >
            {hasUploadedSlip ? (
              <p className="text-sm text-blue-700">
                <Clock className="h-4 w-4 inline-block mr-1" />
                สลิปการโอนเงินของคุณได้ถูกส่งไปยังเจ้าของแคมป์แล้ว กรุณารอการตรวจสอบ
              </p>
            ) : payment.payment_method === "cash" ? (
              <p className="text-sm text-yellow-700">
                <Clock className="h-4 w-4 inline-block mr-1" />
                คุณเลือกชำระเงินที่แคมป์ในวันเช็คอิน
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                <Clock className="h-4 w-4 inline-block mr-1" />
                รอการตรวจสอบและยืนยันการชำระเงิน
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 text-sm mt-3">
          <div className="flex justify-between">
            <span className="text-gray-600">จำนวนเงิน:</span>
            <span className="font-medium">{formatCurrency(payment.amount)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">วันที่ทำรายการ:</span>
            <span>{formatThaiDate(payment.created_at)}</span>
          </div>

          {payment.payment_method === "bank_transfer" && (
            <>
              {payment.bank_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">ธนาคาร:</span>
                  <span>{payment.bank_name}</span>
                </div>
              )}
              {payment.account_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">เลขที่บัญชี:</span>
                  <span className="font-mono">{payment.account_number}</span>
                </div>
              )}
              {payment.transaction_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">วันที่โอน:</span>
                  <span>{formatThaiDate(payment.transaction_date)}</span>
                </div>
              )}
            </>
          )}

          {payment.payment_status === "verified" && payment.verified_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">ยืนยันเมื่อ:</span>
              <span>{formatThaiDate(payment.verified_at)}</span>
            </div>
          )}

          {payment.payment_status === "verified" && payment.verified_by_user && (
            <div className="flex justify-between">
              <span className="text-gray-600">ยืนยันโดย:</span>
              <span>{payment.verified_by_user.full_name || payment.verified_by_user.username}</span>
            </div>
          )}

          {payment.notes && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-gray-600 block mb-1">หมายเหตุ:</span>
              <p className="text-gray-800 bg-gray-50 p-2 rounded-md">{payment.notes}</p>
            </div>
          )}
        </div>
        {showChangeOption && payment.payment_status === "pending" && (
          <div className="mt-4 pt-4 border-t border-gray-100"></div>
        )}
      </CardContent>
    </Card>
  )
}
