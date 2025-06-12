"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/supabase/supabase-provider"

// คอมโพเนนต์สำหรับตรวจสอบการเข้าสู่ระบบ
export function useAuthCheck() {
  const router = useRouter()
  const { user, loading } = useSupabase()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // ตั้งค่า isLoggedIn ตาม user จาก context
    setIsLoggedIn(!!user)
  }, [user])

  // ฟังก์ชันสำหรับตรวจสอบและนำทางไปยังหน้าเข้าสู่ระบบถ้าจำเป็น
  const checkAuthAndRedirect = (e) => {
    if (!isLoggedIn) {
      e.preventDefault()
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname))
      return false
    }
    return true
  }

  return { isLoggedIn, isLoading: loading, checkAuthAndRedirect }
}
