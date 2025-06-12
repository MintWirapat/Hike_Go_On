"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, XCircle, Loader2, Clock } from "lucide-react"
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
import { verifyPayment } from "@/lib/actions/payment-actions"

export default function PaymentVerification({ payment, onSuccess }) {
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [rejectReason, setRejectReason] = useState("")

  // ตรวจสอบว่าสามารถยืนยันหรือปฏิเสธการชำระเงินได้หรือไม่
  const canVerify = payment && payment.payment_status === "pending"

  const handleVerify = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await verifyPayment(payment.id, "verified", "")

      if (!result.success) {
        throw new Error(result.error)
      }

      setIsVerifyDialogOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error verifying payment:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (!rejectReason.trim()) {
        throw new Error("กรุณาระบุเหตุผลในการปฏิเสธการชำระเงิน")
      }

      const result = await verifyPayment(payment.id, "rejected", rejectReason)

      if (!result.success) {
        throw new Error(result.error)
      }

      setIsRejectDialogOpen(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error rejecting payment:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyPayment = async (status) => {
    setIsSubmitting(true)
    setError(null)

    try {
      let result
      if (status === "verified") {
        result = await verifyPayment(payment.id, "verified", "")
      } else if (status === "rejected") {
        if (!rejectReason.trim()) {
          throw new Error("กรุณาระบุเหตุผลในการปฏิเสธการชำระเงิน")
        }
        result = await verifyPayment(payment.id, "rejected", rejectReason)
      } else {
        throw new Error("Invalid status")
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error verifying payment:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canVerify) {
    return null
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-lg font-medium mb-3">ตรวจสอบการชำระเงิน</h3>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-3 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4 mt-4">
        <div className="p-4 border rounded-md bg-gray-50">
          <h3 className="font-medium mb-2">การตรวจสอบการชำระเงิน</h3>
          <p className="text-sm text-gray-600 mb-4">
            กรุณาตรวจสอบข้อมูลการชำระเงินและสลิปการโอนเงินให้ถูกต้องก่อนยืนยันหรือปฏิเสธการชำระเงิน
          </p>

          <div className="flex space-x-3">
            <Button
              onClick={() => handleVerifyPayment("verified")}
              disabled={isSubmitting || payment.payment_status === "verified"}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              ยืนยันการชำระเงิน
            </Button>
            <Button
              onClick={() => handleVerifyPayment("rejected")}
              disabled={isSubmitting || payment.payment_status === "rejected"}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              ปฏิเสธการชำระเงิน
            </Button>
          </div>
        </div>

        {payment.payment_status === "pending" && (
          <div className="bg-yellow-50 p-3 rounded-md">
            <p className="text-sm text-yellow-700">
              <Clock className="h-4 w-4 inline-block mr-1" />
              รอการตรวจสอบและยืนยันการชำระเงินจากคุณ
            </p>
          </div>
        )}
      </div>

      {/* Dialog ยืนยันการชำระเงิน */}
      <AlertDialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการชำระเงิน</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการยืนยันการชำระเงินนี้? การกระทำนี้จะแจ้งให้ผู้จองทราบว่าการชำระเงินได้รับการยืนยันแล้ว
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify}
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังยืนยัน...
                </>
              ) : (
                "ยืนยัน"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog ปฏิเสธการชำระเงิน */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธการชำระเงิน</AlertDialogTitle>
            <AlertDialogDescription>กรุณาระบุเหตุผลในการปฏิเสธการชำระเงินนี้ เพื่อแจ้งให้ผู้จองทราบ</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เช่น ไม่พบรายการโอนเงิน, จำนวนเงินไม่ถูกต้อง, ฯลฯ"
              rows={3}
              required
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              className="bg-red-500 hover:bg-red-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังปฏิเสธ...
                </>
              ) : (
                "ปฏิเสธ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
