"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSupabase } from "@/lib/supabase/supabase-provider"

export function AuthForm({ mode = "login", redirectPath = "/" }) {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) {
          setError(error.message)
        } else {
          setSuccess(true)

          // ตรวจสอบว่ามี query parameter redirect หรือไม่
          const urlParams = new URLSearchParams(window.location.search)
          const redirectTo = urlParams.get("redirect") || redirectPath

          setTimeout(() => {
            router.push(redirectTo)
          }, 1000)
        }
      } else {
        // ตรวจสอบว่ารหัสผ่านตรงกันหรือไม่
        if (formData.password !== formData.confirmPassword) {
          setError("รหัสผ่านไม่ตรงกัน")
          setLoading(false)
          return
        }

        // ไม่ต้องตรวจสอบอีเมลซ้ำก่อน ให้ใช้ signUp เลย
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              username: formData.username,
              full_name: formData.fullName,
            },
          },
        })

        if (error) {
          // ตรวจสอบข้อความผิดพลาดที่เกี่ยวกับอีเมลซ้ำ
          if (
            error.message.includes("already registered") ||
            error.message.includes("already exists") ||
            error.message.includes("already taken") ||
            error.message.includes("User already registered")
          ) {
            setError("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น")
          } else {
            setError(error.message)
          }
        } else if (data?.user?.identities?.length === 0) {
          // กรณีที่ Supabase ไม่ส่ง error แต่ไม่มี identities หมายความว่าอีเมลนี้มีอยู่แล้ว
          setError("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น")
        } else {
          setSuccess(true)
          setTimeout(() => {
            router.push("/login")
          }, 2000)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl text-center">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</CardTitle>
        <CardDescription className="text-center">
          {mode === "login" ? "เข้าสู่ระบบเพื่อจัดการและแชร์สถานที่แคมป์ปิ้งของคุณ" : "สร้างบัญชีเพื่อเริ่มใช้งาน Hike Go On"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
            <AlertDescription>
              {mode === "login"
                ? "เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าที่ต้องการ..."
                : "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี"}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="ชื่อที่ต้องการแสดง"
                  required
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="ชื่อ-นามสกุลจริง"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@gmail.com"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="********"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          )}

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {mode === "login" ? (
            <>
              ยังไม่มีบัญชี?{" "}
              <a href="/register" className="text-green-600 hover:underline">
                สมัครสมาชิก
              </a>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว?{" "}
              <a href="/login" className="text-green-600 hover:underline">
                เข้าสู่ระบบ
              </a>
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  )
}
