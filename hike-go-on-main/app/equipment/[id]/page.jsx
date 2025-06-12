"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EquipmentCommentsSection } from "@/components/comments/equipment-comments-section"
import { createClient } from "@/lib/supabase/client"
import { toggleFavorite } from "@/lib/supabase/actions"
import { deleteEquipment } from "@/lib/actions/equipment-actions"
import {
  MapPin,
  Phone,
  Mail,
  Heart,
  Share2,
  Info,
  Loader2,
  Tag,
  Clock,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
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
import { formatNumber } from "@/lib/utils/format-utils"

export default function EquipmentPage({ params }) {
  const router = useRouter()
  const [equipment, setEquipment] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    // ตรวจสอบสถานะการล็อกอิน
    const checkLoginStatus = async () => {
      const supabase = await createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }

    checkLoginStatus()
    fetchEquipmentData()
  }, [params.id])

  // เพิ่ม useEffect สำหรับการจัดการข้อความคัดลอกสำเร็จ
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [copySuccess])

  const fetchEquipmentData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = await createClient()

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // ดึงข้อมูลอุปกรณ์
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", params.id)
        .single()

      if (equipmentError) {
        throw equipmentError
      }

      // ตรวจสอบว่าผู้ใช้เป็นเจ้าของอุปกรณ์หรือไม่
      if (session && equipmentData.seller_id === session.user.id) {
        setIsOwner(true)
      }

      // ดึงข้อมูลรูปภาพ
      const { data: imagesData, error: imagesError } = await supabase
        .from("equipment_images")
        .select("*")
        .eq("equipment_id", params.id)
        .order("is_main", { ascending: false })

      if (imagesError) {
        throw imagesError
      }

      // ตรวจสอบว่าผู้ใช้ได้เพิ่มอุปกรณ์นี้เป็นรายการโปรดหรือไม่
      if (session) {
        const { data: favoriteData } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("equipment_id", params.id)
          .maybeSingle()

        setIsFavorite(!!favoriteData)
      }

      setEquipment(equipmentData)
      setImages(imagesData || [])

      // ดึงข้อมูลผู้ขาย
      if (equipmentData.seller_id) {
        const { data: sellerData, error: sellerError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", equipmentData.seller_id)
          .single()

        if (!sellerError && sellerData) {
          setSellerInfo(sellerData)
        } else {
          console.error("Error fetching seller info:", sellerError)
          // ถ้าไม่พบข้อมูลในตาราง profiles ให้ลองดึงจากตาราง users
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", equipmentData.seller_id)
            .single()

          if (!userError && userData) {
            setSellerInfo(userData)
          } else {
            console.error("Error fetching user info:", userError)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching equipment data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    if (!isLoggedIn) {
      router.push(`/login?redirect=/equipment/${params.id}`)
      return
    }

    setToggleLoading(true)
    try {
      const { success, added, error } = await toggleFavorite("equipment", params.id)

      if (success) {
        setIsFavorite(added)
      } else if (error === "กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด") {
        router.push(`/login?redirect=/equipment/${params.id}`)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setToggleLoading(false)
    }
  }

  // แก้ไขฟังก์ชัน handleShare
  const handleShare = async () => {
    try {
      // ตรวจสอบว่าอยู่ใน secure context และ Web Share API สามารถใช้งานได้
      if (window.isSecureContext && navigator.share) {
        await navigator.share({
          title: equipment?.name,
          text: `ดูอุปกรณ์ ${equipment?.name} บน HikeGoon`,
          url: window.location.href,
        })
      } else {
        // ถ้าไม่สามารถใช้ Web Share API ได้ ให้คัดลอกลิงก์แทน
        await copyToClipboard()
      }
    } catch (error) {
      console.error("Error sharing:", error)
      // ถ้าเกิดข้อผิดพลาดในการแชร์ ให้คัดลอกลิงก์แทน
      await copyToClipboard()
    }
  }

  // เพิ่มฟังก์ชัน copyToClipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopySuccess(true)
    } catch (err) {
      console.error("Failed to copy: ", err)
      // ถ้าไม่สามารถใช้ Clipboard API ได้ ให้แสดง alert
      alert("คัดลอกลิงก์นี้: " + window.location.href)
    }
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const { success, error } = await deleteEquipment(params.id)

      if (error) {
        throw new Error(error)
      }

      if (success) {
        router.push("/profile/my-equipment")
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      alert(`ไม่สามารถลบอุปกรณ์ได้: ${error.message}`)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // เพิ่มฟังก์ชันสำหรับการเลื่อนรูปภาพ
  const scrollImages = (direction) => {
    if (scrollContainerRef.current) {
      const { current: container } = scrollContainerRef
      const scrollAmount = direction === "left" ? -200 : 200
      container.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  // เพิ่มฟังก์ชันสำหรับการเปลี่ยนรูปภาพในไลท์บ็อกซ์
  const changeImage = (direction) => {
    if (direction === "next") {
      setActiveImage((prev) => (prev + 1) % images.length)
    } else {
      setActiveImage((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: {error}</p>
        </div>
        <Button onClick={() => router.push("/equipment")} className="bg-green-600 hover:bg-green-700">
          กลับไปยังหน้าอุปกรณ์
        </Button>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>ไม่พบข้อมูลอุปกรณ์</p>
        </div>
        <Button onClick={() => router.push("/equipment")} className="bg-green-600 hover:bg-green-700">
          กลับไปยังหน้าอุปกรณ์
        </Button>
      </div>
    )
  }

  // หารูปภาพหลักของอุปกรณ์
  const mainImage = images.find((img) => img.is_main) || images[0]
  const imageUrl = mainImage?.image_url || "/lakeside-campout.png"

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* รูปภาพและข้อมูลหลัก */}
        <div className="lg:col-span-2">
          {/* รูปภาพหลัก */}
          <div className="relative h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden mb-2 group bg-white shadow-md">
            <div className="absolute inset-0 cursor-pointer overflow-hidden" onClick={() => setShowLightbox(true)}>
              <Image
                src={images[activeImage]?.image_url || imageUrl}
                alt={equipment.name}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                คลิกเพื่อขยาย
              </div>
            </div>

            {/* ปุ่มเลื่อนซ้าย-ขวา */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((prev) => (prev - 1 + images.length) % images.length)
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((prev) => (prev + 1) % images.length)
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* รูปภาพย่อย */}
          {images.length > 1 && (
            <div className="relative mb-4">
              <div
                ref={scrollContainerRef}
                className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative flex-shrink-0 h-16 sm:h-20 w-16 sm:w-20 rounded overflow-hidden cursor-pointer bg-white border-2 transition-all ${
                      activeImage === index ? "border-green-500 scale-105" : "border-transparent hover:border-green-200"
                    }`}
                    onClick={() => setActiveImage(index)}
                  >
                    <Image
                      src={image.image_url || "/placeholder.svg"}
                      alt={`รูปภาพ ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>

              {/* ปุ่มเลื่อนซ้าย-ขวาสำหรับรูปภาพย่อย */}
              {images.length > 5 && (
                <>
                  <button
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1 rounded-full shadow-md"
                    onClick={() => scrollImages("left")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-1 rounded-full shadow-md"
                    onClick={() => scrollImages("right")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ชื่อและรายละเอียดหลัก */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{equipment.name}</h1>

              {/* ปุ่มแก้ไขและลบสำหรับเจ้าของ */}
              {isOwner && (
                <div className="flex space-x-2">
                  <Link href={`/equipment/edit/${params.id}`}>
                    <Button variant="outline" size="sm" className="border-blue-500 text-blue-500 hover:bg-blue-50">
                      <Pencil className="h-4 w-4 mr-1" />
                      แก้ไข
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    ลบ
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-300">{equipment.type}</Badge>
              <Badge className={equipment.condition === "new" ? "bg-blue-500" : "bg-amber-500"}>
                {equipment.condition === "new" ? "มือ 1" : "มือ 2"}
              </Badge>
              {equipment.brand && <Badge className="bg-purple-500">{equipment.brand}</Badge>}
            </div>
            <p className="text-2xl font-bold text-green-600 mb-4">{formatNumber(equipment.price, "บาท")}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-1 ${
                    isFavorite ? "bg-red-50 text-red-500 border-red-200" : "text-gray-600"
                  }`}
                  onClick={handleToggleFavorite}
                  disabled={toggleLoading}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  {isFavorite ? "เพิ่มในรายการโปรดแล้ว" : "เพิ่มในรายการโปรด"}
                </Button>
              </div>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 text-gray-600"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  แชร์
                </Button>
                {copySuccess && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    คัดลอกลิงก์แล้ว!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* แท็บข้อมูล */}
          <Tabs defaultValue="details" className="mb-6">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="details">รายละเอียด</TabsTrigger>
              <TabsTrigger value="comments">ความคิดเห็น</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="bg-white p-4 rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">รายละเอียดอุปกรณ์</h2>
              <p className="text-gray-700 whitespace-pre-line mb-4">{equipment.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipment.location && (
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                    <span>{equipment.location}</span>
                  </div>
                )}
                {equipment.brand && (
                  <div className="flex items-center">
                    <Tag className="h-5 w-5 text-gray-500 mr-2" />
                    <span>แบรนด์: {equipment.brand}</span>
                  </div>
                )}
                {equipment.created_at && (
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-500 mr-2" />
                    <span>วันที่ลงประกาศ: {new Date(equipment.created_at).toLocaleDateString("th-TH")}</span>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="bg-white p-4 rounded-lg border">
              <EquipmentCommentsSection equipmentId={params.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* ส่วนข้อมูลติดต่อ */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg border sticky top-20">
            <h2 className="text-xl font-semibold mb-4">ข้อมูลติดต่อ</h2>

            {/* เพิ่มข้อมูลผู้ขาย */}
            <div className="mb-4 pb-4 border-b">
              <h3 className="font-medium mb-2">ลงขายโดย</h3>
              <div className="flex items-center">
                {sellerInfo?.avatar_url ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                    <Image
                      src={sellerInfo.avatar_url || "/placeholder.svg"}
                      alt={sellerInfo.username || sellerInfo.email || "ผู้ขาย"}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-gray-500 text-sm">
                      {(sellerInfo?.username || sellerInfo?.email || "ผู้ขาย").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium">{sellerInfo?.username || "ไม่ระบุชื่อ"}</p>
                  {sellerInfo?.email && <p className="text-sm text-gray-500">{sellerInfo.email}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {equipment.phone && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 mr-2" />
                  <span>{equipment.phone}</span>
                </div>
              )}
              {equipment.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-500 mr-2" />
                  <span>{equipment.email}</span>
                </div>
              )}
              {equipment.contactInfo && (
                <div>
                  <h3 className="font-medium mb-1">ข้อมูลติดต่อเพิ่มเติม:</h3>
                  <p className="text-gray-700">{equipment.contactInfo}</p>
                </div>
              )}
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700">ติดต่อผู้ขาย</Button>
          </div>
        </div>
      </div>

      {/* Lightbox สำหรับดูรูปภาพขนาดใหญ่ */}
      {showLightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10"
              onClick={() => setShowLightbox(false)}
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={images[activeImage]?.image_url || imageUrl}
                alt={equipment.name}
                fill
                className="object-contain"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeImage("prev")
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeImage("next")
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* ตัวเลขรูปภาพ */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {activeImage + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      {/* Dialog ยืนยันการลบ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบอุปกรณ์ "{equipment?.name}" จะไม่สามารถกู้คืนได้ ข้อมูลทั้งหมดรวมถึงรูปภาพและความคิดเห็นจะถูกลบออกจากระบบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
