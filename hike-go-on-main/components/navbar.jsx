"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/lib/supabase/supabase-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, supabase } = useSupabase()
  const [userData, setUserData] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // เมื่อมีการเปลี่ยนแปลง user จาก context ให้ดึงข้อมูลโปรไฟล์จาก Supabase
    const fetchProfileData = async () => {
      if (user) {
        try {
          // ดึงข้อมูลโปรไฟล์จาก Supabase
          const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          if (data && !error) {
            // สร้างข้อมูลผู้ใช้จากข้อมูลที่ได้จาก Supabase
            const userProfileData = {
              id: user.id,
              email: user.email,
              username: data.username || user.user_metadata?.username || user.email.split("@")[0],
              fullName: data.full_name || user.user_metadata?.full_name || "",
              initials: getInitials(data.username || user.user_metadata?.username || user.email),
              profileImageUrl: data.avatar_url || user.user_metadata?.avatar_url || "",
              phone: data.phone || "",
            }
            setProfileData(userProfileData)

            // อัปเดต localStorage เพื่อให้ส่วนอื่นๆ ของแอปใช้ข้อมูลล่าสุด
            localStorage.setItem("userData", JSON.stringify(userProfileData))
          } else {
            // ถ้าไม่พบข้อมูลโปรไฟล์ ให้ใช้ข้อมูลจาก user metadata
            const userMetadata = {
              id: user.id,
              email: user.email,
              username: user.user_metadata?.username || user.email.split("@")[0],
              fullName: user.user_metadata?.full_name || "",
              initials: getInitials(user.user_metadata?.username || user.email),
              profileImageUrl: user.user_metadata?.avatar_url || "",
            }
            setProfileData(userMetadata)
            localStorage.setItem("userData", JSON.stringify(userMetadata))
          }
        } catch (error) {
          console.error("Error fetching profile data:", error)
        }
      } else {
        setProfileData(null)
        localStorage.removeItem("userData")
      }
    }

    fetchProfileData()
  }, [user, supabase, router.asPath])

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

  const handleAuthAction = (path, e) => {
    e.preventDefault()
    // ตรวจสอบสถานะการ login จาก user
    if (user) {
      router.push(path)
    } else {
      router.push(`/login?redirect=${encodeURIComponent(path)}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userData")
    router.push("/")
  }

  const isLoggedIn = !!user

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-8 w-8 mr-2">
              <Image
                src="/logo.png"
                alt="Hike Go On Logo"
                width={32}
                height={32}
                priority
                onError={(e) => {
                  console.error("Logo failed to load")
                  e.target.src = "/placeholder.svg"
                }}
              />
            </div>
            <span className="text-green-600 font-bold text-xl">Hike Go On</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className="flex items-center px-5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 h-10"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/search"
              className="flex items-center px-5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 h-10"
            >
              ค้นหา
            </Link>
            <Link
              href="/equipment"
              className="flex items-center px-5 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 h-10"
            >
              อุปกรณ์แคมป์ปิ้ง
            </Link>

            <a
              href="/post"
              onClick={(e) => handleAuthAction("/post", e)}
              className="flex items-center px-5 py-2 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600 h-10"
            >
              เพิ่มสถานที่แคมป์
            </a>
            <a
              href="/equipment-post"
              onClick={(e) => handleAuthAction("/equipment-post", e)}
              className="flex items-center px-5 py-2 rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600 h-10"
            >
              ลงขายอุปกรณ์แคมป์ปิ้ง
            </a>
          </nav>

          {/* Login/Register Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            {isLoggedIn && profileData ? (
              <>
                <NotificationDropdown userId={user.id} />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 overflow-hidden">
                    {profileData.profileImageUrl ? (
                      <img
                        src={profileData.profileImageUrl || "/placeholder.svg"}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      profileData.initials || "U"
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-md z-50">
                    <div className="px-4 py-2 text-sm bg-white">
                      <div className="font-medium">{profileData.username || "ผู้ใช้"}</div>
                      <div className="text-gray-500 text-xs">{profileData.email}</div>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-200" />
                    <DropdownMenuItem asChild className="bg-white hover:bg-gray-100">
                      <Link href="/profile">โปรไฟล์</Link>
                    </DropdownMenuItem>
                    {/* เพิ่มลิงก์ไปยังหน้า admin สำหรับเจ้าของแคมป์ */}
                    <DropdownMenuItem asChild className="bg-white hover:bg-gray-100">
                      <Link href="/admin/campsite">Admin</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 bg-white hover:bg-gray-100">
                      ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 h-10"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="flex items-center px-4 py-2 rounded-md text-sm font-medium border border-green-500 text-green-500 hover:bg-green-50 h-10"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute w-full bg-white shadow-md z-50">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 h-10"
              onClick={() => setIsMenuOpen(false)}
            >
              หน้าหลัก
            </Link>
            <Link
              href="/search"
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 h-10"
              onClick={() => setIsMenuOpen(false)}
            >
              ค้นหา
            </Link>
            <Link
              href="/equipment"
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 h-10"
              onClick={() => setIsMenuOpen(false)}
            >
              อุปกรณ์แคมป์ปิ้ง
            </Link>
            <a
              href="/post"
              onClick={(e) => {
                handleAuthAction("/post", e)
                setIsMenuOpen(false)
              }}
              className="flex items-center px-3 py-2 rounded-md text-base font-medium bg-green-500 text-white hover:bg-green-600 mx-2 h-10"
            >
              เพิ่มสถานที่แคมป์
            </a>
            <a
              href="/equipment-post"
              onClick={(e) => {
                handleAuthAction("/equipment-post", e)
                setIsMenuOpen(false)
              }}
              className="flex items-center px-3 py-2 rounded-md text-base font-medium bg-green-500 text-white hover:bg-green-600 mx-2 h-10"
            >
              ลงขายอุปกรณ์แคมป์ปิ้ง
            </a>

            {/* Login/Register Buttons - Mobile */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              {isLoggedIn && profileData ? (
                <>
                  <div className="px-3 py-2 bg-white">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 mr-2 overflow-hidden">
                        {profileData.profileImageUrl ? (
                          <img
                            src={profileData.profileImageUrl || "/placeholder.svg"}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          profileData.initials || "U"
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{profileData.username || "ผู้ใช้"}</div>
                        <div className="text-gray-500 text-xs">{profileData.email}</div>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 bg-white h-10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    โปรไฟล์
                  </Link>
                  {/* เพิ่มลิงก์ไปยังหน้า admin สำหรับเจ้าของแคมป์ */}
                  <Link
                    href="/admin/campsite"
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 bg-white h-10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-gray-100 bg-white h-10"
                  >
                    ออกจากระบบ
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 bg-white h-10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-green-500 hover:bg-gray-100 bg-white h-10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    สมัครสมาชิก
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
