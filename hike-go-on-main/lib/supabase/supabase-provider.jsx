"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// สร้าง Context สำหรับ Supabase
const SupabaseContext = createContext(null)

// Provider component ที่จะครอบ children components
export function SupabaseProvider({ children }) {
  const [supabase] = useState(() => createClientComponentClient())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อ component ถูกโหลด
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)

        // ดึงข้อมูลโปรไฟล์เพิ่มเติมจาก profiles table
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        // อัปเดต user metadata ด้วยข้อมูลจาก profiles table
        if (profileData) {
          const updatedUser = {
            ...session.user,
            user_metadata: {
              ...session.user.user_metadata,
              username: profileData.username || session.user.user_metadata?.username,
              full_name: profileData.full_name || session.user.user_metadata?.full_name,
              avatar_url: profileData.avatar_url || session.user.user_metadata?.avatar_url,
            },
          }
          setUser(updatedUser)

          // อัปเดต localStorage
          localStorage.setItem("isLoggedIn", "true")
          const userData = {
            id: updatedUser.id,
            email: updatedUser.email,
            username: profileData.username || updatedUser.user_metadata?.username || updatedUser.email.split("@")[0],
            fullName: profileData.full_name || updatedUser.user_metadata?.full_name || "",
            initials: getInitials(profileData.username || updatedUser.user_metadata?.username || updatedUser.email),
            profileImageUrl: profileData.avatar_url || updatedUser.user_metadata?.avatar_url || "",
          }
          localStorage.setItem("userData", JSON.stringify(userData))
        } else {
          localStorage.setItem("isLoggedIn", "true")
          const userData = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.username || session.user.email.split("@")[0],
            fullName: session.user.user_metadata?.full_name || "",
            initials: getInitials(session.user.user_metadata?.username || session.user.email),
            profileImageUrl: session.user.user_metadata?.avatar_url || "",
          }
          localStorage.setItem("userData", JSON.stringify(userData))
        }
      } else {
        setUser(null)
        localStorage.removeItem("isLoggedIn")
        localStorage.removeItem("userData")
      }

      setLoading(false)

      // ตั้งค่า listener สำหรับการเปลี่ยนแปลงสถานะการเข้าสู่ระบบ
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user)

          // ดึงข้อมูลโปรไฟล์เพิ่มเติมจาก profiles table
          const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

          // อัปเดต localStorage
          localStorage.setItem("isLoggedIn", "true")

          if (profileData) {
            const userData = {
              id: session.user.id,
              email: session.user.email,
              username:
                profileData.username || session.user.user_metadata?.username || session.user.email.split("@")[0],
              fullName: profileData.full_name || session.user.user_metadata?.full_name || "",
              initials: getInitials(profileData.username || session.user.user_metadata?.username || session.user.email),
              profileImageUrl: profileData.avatar_url || session.user.user_metadata?.avatar_url || "",
            }
            localStorage.setItem("userData", JSON.stringify(userData))
          } else {
            const userData = {
              id: session.user.id,
              email: session.user.email,
              username: session.user.user_metadata?.username || session.user.email.split("@")[0],
              fullName: session.user.user_metadata?.full_name || "",
              initials: getInitials(session.user.user_metadata?.username || session.user.email),
              profileImageUrl: session.user.user_metadata?.avatar_url || "",
            }
            localStorage.setItem("userData", JSON.stringify(userData))
          }

          // ส่ง event เพื่อแจ้งให้แท็บอื่นๆ อัปเดตข้อมูล
          window.dispatchEvent(new Event("storage"))
        } else {
          setUser(null)
          localStorage.removeItem("isLoggedIn")
          localStorage.removeItem("userData")
        }
      })

      return () => {
        subscription?.unsubscribe()
      }
    }

    checkUser()
  }, [supabase])

  // ฟังก์ชันสำหรับสร้างตัวอักษรย่อจากชื่อผู้ใช้
  const getInitials = (name) => {
    if (!name) return "U"

    // ถ้าเป็นอีเมล ให้ใช้ตัวอักษรแรกของส่วนแรกของอีเมล
    if (name.includes("@")) {
      return name.split("@")[0].charAt(0).toUpperCase()
    }

    // แยกชื่อด้วยช่องว่าง
    const nameParts = name.split(" ")

    // ถ้ามีชื่อเดียว
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase()
    }

    // ถ้ามีหลายชื่อ ใช้ตัวอักษรแรกของชื่อแรกและชื่อสุดท้าย
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }

  return <SupabaseContext.Provider value={{ supabase, user, loading }}>{children}</SupabaseContext.Provider>
}

// Custom hook สำหรับใช้งาน Supabase
export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === null) {
    throw new Error("useSupabase must be used within a SupabaseProvider")
  }
  return context
}
