"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Tag } from "lucide-react"
import { toggleFavorite } from "@/lib/supabase/actions"
import { useRouter } from "next/navigation"
import { formatPrice } from "@/lib/utils/format-utils"

export function CampsiteCard({ campsite, isFavorite = false }) {
  const [isLoading, setIsLoading] = useState(false)
  const [favorite, setFavorite] = useState(isFavorite)
  const router = useRouter()

  // หาภาพหลักของสถานที่แคมป์
  const mainImage = campsite.images?.find((img) => img.is_main) || campsite.images?.[0]
  const imageUrl = mainImage?.image_url || "/lakeside-camp.png"

  const handleToggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const { success, added, error } = await toggleFavorite("campsite", campsite.id)

      if (success) {
        setFavorite(added)
      } else if (error === "กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด") {
        router.push("/login?redirect=/search")
      } else if (error) {
        console.error("Error toggling favorite:", error)
        alert(`ไม่สามารถเพิ่ม/ลบรายการโปรดได้: ${error}`)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
      alert("เกิดข้อผิดพลาดในการเพิ่ม/ลบรายการโปรด")
    } finally {
      setIsLoading(false)
    }
  }

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

  // ปรับปรุงการแสดงรูปภาพในการ์ดสถานที่แคมป์
  return (
    <Link href={`/campsite/${campsite.id}`} className="block h-full">
      <Card className="overflow-hidden h-full hover:shadow-md transition-shadow duration-200">
        <div className="relative h-36 sm:h-40 md:h-48 bg-gray-100">
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={campsite.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
            loading="lazy"
          />
          <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`absolute top-2 right-2 p-2 rounded-full shadow-sm flex items-center justify-center ${
              favorite ? "bg-red-500 text-white" : "bg-white text-gray-500"
            }`}
          >
            <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
          </button>
        </div>
        <CardContent className="p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-bold mb-1 line-clamp-2">{campsite.name}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">{campsite.province}</p>
          <p className="text-gray-700 mb-2 sm:mb-3 text-xs sm:text-sm line-clamp-2">{campsite.description}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <p className="font-semibold text-green-700 text-sm sm:text-base mr-2">{formatPrice(campsite.price)}</p>
              <span className="flex items-center text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                <Tag className="h-3 w-3 mr-0.5" />
                {getPriceTypeText(campsite.price_type)}
              </span>
            </div>
            <Button
              variant="outline"
              className="text-green-700 border-green-700 hover:bg-green-50 text-xs sm:text-sm py-1 h-8"
            >
              ดูรายละเอียด
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
