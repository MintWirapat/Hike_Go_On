"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // จัดการข้อผิดพลาดที่เกิดขึ้นในคอมโพเนนต์ลูก
    const errorHandler = (error) => {
      console.error("Caught error:", error)
      setError(error)
      setHasError(true)

      // ส่งข้อมูลข้อผิดพลาดไปยังระบบติดตาม (ถ้ามี)
      // sendErrorToAnalytics(error)
    }

    window.addEventListener("error", errorHandler)
    window.addEventListener("unhandledrejection", errorHandler)

    return () => {
      window.removeEventListener("error", errorHandler)
      window.removeEventListener("unhandledrejection", errorHandler)
    }
  }, [])

  const handleRetry = () => {
    setHasError(false)
    setError(null)
    window.location.reload()
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาดบางอย่าง</h2>
        <p className="text-gray-600 mb-4">ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง</p>
        {error && (
          <div className="bg-gray-100 p-3 rounded-md mb-4 max-w-full overflow-auto text-sm text-left">
            <code>{error.toString()}</code>
          </div>
        )}
        <Button onClick={handleRetry} className="bg-green-600 hover:bg-green-700">
          ลองใหม่อีกครั้ง
        </Button>
      </div>
    )
  }

  return children
}
