"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, MapPin } from "lucide-react"
import { toggleFavorite } from "@/lib/supabase/actions"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export function EquipmentCard({ equipment, isFavorite = false }) {
  const [isLoading, setIsLoading] = useState(false)
  const [favorite, setFavorite] = useState(isFavorite)
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // หาภาพหลักของอุปกรณ์
  const mainImage = equipment.images?.find((img) => img.is_main) || equipment.images?.[0]
  const imageUrl = mainImage?.image_url || "/lakeside-campout.png"

  // ไม่ต้องใช้ commentCount อีกต่อไป

  const handleToggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    setIsLoading(true)
    try {
      const { success, added, error } = await toggleFavorite("equipment", equipment.id)

      if (success) {
        setFavorite(added)
      } else if (error === "กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด") {
        router.push("/login?redirect=/equipment")
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

  return (
    <Link href={`/equipment/${equipment.id}`} className="block h-full">
      <Card
        className={`overflow-hidden border h-full flex flex-col transition-all duration-300 ${
          isHovered ? "shadow-lg transform -translate-y-1" : "hover:shadow-md"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative h-40 sm:h-48 md:h-52 lg:h-56 bg-gray-50">
          {/* แสดงสถานะสินค้า */}
          <div className="absolute top-0 left-0 z-10 p-1.5 sm:p-2 flex flex-col gap-1">
            {equipment.condition === "new" ? (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">มือ 1</Badge>
            ) : (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-xs">มือ 2</Badge>
            )}

            {equipment.discount > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-xs">ลด {equipment.discount}%</Badge>
            )}
          </div>

          {/* ปุ่มรายการโปรด */}
          <button
            onClick={handleToggleFavorite}
            disabled={isLoading}
            className={`absolute top-2 right-2 p-2 rounded-full shadow-sm z-10 transition-all flex items-center justify-center ${
              favorite ? "bg-red-500 text-white" : "bg-white/80 text-gray-500 hover:bg-white"
            }`}
            aria-label={favorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"}
          >
            <Heart className={`h-5 w-5 ${favorite ? "fill-current" : ""}`} />
          </button>

          {/* รูปภาพสินค้า */}
          <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-300">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={equipment.name}
              fill
              className={`object-contain transition-transform duration-300 ${isHovered ? "scale-105" : ""}`}
              sizes="(max-width: 768px) 100vw, 33vw"
              priority={false}
              loading="lazy"
            />
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          {/* ชื่อสินค้า */}
          <h3 className="font-medium mb-1 line-clamp-2 text-sm sm:text-base h-10 sm:h-12">{equipment.name}</h3>

          {/* ราคา */}
          <div className="flex items-center mb-2">
            <p className="text-green-600 font-bold text-lg sm:text-xl">฿{equipment.price.toLocaleString()}</p>
            {equipment.original_price && equipment.original_price > equipment.price && (
              <p className="text-gray-400 line-through text-xs ml-2">฿{equipment.original_price.toLocaleString()}</p>
            )}
          </div>

          {/* รายละเอียดสินค้า */}
          <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium truncate max-w-[60%]">ยี่ห้อ: {equipment.brand || "ไม่ระบุ"}</span>
              <span className="truncate">{equipment.type}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1 text-gray-500 flex-shrink-0" />
                <span className="truncate max-w-[80px]">{equipment.location || "ไม่ระบุ"}</span>
              </div>

              {/* แสดงจำนวนความคิดเห็น */}
              <div className="flex items-center text-gray-500 text-xs">
                <span>ID: {equipment.id.toString().slice(-4)}</span>
              </div>
            </div>
          </div>

          {/* ปุ่มดูรายละเอียด */}
          <Button
            className={`w-full bg-green-600 hover:bg-green-700 mt-auto text-xs sm:text-sm py-2 h-10 transition-all ${
              isHovered ? "bg-green-700" : ""
            }`}
          >
            ดูรายละเอียด
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
