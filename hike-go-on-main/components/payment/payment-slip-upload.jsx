"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Upload, Loader2, CheckCircle } from "lucide-react"
import { uploadPaymentSlip } from "@/lib/actions/payment-actions"

export default function PaymentSlipUpload({ bookingId, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith("image/")) {
      setError("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น")
      return
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("ขนาดไฟล์ต้องไม่เกิน 5MB")
      return
    }

    // สร้างชื่อไฟล์ใหม่ที่ปลอดภัย (เพื่อการแสดงผลเท่านั้น)
    const fileExtension = file.name.split(".").pop()
    const safeFile = new File([file], `payment_slip_${Date.now()}.${fileExtension}`, {
      type: file.type,
    })

    setSelectedFile(safeFile)
    setError(null)

    // สร้าง URL สำหรับแสดงตัวอย่างรูปภาพ
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (!selectedFile) {
        throw new Error("กรุณาเลือกไฟล์สลิปการโอนเงิน")
      }

      const formData = new FormData(e.target)
      formData.append("slip", selectedFile)

      const result = await uploadPaymentSlip(bookingId, formData)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuccessMessage("อัปโหลดสลิปการโอนเงินสำเร็จ สลิปของคุณได้ถูกส่งไปยังเจ้าของแคมป์แล้ว กรุณารอการตรวจสอบ")

      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      console.error("Error uploading payment slip:", error)
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-4">อัปโหลดสลิปการโอนเงิน</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md flex items-start mb-4">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="slip">สลิปการโอนเงิน</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
            <Input id="slip" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Label htmlFor="slip" className="cursor-pointer">
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <img src={previewUrl || "/placeholder.svg"} alt="สลิปการโอนเงิน" className="max-h-40 mb-2 rounded-md" />
                  <span className="text-sm text-blue-600">คลิกเพื่อเปลี่ยนรูปภาพ</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <span className="text-gray-600">คลิกเพื่ออัปโหลดสลิปการโอนเงิน</span>
                  <span className="text-xs text-gray-500 mt-1">รองรับไฟล์ JPG, PNG (ไม่เกิน 5MB)</span>
                </div>
              )}
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">ธนาคารที่โอน</Label>
            <Input id="bank_name" name="bank_name" placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">เลขที่บัญชีปลายทาง (ถ้าทราบ)</Label>
            <Input id="account_number" name="account_number" placeholder="เลขที่บัญชีที่โอนไป" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction_date">วันและเวลาที่โอน</Label>
          <Input id="transaction_date" name="transaction_date" type="datetime-local" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">หมายเหตุ (ถ้ามี)</Label>
          <Textarea id="notes" name="notes" placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับการโอนเงิน" rows={3} />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !selectedFile}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังอัปโหลด...
            </>
          ) : (
            "ยืนยันการชำระเงิน"
          )}
        </Button>
      </form>
    </div>
  )
}
