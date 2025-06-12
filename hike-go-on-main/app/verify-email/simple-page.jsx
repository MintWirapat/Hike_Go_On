"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailSimple() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState("verifying") // verifying, success, error

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const supabase = createClientComponentClient()

        // ดึงพารามิเตอร์จาก URL
        const token_hash = searchParams.get("token_hash")
        const type = searchParams.get("type")

        if (!token_hash || !type) {
          setVerificationStatus("error")
          return
        }

        // ยืนยันอีเมล
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type,
        })

        if (error) {
          setVerificationStatus("error")
          return
        }

        setVerificationStatus("success")
      } catch (error) {
        setVerificationStatus("error")
      }
    }

    verifyEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Hike Go On Logo" width={100} height={100} className="rounded-full" />
        </div>

        {verificationStatus === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 text-green-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">กำลังยืนยันอีเมล กรุณารอสักครู่...</p>
          </>
        )}

        {verificationStatus === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">ยืนยันอีเมลสำเร็จ!</h2>
            <Link
              href="/"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors inline-block"
            >
              ไปยังหน้าหลัก
            </Link>
          </>
        )}

        {verificationStatus === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-4">เกิดข้อผิดพลาดในการยืนยันอีเมล</h2>
            <Link
              href="/"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors inline-block"
            >
              ไปยังหน้าหลัก
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
