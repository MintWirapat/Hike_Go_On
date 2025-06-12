"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { th } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Star,
  Heart,
  Settings,
  LogOut,
  ChevronRight,
  Loader2,
  Upload,
  Camera,
  Tag,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "@/lib/supabase/actions"
import { getUserBookings, cancelBooking } from "@/lib/supabase/booking-actions"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("profile")
  const fileInputRef = useRef(null)

  // สำหรับข้อมูลโปรไฟล์
  const [profileImage, setProfileImage] = useState(null)
  const [profileImageUrl, setProfileImageUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    phone: "",
    location: "",
  })

  // สำหรับสถิติ
  const [stats, setStats] = useState({
    campsitesCount: 0,
    equipmentCount: 0,
    bookingsCount: 0,
    reviewsCount: 0,
    favoritesCount: 0,
  })

  // สำหรับการจอง
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)

  // สำหรับรายการโปรด
  const [favorites, setFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  useEffect(() => {
    // ตรวจสอบ URL parameter สำหรับ tab
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get("tab")
    if (tabParam && ["profile", "bookings", "favorites", "settings"].includes(tabParam)) {
      setActiveTab(tabParam)
    }

    checkSessionAndLoadData()
  }, [])

  const checkSessionAndLoadData = async () => {
    try {
      const supabase = await createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      if (!sessionData.session) {
        router.push("/login?redirect=/profile")
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.session.user.id)
        .single()

      if (userError) {
        throw userError
      }

      const currentUser = {
        ...userData,
        email: sessionData.session.user.email,
      }

      setUser(currentUser)
      setFormData({
        username: currentUser.username || "",
        fullName: currentUser.full_name || "",
        phone: currentUser.phone || "",
        location: currentUser.location || "",
      })

      if (currentUser.avatar_url) {
        setProfileImageUrl(currentUser.avatar_url)
      }

      // ดึงข้อมูลสถิติของผู้ใช้
      await fetchUserStats(supabase, sessionData.session.user.id)

      // ดึงข้อมูลการจองของผู้ใช้
      await fetchUserBookings(sessionData.session.user.id)

      // ดึงข้อมูลรายการโปรดของผู้ใช้
      await fetchUserFavorites(supabase, sessionData.session.user.id)
    } catch (error) {
      console.error("Error checking session:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async (supabaseClient, userId) => {
    try {
      // ดึงจำนวนสถานที่แคมป์
      const { count: campsitesCount, error: campsitesError } = await supabaseClient
        .from("campsites")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", userId)

      // ดึงจำนวนอุปกรณ์
      const { count: equipmentCount, error: equipmentError } = await supabaseClient
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", userId)

      // ดึงจำนวนการจอง
      const { count: bookingsCount, error: bookingsError } = await supabaseClient
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // ดึงจำนวนรีวิว
      const { count: reviewsCount, error: reviewsError } = await supabaseClient
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // ดึงจำนวนรายการโปรด
      const { count: favoritesCount, error: favoritesError } = await supabaseClient
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      setStats({
        campsitesCount: campsitesCount || 0,
        equipmentCount: equipmentCount || 0,
        bookingsCount: bookingsCount || 0,
        reviewsCount: reviewsCount || 0,
        favoritesCount: favoritesCount || 0,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const fetchUserBookings = async (userId) => {
    try {
      setBookingsLoading(true)
      const { success, bookings: bookingsData, error: bookingsError } = await getUserBookings()

      if (bookingsError) {
        throw new Error(bookingsError)
      }

      setBookings(bookingsData || [])
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setBookingsLoading(false)
    }
  }

  const fetchUserFavorites = async (supabaseClient, userId) => {
    try {
      setFavoritesLoading(true)
      const { data, error } = await supabaseClient
        .from("favorites")
        .select(`
       *,
       campsites:campsite_id(
         *,
         images:campsite_images(*)
       ),
       equipment:equipment_id(
         *,
         images:equipment_images(*)
       )
     `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setFavorites(data || [])
    } catch (error) {
      console.error("Error fetching user favorites:", error)
    } finally {
      setFavoritesLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { success, error } = await signOut()

      if (error) {
        throw new Error(error)
      }

      if (success) {
        localStorage.removeItem("isLoggedIn")
        router.push("/")
      }
    } catch (error) {
      console.error("Error signing out:", error)
      alert("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง")
    }
  }

  // ฟังก์ชันสำหรับการแก้ไขโปรไฟล์
  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleProfileImageClick = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setProfileImage(file)
      const imageUrl = URL.createObjectURL(file)
      setProfileImageUrl(imageUrl)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return

    setSaving(true)
    setMessage({ type: "", text: "" })

    try {
      const supabase = await createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่")
      }

      let avatarUrl = user.avatar_url

      if (profileImage) {
        try {
          const formData = new FormData()
          formData.append("file", profileImage)
          formData.append(
            "fileName",
            `${user.id}-${Math.random().toString(36).substring(2)}.${profileImage.name.split(".").pop()}`,
          )

          const uploadResponse = await fetch("/api/profile/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json()
            throw new Error(`อัพโหลดรูปโปรไฟล์ไม่สำเร็จ: ${errorData.error || uploadResponse.statusText}`)
          }

          const uploadResult = await uploadResponse.json()
          avatarUrl = uploadResult.url
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError)
          setMessage({
            type: "warning",
            text: `ไม่สามารถอัพโหลดรูปโปรไฟล์ได้: ${uploadError.message} แต่ข้อมูลอื่นๆ จะถูกบันทึก`,
          })
        }
      }

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          username: formData.username,
          fullName: formData.fullName,
          phone: formData.phone,
          location: formData.location,
          avatarUrl: avatarUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`อัพเดทข้อมูลไม่สำเร็จ: ${errorData.error || response.statusText}`)
      }

      const updatedUser = {
        ...user,
        username: formData.username,
        full_name: formData.fullName,
        phone: formData.phone,
        location: formData.location,
        avatar_url: avatarUrl,
      }

      setUser(updatedUser)

      if (!message.type) {
        setMessage({
          type: "success",
          text: avatarUrl !== user.avatar_url ? "บันทึกข้อมูลและรูปโปรไฟล์สำเร็จ" : "บันทึกข้อมูลสำเร็จ",
        })
      }

      // อัพเดท localStorage
      localStorage.setItem(
        "userData",
        JSON.stringify({
          id: user.id,
          email: user.email,
          username: formData.username,
          fullName: formData.fullName,
          phone: formData.phone,
          profileImageUrl: avatarUrl,
        }),
      )

      // แจ้งให้แท็บอื่นๆ อัปเดตข้อมูล
      try {
        window.localStorage.setItem("userDataUpdated", Date.now().toString())
        window.dispatchEvent(new Event("storage"))
      } catch (e) {
        console.error("Error dispatching storage event:", e)
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      setMessage({ type: "error", text: error.message })
    } finally {
      setSaving(false)
    }
  }

  // ฟังก์ชันสำหรับการจัดการการจอง
  const handleCancelBookingClick = (booking) => {
    setBookingToCancel(booking)
    setCancelDialogOpen(true)
  }

  const handleCancelBookingConfirm = async () => {
    if (!bookingToCancel) return

    setIsCancelling(true)
    try {
      const { success, error } = await cancelBooking(bookingToCancel.id)

      if (error) {
        throw new Error(error)
      }

      if (success) {
        await fetchUserBookings()
        setCancelDialogOpen(false)
        setBookingToCancel(null)
      }
    } catch (error) {
      console.error("Error cancelling booking:", error)
      alert(`ไม่สามารถยกเลิกการจองได้: ${error.message}`)
    } finally {
      setIsCancelling(false)
    }
  }

  // ฟังก์ชันสำหรับการจัดการรายการโปรด
  const handleRemoveFavorite = async (favoriteId) => {
    try {
      const supabase = await createClient()
      const { error } = await supabase.from("favorites").delete().eq("id", favoriteId)

      if (error) {
        throw error
      }

      setFavorites(favorites.filter((fav) => fav.id !== favoriteId))

      // อัพเดทสถิติ
      setStats((prev) => ({
        ...prev,
        favoritesCount: Math.max(0, prev.favoritesCount - 1),
      }))
    } catch (error) {
      console.error("Error removing favorite:", error)
      alert(`ไม่สามารถลบรายการโปรดได้: ${error.message}`)
    }
  }

  // แปลงสถานะการจองเป็นภาษาไทย
  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "รอการยืนยัน"
      case "confirmed":
        return "ยืนยันแล้ว"
      case "cancelled":
        return "ยกเลิกแล้ว"
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

  // แก้ไขฟังก์ชัน handleTabChange (ถ้ามี) หรือเพิ่มฟังก์ชันใหม่
  const handleTabChange = (value) => {
    setActiveTab(value)
    // อัปเดต URL parameter โดยไม่ต้อง refresh หน้า
    const url = new URL(window.location)
    url.searchParams.set("tab", value)
    window.history.pushState({}, "", url)
  }

  // ฟังก์ชันสำหรับนำทางไปยังหน้ารายละเอียดการจอง
  const navigateToBookingDetail = (bookingId) => {
    router.push(`/profile/booking/${bookingId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
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
        <Button onClick={() => router.push("/login")} className="bg-green-600 hover:bg-green-700">
          เข้าสู่ระบบ
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* ส่วนข้อมูลผู้ใช้ */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 mb-4 cursor-pointer group"
                  onClick={() => activeTab === "settings" && handleProfileImageClick()}
                >
                  {user?.avatar_url || profileImageUrl ? (
                    <>
                      <Image
                        src={profileImageUrl || user.avatar_url || "/placeholder.svg"}
                        alt={user?.username || "ผู้ใช้"}
                        fill
                        className="object-cover"
                      />
                      {activeTab === "settings" && (
                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{user?.username || "ผู้ใช้"}</h2>
                <p className="text-gray-500 text-sm mb-4">{user?.email}</p>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="font-semibold">ข้อมูลส่วนตัว</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{user?.location || "ไม่ได้ระบุตำแหน่ง"}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>เข้าร่วมเมื่อ {new Date(user?.created_at).toLocaleDateString("th-TH")}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="font-semibold">สถิติของฉัน</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600 mb-1" />
                    <span className="font-bold">{stats.bookingsCount}</span>
                    <span className="text-xs text-gray-500">การจอง</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <Star className="h-5 w-5 text-yellow-500 mb-1" />
                    <span className="font-bold">{stats.reviewsCount}</span>
                    <span className="text-xs text-gray-500">รีวิว</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg col-span-2">
                    <Heart className="h-5 w-5 text-red-500 mb-1" />
                    <span className="font-bold">{stats.favoritesCount}</span>
                    <span className="text-xs text-gray-500">รายการโปรด</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <Button variant="outline" className="w-full text-red-500" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                ออกจากระบบ
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ส่วนแสดงข้อมูลตาม Tab */}
        <div className="md:col-span-3">
          <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="profile" onClick={() => handleTabChange("profile")}>
                โปรไฟล์
              </TabsTrigger>
              <TabsTrigger value="bookings" onClick={() => handleTabChange("bookings")}>
                การจอง
              </TabsTrigger>
              <TabsTrigger value="favorites" onClick={() => handleTabChange("favorites")}>
                รายการโปรด
              </TabsTrigger>
              <TabsTrigger value="settings" onClick={() => handleTabChange("settings")}>
                ตั้งค่า
              </TabsTrigger>
            </TabsList>

            {/* แท็บโปรไฟล์ */}
            <TabsContent value="profile">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">ข้อมูลโปรไฟล์</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">ชื่อผู้ใช้</h3>
                      <p>{user?.username || "-"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">ชื่อ-นามสกุล</h3>
                      <p>{user?.full_name || "-"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">อีเมล</h3>
                      <p>{user?.email || "-"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">เบอร์โทรศัพท์</h3>
                      <p>{user?.phone || "-"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">ตำแหน่ง</h3>
                      <p>{user?.location || "-"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">วันที่สมัคร</h3>
                      <p>{new Date(user?.created_at).toLocaleDateString("th-TH")}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button onClick={() => setActiveTab("settings")} className="bg-green-600 hover:bg-green-700">
                      <Settings className="h-4 w-4 mr-2" />
                      แก้ไขโปรไฟล์
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* แท็บการจอง */}
            <TabsContent value="bookings">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">ประวัติการจองของฉัน</h2>

                  {bookingsLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  ) : bookings.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-500 mb-4">คลิกที่รายการจองเพื่อดูรายละเอียดเพิ่มเติม</p>
                      <div className="space-y-4">
                        {bookings.map((booking) => (
                          <Card key={booking.id} className="overflow-hidden">
                            <CardContent className="p-0">
                              {/* แก้ไขส่วนนี้ - แยกส่วนที่เป็น Link ออกจากกัน */}
                              <div
                                className="p-4 md:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                                onClick={() => navigateToBookingDetail(booking.id)}
                              >
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                                  <div>
                                    <h3 className="text-lg font-bold mb-1">{booking.campsite?.name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">
                                      {booking.campsite?.location}, {booking.campsite?.province}
                                    </p>
                                    <div className="flex items-center text-sm mb-2">
                                      <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                                      <span>
                                        {format(parseISO(booking.check_in_date), "PPP", { locale: th })} -
                                        {format(parseISO(booking.check_out_date), "PPP", { locale: th })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={getStatusColor(booking.status)}>
                                        {getStatusText(booking.status)}
                                      </Badge>
                                      <span className="text-sm">จำนวน {booking.guests} คน</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <p className="font-bold text-green-600 text-lg mb-2">
                                      {booking.total_price.toLocaleString()} บาท
                                    </p>
                                    <div className="flex gap-2">
                                      {/* แยก Link ออกมาเป็นปุ่มแยกต่างหาก */}
                                      <Link href={`/campsite/${booking.campsite_id}`}>
                                        <Button variant="outline" size="sm" className="text-sm">
                                          ดูสถานที่แคมป์
                                          <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                      </Link>
                                      {booking.status === "pending" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-red-500 text-red-500 hover:bg-red-50 text-sm"
                                          onClick={(e) => {
                                            e.stopPropagation() // ป้องกันการทำงานซ้ำซ้อน
                                            handleCancelBookingClick(booking)
                                          }}
                                        >
                                          ยกเลิกการจอง
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <h2 className="text-xl font-semibold mb-2">คุณยังไม่มีประวัติการจอง</h2>
                      <p className="text-gray-600 mb-6">ค้นหาสถานที่แคมป์และจองเลย</p>
                      <Link href="/search">
                        <Button className="bg-green-600 hover:bg-green-700">ค้นหาสถานที่แคมป์</Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* แท็บรายการโปรด */}
            <TabsContent value="favorites">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">รายการโปรดของฉัน</h2>

                  {favoritesLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    </div>
                  ) : favorites.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favorites.map((favorite) => (
                          <Card key={favorite.id} className="overflow-hidden">
                            <CardContent className="p-0">
                              {favorite.campsite_id && favorite.campsites ? (
                                <div className="relative">
                                  <div className="relative h-40 bg-gray-100">
                                    {favorite.campsites.images && favorite.campsites.images[0] ? (
                                      <Image
                                        src={favorite.campsites.images[0].image_url || "/lakeside-camp.png"}
                                        alt={favorite.campsites.name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <MapPin className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-4">
                                    <h3 className="font-medium mb-1">{favorite.campsites.name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{favorite.campsites.province}</p>
                                    <div className="flex justify-between items-center">
                                      <p className="font-bold text-green-600">
                                        ฿{favorite.campsites.price.toLocaleString()}
                                      </p>
                                      <div className="flex gap-2">
                                        <Link href={`/campsite/${favorite.campsite_id}`}>
                                          <Button variant="outline" size="sm" className="text-sm">
                                            ดูรายละเอียด
                                          </Button>
                                        </Link>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-500 border-red-500 hover:bg-red-50"
                                          onClick={() => handleRemoveFavorite(favorite.id)}
                                        >
                                          <Heart className="h-4 w-4 fill-current" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : favorite.equipment_id && favorite.equipment ? (
                                <div className="relative">
                                  <div className="relative h-40 bg-gray-100">
                                    {favorite.equipment.images && favorite.equipment.images[0] ? (
                                      <Image
                                        src={favorite.equipment.images[0].image_url || "/zenph-tent.png"}
                                        alt={favorite.equipment.name}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                        <Tag className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-4">
                                    <h3 className="font-medium mb-1">{favorite.equipment.name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{favorite.equipment.type}</p>
                                    <div className="flex justify-between items-center">
                                      <p className="font-bold text-green-600">
                                        ฿{favorite.equipment.price.toLocaleString()}
                                      </p>
                                      <div className="flex gap-2">
                                        <Link href={`/equipment/${favorite.equipment_id}`}>
                                          <Button variant="outline" size="sm" className="text-sm">
                                            ดูรายละเอียด
                                          </Button>
                                        </Link>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-red-500 border-red-500 hover:bg-red-50"
                                          onClick={() => handleRemoveFavorite(favorite.id)}
                                        >
                                          <Heart className="h-4 w-4 fill-current" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : favorite.equipment_id ? (
                                <div className="p-4">
                                  <h3 className="font-medium mb-1">อุปกรณ์แคมป์ปิ้ง</h3>
                                  <p className="text-sm text-gray-500 mb-2">ไม่พบข้อมูล</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-500 hover:bg-red-50"
                                    onClick={() => handleRemoveFavorite(favorite.id)}
                                  >
                                    <Heart className="h-4 w-4 fill-current mr-2" />
                                    นำออกจากรายการโปรด
                                  </Button>
                                </div>
                              ) : (
                                <div className="p-4">
                                  <h3 className="font-medium mb-1">ไม่พบข้อมูล</h3>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-500 hover:bg-red-50"
                                    onClick={() => handleRemoveFavorite(favorite.id)}
                                  >
                                    <Heart className="h-4 w-4 fill-current mr-2" />
                                    นำออกจากรายการโปรด
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                      <h2 className="text-xl font-semibold mb-2">คุณยังไม่มีรายการโปรด</h2>
                      <p className="text-gray-600 mb-6">เพิ่มสถานที่แคมป์หรืออุปกรณ์ที่คุณชื่นชอบในรายการโปรด</p>
                      <div className="flex justify-center gap-4">
                        <Link href="/search">
                          <Button className="bg-green-600 hover:bg-green-700">ค้นหาสถานที่แคมป์</Button>
                        </Link>
                        <Link href="/equipment">
                          <Button variant="outline">ดูอุปกรณ์แคมป์ปิ้ง</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* แท็บตั้งค่า */}
            <TabsContent value="settings">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-6">ตั้งค่าบัญชี</h2>

                  {message.text && (
                    <Alert
                      className={`mb-4 ${
                        message.type === "success"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : message.type === "warning"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="username">ชื่อผู้ใช้</Label>
                      <Input id="username" value={formData.username} onChange={handleInputChange} className="mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="fullName">ชื่อ-นามสกุล</Label>
                      <Input id="fullName" value={formData.fullName} onChange={handleInputChange} className="mt-1" />
                    </div>

                    <div>
                      <Label htmlFor="email">อีเมล</Label>
                      <Input id="email" value={user?.email} className="mt-1 bg-gray-50" disabled />
                      <p className="text-xs text-gray-500 mt-1">อีเมลไม่สามารถเปลี่ยนแปลงได้</p>
                    </div>

                    <div>
                      <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="เพิ่มเบอร์โทรศัพท์"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">ตำแหน่ง</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="เพิ่มตำแหน่งของคุณ"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">รูปโปรไฟล์</h3>
                      <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 mr-4 overflow-hidden">
                          {profileImageUrl ? (
                            <img
                              src={profileImageUrl || "/placeholder.svg"}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user?.username?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={handleProfileImageClick}>
                          <Upload className="h-4 w-4 mr-2" />
                          เปลี่ยน
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </div>
                    </div>

                    <Button className="bg-green-500 hover:bg-green-600" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                    </Button>
                  </div>

                  <div className="mt-10 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-6">เปลี่ยนรหัสผ่าน</h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
                        <Input id="current-password" type="password" className="mt-1" />
                      </div>

                      <div>
                        <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                        <Input id="new-password" type="password" className="mt-1" />
                      </div>

                      <div>
                        <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                        <Input id="confirm-password" type="password" className="mt-1" />
                      </div>

                      <Button className="bg-green-500 hover:bg-green-600">เปลี่ยนรหัสผ่าน</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog ยืนยันการยกเลิกการจอง */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การยกเลิกการจองที่ {bookingToCancel?.campsite?.name} ในวันที่{" "}
              {bookingToCancel?.check_in_date && format(parseISO(bookingToCancel.check_in_date), "PPP", { locale: th })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBookingConfirm}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600"
            >
              {isCancelling ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
