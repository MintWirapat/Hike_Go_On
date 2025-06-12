"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CampsiteReviewsSection } from "@/components/reviews/campsite-reviews-section"
import { getSupabaseInstance } from "@/lib/supabase/client"
import { toggleFavorite, deleteCampsite } from "@/lib/supabase/actions"
import {
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Heart,
  Share2,
  Check,
  Info,
  Loader2,
  Pencil,
  Trash2,
  Users,
  Tag,
  RefreshCw,
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

export default function CampsitePage({ params }) {
  const router = useRouter()
  const [campsite, setCampsite] = useState(null)
  const [facilities, setFacilities] = useState([])
  const [rules, setRules] = useState([])
  const [zones, setZones] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeImage, setActiveImage] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0)
  const [lightboxImages, setLightboxImages] = useState([]) // เพิ่ม state สำหรับเก็บรูปภาพที่จะแสดงในไลท์บ็อกซ์
  const [showShareNotification, setShowShareNotification] = useState(false)
  const [debugInfo, setDebugInfo] = useState({}) // เพิ่ม state สำหรับเก็บข้อมูล debug
  const [refreshing, setRefreshing] = useState(false)

  // ฟังก์ชันสำหรับดึงข้อมูลแคมป์ไซต์
  const fetchCampsiteData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseInstance()
      console.log("Fetching campsite data for ID:", params.id)

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // ดึงข้อมูลสถานที่แคมป์
      const { data: campsiteData, error: campsiteError } = await supabase
        .from("campsites")
        .select("*")
        .eq("id", params.id)
        .single()

      if (campsiteError) {
        throw campsiteError
      }

      // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
      if (session && campsiteData.owner_id === session.user.id) {
        setIsOwner(true)
      }

      // ดึงข้อมูลรูปภาพ
      const { data: imagesData, error: imagesError } = await supabase
        .from("campsite_images")
        .select("*")
        .eq("campsite_id", params.id)
        .order("is_main", { ascending: false })

      if (imagesError) {
        throw imagesError
      }

      // ดึงข้อมูลสิ่งอำนวยความสะดวก - ใช้ RPC เพื่อหลีกเลี่ยงปัญหา caching
      console.log("Fetching facilities for campsite ID:", params.id)
      const { data: facilitiesData, error: facilitiesError } = await supabase.rpc("get_campsite_facilities", {
        campsite_id_param: params.id,
      })

      // ถ้า RPC ไม่ทำงาน ให้ใช้วิธีดึงข้อมูลแบบปกติ
      if (facilitiesError) {
        console.log("RPC failed, using regular query")
        const { data: regularFacilitiesData, error: regularFacilitiesError } = await supabase
          .from("campsite_facilities")
          .select("*")
          .eq("campsite_id", params.id)

        if (regularFacilitiesError) {
          console.error("Error fetching facilities:", regularFacilitiesError)
          throw regularFacilitiesError
        }

        console.log("Regular facilities query result:", regularFacilitiesData)
        setFacilities(regularFacilitiesData || [])
      } else {
        console.log("RPC facilities result:", facilitiesData)
        setFacilities(facilitiesData || [])
      }

      // ดึงข้อมูลกฎระเบียบ - ใช้ RPC เพื่อหลีกเลี่ยงปัญหา caching
      const { data: rulesData, error: rulesError } = await supabase.rpc("get_campsite_rules", {
        campsite_id_param: params.id,
      })

      // ถ้า RPC ไม่ทำงาน ให้ใช้วิธีดึงข้อมูลแบบปกติ
      if (rulesError) {
        console.log("RPC failed, using regular query for rules")
        const { data: regularRulesData, error: regularRulesError } = await supabase
          .from("campsite_rules")
          .select("*")
          .eq("campsite_id", params.id)

        if (regularRulesError) {
          console.error("Error fetching rules:", regularRulesError)
          throw regularRulesError
        }

        console.log("Regular rules query result:", regularRulesData)
        setRules(regularRulesData || [])
      } else {
        console.log("RPC rules result:", rulesData)
        setRules(rulesData || [])
      }

      // ดึงข้อมูลโซน
      const { data: zonesData, error: zonesError } = await supabase
        .from("campsite_zones")
        .select("*")
        .eq("campsite_id", params.id)

      if (zonesError) {
        throw zonesError
      }

      // ดึงรูปภาพของแต่ละโซน
      const zonesWithImages = await Promise.all(
        zonesData.map(async (zone) => {
          const { data: zoneImages, error: zoneImagesError } = await supabase
            .from("campsite_zone_images")
            .select("*")
            .eq("zone_id", zone.id)

          if (zoneImagesError) {
            console.error(`Error fetching images for zone ${zone.id}:`, zoneImagesError)
            return { ...zone, images: [] }
          }

          return { ...zone, images: zoneImages || [] }
        }),
      )

      // ตรวจสอบว่าผู้ใช้ได้เพิ่มสถานที่แคมป์นี้เป็นรายการโปรดหรือไม่
      if (session) {
        const { data: favoriteData } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("campsite_id", params.id)
          .maybeSingle()

        setIsFavorite(!!favoriteData)
      }

      setCampsite(campsiteData)
      setImages(imagesData || [])
      setZones(zonesWithImages || [])
      setLightboxImages(imagesData || []) // ตั้งค่ารูปภาพเริ่มต้นสำหรับไลท์บ็อกซ์

      // เก็บข้อมูล debug
      setDebugInfo({
        campsite: campsiteData,
        images: imagesData,
        facilities: facilitiesData || [],
        rules: rulesData || [],
        zones: zonesWithImages,
      })

      console.log("Campsite Data:", campsiteData)
      console.log("Images Data:", imagesData)
      console.log("Zones Data:", zonesData)
      console.log("Facilities Data:", facilitiesData || [])
      console.log("Rules Data:", rulesData || [])

      // ตรวจสอบ campsite_id ที่ใช้ในการดึงข้อมูล
      console.log("Campsite ID used for queries:", params.id)
      console.log("Campsite ID type:", typeof params.id)

      // ตรวจสอบโครงสร้างตาราง campsite_facilities
      try {
        const { data: tableInfo } = await supabase.from("campsite_facilities").select("*").limit(1)
        console.log("Campsite facilities table structure sample:", tableInfo)
      } catch (e) {
        console.error("Error checking table structure:", e)
      }
    } catch (error) {
      console.error("Error fetching campsite data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ดึงข้อมูลหลักของแคมป์ไซต์
  useEffect(() => {
    fetchCampsiteData()
  }, [params.id])

  // เพิ่ม useEffect เพื่อตรวจสอบข้อมูลหลังจากที่ state ถูกอัปเดต
  useEffect(() => {
    console.log("Current facilities state:", facilities)
    console.log("Current rules state:", rules)
  }, [facilities, rules])

  // ฟังก์ชันสำหรับรีเฟรชข้อมูล
  const handleRefresh = () => {
    setRefreshing(true)
    fetchCampsiteData()
  }

  const handleToggleFavorite = async () => {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push(`/login?redirect=/campsite/${params.id}`)
      return
    }

    setToggleLoading(true)
    try {
      const { success, added, error } = await toggleFavorite("campsite", params.id)

      if (success) {
        setIsFavorite(added)
      } else if (error === "กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด") {
        router.push(`/login?redirect=/campsite/${params.id}`)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    } finally {
      setToggleLoading(false)
    }
  }

  const handleShare = () => {
    // ตรวจสอบว่า Web Share API สามารถใช้งานได้หรือไม่
    if (navigator.share && window.isSecureContext) {
      try {
        navigator
          .share({
            title: campsite?.name,
            text: `ดูสถานที่แคมป์ ${campsite?.name} บน HikeGoon`,
            url: window.location.href,
          })
          .catch((err) => {
            console.error("Error sharing:", err)
            // หากเกิดข้อผิดพลาดในการแชร์ ให้ใช้วิธีคัดลอกลิงก์แทน
            copyToClipboard()
          })
      } catch (err) {
        console.error("Share API error:", err)
        copyToClipboard()
      }
    } else {
      // ถ้า Web Share API ไม่สามารถใช้งานได้ ให้ใช้วิธีคัดลอกลิงก์แทน
      copyToClipboard()
    }
  }

  // เพิ่มฟังก์ชันใหม่สำหรับคัดลอกลิงก์
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setShowShareNotification(true)
        setTimeout(() => setShowShareNotification(false), 3000)
      })
      .catch((err) => {
        console.error("Error copying to clipboard:", err)
        // ถ้าไม่สามารถใช้ clipboard API ได้ ให้แสดงข้อความให้ผู้ใช้คัดลอกเอง
        alert(`กรุณาคัดลอกลิงก์นี้: ${window.location.href}`)
      })
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      const { success, error } = await deleteCampsite(params.id)

      if (error) {
        throw new Error(error)
      }

      if (success) {
        router.push("/profile/my-campsites")
      }
    } catch (error) {
      console.error("Error deleting campsite:", error)
      alert(`ไม่สามารถลบสถานที่แคมป์ได้: ${error.message}`)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // ฟังก์ชันสำหรับแสดงรูปภาพของโซนในไลท์บ็อกซ์
  const handleZoneImageClick = (image) => {
    // ตั้งค่า lightboxImages เป็นรูปภาพเดียว (รูปของโซนที่คลิก)
    setLightboxImages([image])
    setLightboxImageIndex(0)
    setLightboxOpen(true)
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
        <Button onClick={() => router.push("/search")} className="bg-green-600 hover:bg-green-700">
          กลับไปยังหน้าค้นหา
        </Button>
      </div>
    )
  }

  if (!campsite) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md mb-6 flex items-start">
          <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>ไม่พบข้อมูลสถานที่แคมป์</p>
        </div>
        <Button onClick={() => router.push("/search")} className="bg-green-600 hover:bg-green-700">
          กลับไปยังหน้าค้นหา
        </Button>
      </div>
    )
  }

  // หารูปภาพหลักของสถานที่แคมป์
  const mainImage = images.find((img) => img.is_main) || images[0]
  const imageUrl = mainImage?.image_url || "/mountain-vista-camp.png"

  // แปลงประเภทราคาเป็นข้อความภาษาไทย
  const getPriceTypeText = (priceType) => {
    switch (priceType) {
      case "perNight":
        return "ต่อคืน"
      case "perPerson":
        return "ต่อคน"
      default:
        return "ต่อคืน"
    }
  }

  // เพิ่มฟังก์ชันสำหรับการเปลี่ยนรูปภาพในไลท์บ็อกซ์
  const changeLightboxImage = (direction) => {
    if (direction === "next") {
      setLightboxImageIndex((prev) => (prev + 1) % lightboxImages.length)
    } else {
      setLightboxImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length)
    }
  }

  // แปลงชื่อสิ่งอำนวยความสะดวกเป็นข้อความที่อ่านง่าย
  const getFacilityDisplayName = (facilityName) => {
    const facilityNameMapping = {
      cleanToilet: "ห้องน้ำสะอาด",
      tapWater: "น้ำประปา",
      water: "น้ำประปา",
      waterfall: "น้ำตกใกล้เคียง",
      campfire: "กิจกรรมแคมป์ไฟ",
      bbq: "บาร์บีคิวกริลล์",
      viewpoint: "จุดชมวิว",
      wifi: "WiFi",
      outlet: "จุดปลั๊ก",
      drinks: "ขายเครื่องดื่ม",
      parking: "ที่จอดรถ",
      drinkingWater: "น้ำดื่ม",
      shop: "ร้านค้า",
      breakfast: "อาหารเช้า",
      shower: "ห้องอาบน้ำ",
      restaurant: "ร้านอาหาร",
      laundry: "บริการซักรีด",
      playground: "สนามเด็กเล่น",
      petFriendly: "เป็นมิตรกับสัตว์เลี้ยง",
      security: "ระบบรักษาความปลอดภัย",
      firstAid: "ชุดปฐมพยาบาล",
      hiking: "เส้นทางเดินป่า",
      fishing: "จุดตกปลา",
      swimming: "สระว่ายน้ำ",
      biking: "เส้นทางปั่นจักรยาน",
      boating: "กิจกรรมพายเรือ",
      firepit: "จุดก่อไฟ",
      picnicArea: "พื้นที่ปิกนิก",
      grillArea: "พื้นที่ย่างบาร์บีคิว",
    }

    return facilityNameMapping[facilityName] || facilityName
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Debug Info - แสดงเฉพาะในโหมด development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <p>Facilities Count: {facilities?.length || 0}</p>
          <p>Rules Count: {rules?.length || 0}</p>
          <p>Campsite ID: {params.id}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
          </Button>
          <details>
            <summary className="cursor-pointer text-blue-500">Show Raw Facilities Data</summary>
            <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(facilities, null, 2)}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-blue-500">Show Raw Rules Data</summary>
            <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(rules, null, 2)}
            </pre>
          </details>
          <details>
            <summary className="cursor-pointer text-blue-500">Show All Raw Data</summary>
            <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* รูปภาพและข้อมูลหลัก */}
        <div className="lg:col-span-2">
          {/* รูปภาพหลัก */}
          <div
            className="relative h-72 sm:h-96 md:h-[500px] rounded-xl overflow-hidden mb-3 shadow-md group cursor-pointer"
            onClick={() => {
              setLightboxImages(images) // ตั้งค่ารูปภาพสำหรับไลท์บ็อกซ์เป็นรูปภาพของแคมป์
              setLightboxImageIndex(activeImage)
              setLightboxOpen(true)
            }}
          >
            <Image
              src={images[activeImage]?.image_url || imageUrl}
              alt={campsite.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="รูปภาพก่อนหน้า"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="รูปภาพถัดไป"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-16 pointer-events-none"></div>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              คลิกเพื่อขยาย
            </div>
          </div>

          {/* รูปภาพย่อย */}
          {images.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`relative h-20 w-28 flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                    activeImage === index
                      ? "ring-3 ring-green-500 scale-105"
                      : "ring-1 ring-gray-200 hover:ring-green-300 opacity-80 hover:opacity-100"
                  }`}
                  onClick={() => setActiveImage(index)}
                >
                  <Image
                    src={image.image_url || "/placeholder.svg"}
                    alt={`รูปภาพ ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ชื่อและรายละเอียดหลัก */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{campsite.name}</h1>
            </div>

            {/* ปุ่มแก้ไขและลบสำหรับเจ้าของ */}
            {isOwner && (
              <div className="flex space-x-2 mt-2">
                <Link href={`/campsite/edit/${params.id}`}>
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

          <div className="flex items-center text-gray-600 mb-2">
            <MapPin className="h-4 w-4 mr-1" />
            <span>
              {campsite.location}, {campsite.province}
            </span>
          </div>
          <div className="flex items-center mb-4">
            <p className="text-2xl font-bold text-green-600 mr-2">{campsite.price} บาท</p>
            <span className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded-md text-sm">
              <Tag className="h-3.5 w-3.5 mr-1" />
              {getPriceTypeText(campsite.price_type)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
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
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-gray-600 relative"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              แชร์
              {showShareNotification && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                  คัดลอกลิงก์แล้ว!
                </div>
              )}
            </Button>
          </div>

          {/* แท็บข้อมูล */}
          <Tabs defaultValue="details" className="mb-6 campsite-tabs">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="details">รายละเอียด</TabsTrigger>
              <TabsTrigger value="zones">โซน</TabsTrigger>
              <TabsTrigger value="facilities">สิ่งอำนวยความสะดวก</TabsTrigger>
              <TabsTrigger value="rules">กฎระเบียบ</TabsTrigger>
              <TabsTrigger value="reviews">รีวิว</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="bg-white p-4 rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">รายละเอียดสถานที่แคมป์</h2>
              <p className="text-gray-700 whitespace-pre-line mb-4">{campsite.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campsite.phone && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-500 mr-2" />
                    <span>{campsite.phone}</span>
                  </div>
                )}
                {campsite.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-500 mr-2" />
                    <span>{campsite.email}</span>
                  </div>
                )}
                {campsite.website && (
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-gray-500 mr-2" />
                    <a
                      href={campsite.website.startsWith("http") ? campsite.website : `https://${campsite.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {campsite.website}
                    </a>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="zones" className="bg-white p-4 rounded-lg border">
              <h2 className="text-lg font-semibold mb-3">โซนแคมป์ปิ้ง</h2>
              {zones.length > 0 ? (
                <div className="space-y-6">
                  {zones.map((zone) => (
                    <div key={zone.id} className="border rounded-lg p-4">
                      <h3 className="font-medium text-lg mb-2">{zone.name}</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {zone.width && zone.length && (
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">ขนาด:</span>
                            {zone.width} x {zone.length} เมตร
                          </div>
                        )}

                        {zone.capacity && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="font-medium mr-2">รองรับ:</span>
                            {zone.capacity} คน
                          </div>
                        )}
                      </div>

                      {zone.description && (
                        <div className="mb-3">
                          <p className="text-gray-700">{zone.description}</p>
                        </div>
                      )}

                      {zone.images && zone.images.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-600 mb-2">รูปภาพของโซน</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {zone.images.map((image, idx) => (
                              <div
                                key={image.id}
                                className="relative h-24 sm:h-28 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                onClick={() => handleZoneImageClick(image)}
                              >
                                <Image
                                  src={image.image_url || "/placeholder.svg"}
                                  alt={`รูปภาพของ ${zone.name}`}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-1 text-xs text-white bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                  คลิกเพื่อขยาย
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">ไม่มีข้อมูลโซนแคมป์ปิ้ง</p>
              )}
            </TabsContent>

            <TabsContent value="facilities" className="bg-white p-4 rounded-lg border">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">สิ่งอำนวยความสะดวก</h2>
                <p className="text-sm text-gray-500">จำนวนสิ่งอำนวยความสะดวกทั้งหมด: {facilities?.length || 0}</p>
              </div>

              {/* แสดงข้อมูลดิบเพื่อการตรวจสอบ */}
              <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
                <details>
                  <summary className="cursor-pointer text-blue-500 text-sm">แสดงข้อมูลดิบสิ่งอำนวยความสะดวก</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(facilities, null, 2)}
                  </pre>
                </details>
              </div>

              {facilities && facilities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {facilities.map((facility, index) => (
                    <div key={facility.id || `facility-${index}`} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span>{facility.label || getFacilityDisplayName(facility.name)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-gray-600 mb-2 flex items-center">
                    <Info className="h-4 w-4 text-gray-400 mr-2" />
                    ไม่มีข้อมูลสิ่งอำนวยความสะดวก
                  </p>
                  {isOwner && (
                    <p className="text-sm text-gray-500">คุณสามารถเพิ่มข้อมูลสิ่งอำนวยความสะดวกได้โดยการแก้ไขข้อมูลแคมป์ไซต์</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rules" className="bg-white p-4 rounded-lg border">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">กฎระเบียบ</h2>
              </div>

              {rules && rules.length > 0 ? (
                <ul className="space-y-2">
                  {rules.map((rule, index) => (
                    <li key={rule.id || `rule-${index}`} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span>{typeof rule === "string" ? rule : rule.rule}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-gray-600 mb-2 flex items-center">
                    <Info className="h-4 w-4 text-gray-400 mr-2" />
                    ไม่มีข้อมูลกฎระเบียบ
                  </p>
                  {isOwner && <p className="text-sm text-gray-500">คุณสามารถเพิ่มข้อมูลกฎระเบียบได้โดยการแก้ไขข้อมูลแคมป์ไซต์</p>}
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="bg-white p-4 rounded-lg border">
              <CampsiteReviewsSection campsiteId={params.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* ส่วนการจอง */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-lg border sticky top-20">
            <h2 className="text-xl font-semibold mb-4">จองสถานที่แคมป์</h2>
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <span>เลือกวันที่ต้องการเข้าพัก</span>
            </div>
            <Link href={`/campsite/${params.id}/booking`}>
              <Button className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg">จองเลย</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dialog ยืนยันการลบ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบสถานที่แคมป์ "{campsite?.name}" จะไม่สามารถกู้คืนได้ ข้อมูลทั้งหมดรวมถึงรูปภาพและรีวิวจะถูกลบออกจากระบบ
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

      {/* Lightbox สำหรับดูรูปภาพขนาดใหญ่ */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full z-10"
              onClick={() => setLightboxOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={lightboxImages[lightboxImageIndex]?.image_url || imageUrl}
                alt={campsite.name}
                fill
                className="object-contain"
              />
            </div>

            {lightboxImages.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeLightboxImage("prev")
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeLightboxImage("next")
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* ตัวเลขรูปภาพ */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {lightboxImageIndex + 1} / {lightboxImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
