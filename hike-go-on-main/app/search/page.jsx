"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { CampsiteCard } from "@/components/campsites/campsite-card"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, SlidersHorizontal, X, MapPin, Calendar, Tag } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { debounce } from "lodash"
import { formatPrice } from "@/lib/utils/format-utils"

export default function SearchPage() {
  const searchParams = useSearchParams()

  // ดึงค่า query parameters
  const initialQuery = searchParams.get("q") || ""
  const initialProvince = searchParams.get("province") || ""
  const initialMaxPrice = searchParams.get("maxPrice") || ""
  const initialSort = searchParams.get("sort") || ""

  // State สำหรับตัวกรอง
  const [filters, setFilters] = useState({
    query: initialQuery,
    province: initialProvince,
    maxPrice: initialMaxPrice,
    sort: initialSort,
  })

  // State สำหรับข้อมูล
  const [campsites, setCampsites] = useState([])
  const [provinces, setProvinces] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState(0)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // ฟังก์ชันอัพเดท URL parameters
  const updateUrlParams = useCallback(
    debounce((newFilters) => {
      const params = new URLSearchParams()
      if (newFilters.query) params.set("q", newFilters.query)
      if (newFilters.province) params.set("province", newFilters.province)
      if (newFilters.maxPrice) params.set("maxPrice", newFilters.maxPrice)
      if (newFilters.sort) params.set("sort", newFilters.sort)

      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
      window.history.replaceState({}, "", newUrl)
    }, 500),
    [],
  )

  // ฟังก์ชันอัพเดทตัวกรอง
  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    updateUrlParams(newFilters)
  }

  // ฟังก์ชันล้างตัวกรอง
  const clearFilters = () => {
    const defaultFilters = {
      query: "",
      province: "",
      maxPrice: "",
      sort: "",
    }
    setFilters(defaultFilters)
    updateUrlParams(defaultFilters)
  }

  // ดึงข้อมูลเมื่อตัวกรองเปลี่ยน
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = await createClient()

        // ดึงข้อมูลผู้ใช้ที่เข้าสู่ระบบ (ถ้ามี)
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // ดึงข้อมูลรายการโปรดของผู้ใช้ (ถ้าเข้าสู่ระบบแล้ว)
        let favs = []
        if (session) {
          const { data: favoritesData } = await supabase
            .from("favorites")
            .select("campsite_id")
            .eq("user_id", session.user.id)
            .not("campsite_id", "is", null)

          favs = favoritesData?.map((fav) => fav.campsite_id) || []
          setFavorites(favs)
        }

        // ดึงข้อมูลสถานที่แคมป์
        let queryBuilder = supabase.from("campsites").select(`
          *,
          images:campsite_images(*)
        `)

        // กรองตามคำค้นหา
        if (filters.query) {
          queryBuilder = queryBuilder.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
        }

        // กรองตามจังหวัด
        if (filters.province && filters.province !== "" && filters.province !== "all") {
          queryBuilder = queryBuilder.eq("province", filters.province)
        }

        // กรองตามราคา
        if (filters.maxPrice && filters.maxPrice !== "") {
          queryBuilder = queryBuilder.lte("price", filters.maxPrice)
        }

        // เรียงลำดับ
        if (filters.sort === "price-asc") {
          queryBuilder = queryBuilder.order("price", { ascending: true })
        } else if (filters.sort === "price-desc") {
          queryBuilder = queryBuilder.order("price", { ascending: false })
        } else {
          // ถ้าไม่มีการเรียงลำดับที่เลือก ให้เรียงตามวันที่สร้างล่าสุด
          queryBuilder = queryBuilder.order("created_at", { ascending: false })
        }

        const { data: campsitesData, error } = await queryBuilder

        if (error) {
          console.error("Error fetching campsites:", error)
        } else {
          setCampsites(campsitesData || [])
        }

        // ดึงข้อมูลจังหวัดทั้งหมด (ถ้ายังไม่มี)
        if (provinces.length === 0) {
          const { data: provincesData } = await supabase.from("campsites").select("province").order("province")
          const uniqueProvinces = [...new Set(provincesData?.map((item) => item.province))].filter(Boolean)
          setProvinces(uniqueProvinces)
        }

        // นับจำนวนตัวกรองที่ใช้งาน
        let filterCount = 0
        if (filters.query) filterCount++
        if (filters.province) filterCount++
        if (filters.maxPrice) filterCount++
        if (filters.sort) filterCount++
        setActiveFilters(filterCount)
      } catch (error) {
        console.error("Error in fetchData:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters, provinces.length])

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">ค้นหาสถานที่แคมป์</h1>

      {/* ส่วนตัวกรอง */}
      <Card className="mb-6 md:mb-8 border shadow-sm overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-green-600" />
              <h2 className="font-medium text-lg">ตัวกรอง</h2>
              {activeFilters > 0 && <Badge className="bg-green-600 hover:bg-green-700">{activeFilters}</Badge>}
            </div>

            {activeFilters > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-sm flex items-center gap-1 text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
                ล้างตัวกรอง
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* ช่องค้นหา */}
            <div className="space-y-2">
              <Label htmlFor="search" className="flex items-center gap-2 text-gray-700">
                <Search className="h-4 w-4 text-gray-500" />
                ค้นหา
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="ค้นหาตามชื่อหรือคำอธิบาย"
                  className="pl-8 bg-white border-gray-200 focus:border-green-500 focus:ring-green-500"
                  value={filters.query}
                  onChange={(e) => updateFilter("query", e.target.value)}
                />
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                {filters.query && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => updateFilter("query", "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* จังหวัด */}
            <div className="space-y-2">
              <Label htmlFor="province" className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4 text-gray-500" />
                จังหวัด
              </Label>
              <Select value={filters.province} onValueChange={(value) => updateFilter("province", value)}>
                <SelectTrigger className="bg-white border-gray-200 focus:ring-green-500">
                  <SelectValue placeholder="ทุกจังหวัด" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md max-h-[300px]">
                  <SelectItem value="all">ทุกจังหวัด</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ราคา */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Tag className="h-4 w-4 text-gray-500" />
                  ราคาสูงสุด
                </Label>
                <span className="text-green-600 font-medium">{formatPrice(Number(filters.maxPrice) || 0)}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Slider
                  min={0}
                  max={10000}
                  step={50}
                  value={[Number.parseInt(filters.maxPrice) || 0]}
                  onValueChange={(value) => updateFilter("maxPrice", value[0].toString())}
                  className="flex-1"
                  style={{
                    "--slider-track-background": "#e2e8f0",
                    "--slider-range-background": "#16a34a",
                    "--slider-thumb-background": "#ffffff",
                    "--slider-thumb-border": "2px solid #16a34a",
                  }}
                />
                <Input
                  type="number"
                  min="0"
                  max="10000"
                  step="50"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  className="w-24 text-right"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 ฿</span>
                <span>10,000 ฿</span>
              </div>
            </div>

            {/* เรียงลำดับ */}
            <div className="space-y-2">
              <Label htmlFor="sort" className="flex items-center gap-2 text-gray-700">
                <Calendar className="h-4 w-4 text-gray-500" />
                เรียงลำดับ
              </Label>
              <Select value={filters.sort} onValueChange={(value) => updateFilter("sort", value)}>
                <SelectTrigger className="bg-white border-gray-200 focus:ring-green-500">
                  <SelectValue placeholder="เรียงลำดับ" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  <SelectItem value="newest">ล่าสุด</SelectItem>
                  <SelectItem value="price-asc">ราคา: ต่ำ-สูง</SelectItem>
                  <SelectItem value="price-desc">ราคา: สูง-ต่ำ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* แสดงตัวกรองที่เลือก */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.query && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>ค้นหา: {filters.query}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("query", "")} />
                </Badge>
              )}

              {filters.province && filters.province !== "" && filters.province !== "all" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>จังหวัด: {filters.province}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("province", "")} />
                </Badge>
              )}

              {filters.maxPrice && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>ราคาสูงสุด: {formatPrice(Number(filters.maxPrice) || 0)}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("maxPrice", "")} />
                </Badge>
              )}

              {filters.sort && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>เรียงตาม: {filters.sort === "price-asc" ? "ราคาต่ำ-สูง" : "ราคาสูง-ต่ำ"}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("sort", "")} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ผลลัพธ์การค้นหา */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-600">
          พบ <span className="font-medium">{loading ? "..." : campsites.length}</span> รายการ
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {loading ? (
          // แสดง Skeleton loading
          Array(6)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 h-40 rounded-t-lg"></div>
                <div className="bg-white p-4 rounded-b-lg border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ))
        ) : campsites.length > 0 ? (
          campsites.map((campsite) => (
            <CampsiteCard key={campsite.id} campsite={campsite} isFavorite={favorites.includes(campsite.id)} />
          ))
        ) : (
          <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-xl text-gray-500 mb-2">ไม่พบสถานที่แคมป์ที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-gray-400 mb-4">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</p>
            <Button className="bg-green-600 hover:bg-green-700" onClick={clearFilters}>
              ล้างตัวกรอง
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
