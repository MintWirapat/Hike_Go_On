"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { EquipmentCard } from "@/components/equipment/equipment-card"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client"
import { Search, SlidersHorizontal, X, Tag, Package, Briefcase, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MobileFilterDrawer } from "@/components/mobile/mobile-filter-drawer"
import { debounce } from "lodash"

export default function EquipmentPage() {
  const searchParams = useSearchParams()

  // ดึงค่า query parameters
  const initialQuery = searchParams.get("q") || ""
  const initialType = searchParams.get("type") || ""
  const initialMaxPrice = searchParams.get("maxPrice") || ""
  const initialBrand = searchParams.get("brand") || ""
  const initialCondition = searchParams.get("condition") || ""
  const initialSort = searchParams.get("sort") || ""

  // State สำหรับตัวกรอง
  const [filters, setFilters] = useState({
    query: initialQuery,
    type: initialType,
    maxPrice: initialMaxPrice,
    brand: initialBrand,
    condition: initialCondition,
    sort: initialSort,
  })

  // State สำหรับข้อมูล
  const [equipment, setEquipment] = useState([])
  const [types, setTypes] = useState([])
  const [brands, setBrands] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState(0)
  const [showMobileFilter, setShowMobileFilter] = useState(false)

  // ฟังก์ชันอัพเดท URL parameters
  const updateUrlParams = useCallback(
    debounce((newFilters) => {
      const params = new URLSearchParams()
      if (newFilters.query) params.set("q", newFilters.query)
      if (newFilters.type) params.set("type", newFilters.type)
      if (newFilters.maxPrice) params.set("maxPrice", newFilters.maxPrice)
      if (newFilters.brand) params.set("brand", newFilters.brand)
      if (newFilters.condition) params.set("condition", newFilters.condition)
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
      type: "",
      maxPrice: "",
      brand: "",
      condition: "",
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
            .select("equipment_id")
            .eq("user_id", session.user.id)
            .not("equipment_id", "is", null)

          favs = favoritesData?.map((fav) => fav.equipment_id) || []
          setFavorites(favs)
        }

        // ดึงข้อมูลอุปกรณ์แคมป์ปิ้ง
        let queryBuilder = supabase.from("equipment").select(`
          *,
          images:equipment_images(*),
          comment_count:equipment_comments(count)
        `)

        // กรองตามคำค้นหา
        if (filters.query) {
          queryBuilder = queryBuilder.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
        }

        // กรองตามประเภท
        if (filters.type && filters.type !== "" && filters.type !== "all") {
          queryBuilder = queryBuilder.eq("type", filters.type)
        }

        // กรองตามราคา
        if (filters.maxPrice && filters.maxPrice !== "") {
          queryBuilder = queryBuilder.lte("price", filters.maxPrice)
        }

        // กรองตามยี่ห้อ
        if (filters.brand && filters.brand !== "" && filters.brand !== "all") {
          queryBuilder = queryBuilder.eq("brand", filters.brand)
        }

        // กรองตามสภาพ
        if (filters.condition && filters.condition !== "" && filters.condition !== "all") {
          queryBuilder = queryBuilder.eq("condition", filters.condition)
        }

        // เรียงลำดับ
        if (filters.sort === "price-asc") {
          queryBuilder = queryBuilder.order("price", { ascending: true })
        } else if (filters.sort === "price-desc") {
          queryBuilder = queryBuilder.order("price", { ascending: false })
        } else if (filters.sort === "popular") {
          queryBuilder = queryBuilder
            .order("comment_count", { ascending: false })
            .order("created_at", { ascending: false })
        } else {
          // ถ้าไม่มีการเรียงลำดับที่เลือก ให้เรียงตามวันที่สร้างล่าสุด
          queryBuilder = queryBuilder.order("created_at", { ascending: false })
        }

        const { data: equipmentData, error } = await queryBuilder

        if (error) {
          console.error("Error fetching equipment:", error)
        } else {
          // แปลงข้อมูล comment_count จาก array เป็นตัวเลข
          const processedData =
            equipmentData?.map((item) => ({
              ...item,
              comment_count: item.comment_count?.[0]?.count || 0,
            })) || []
          setEquipment(processedData)
        }

        // ดึงข้อมูลประเภทและยี่ห้อ (ถ้ายังไม่มี)
        if (types.length === 0) {
          const { data: typesData } = await supabase.from("equipment").select("type").order("type")
          const uniqueTypes = [...new Set(typesData?.map((item) => item.type))].filter(Boolean)
          setTypes(uniqueTypes)
        }

        if (brands.length === 0) {
          const { data: brandsData } = await supabase.from("equipment").select("brand").order("brand")
          const uniqueBrands = [...new Set(brandsData?.map((item) => item.brand))].filter(Boolean)
          setBrands(uniqueBrands)
        }

        // นับจำนวนตัวกรองที่ใช้งาน
        let filterCount = 0
        if (filters.query) filterCount++
        if (filters.type) filterCount++
        if (filters.brand) filterCount++
        if (filters.condition) filterCount++
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
  }, [filters, types.length, brands.length])

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">อุปกรณ์แคมป์ปิ้งทั้งหมด</h1>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

            {/* ประเภท */}
            <div className="space-y-2">
              <Label htmlFor="type" className="flex items-center gap-2 text-gray-700">
                <Package className="h-4 w-4 text-gray-500" />
                ประเภท
              </Label>
              <Select value={filters.type} onValueChange={(value) => updateFilter("type", value)}>
                <SelectTrigger className="bg-white border-gray-200 focus:ring-green-500">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md max-h-[300px]">
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ยี่ห้อ */}
            <div className="space-y-2">
              <Label htmlFor="brand" className="flex items-center gap-2 text-gray-700">
                <Briefcase className="h-4 w-4 text-gray-500" />
                ยี่ห้อ
              </Label>
              <Select value={filters.brand} onValueChange={(value) => updateFilter("brand", value)}>
                <SelectTrigger className="bg-white border-gray-200 focus:ring-green-500">
                  <SelectValue placeholder="ทุกยี่ห้อ" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md max-h-[300px]">
                  <SelectItem value="all">ทุกยี่ห้อ</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* สภาพ */}
            <div className="space-y-2">
              <Label htmlFor="condition" className="flex items-center gap-2 text-gray-700">
                <Tag className="h-4 w-4 text-gray-500" />
                สภาพ
              </Label>
              <Select value={filters.condition} onValueChange={(value) => updateFilter("condition", value)}>
                <SelectTrigger className="bg-white border-gray-200 focus:ring-green-500">
                  <SelectValue placeholder="ทุกสภาพ" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  <SelectItem value="all">ทุกสภาพ</SelectItem>
                  <SelectItem value="new">มือ 1 (ใหม่)</SelectItem>
                  <SelectItem value="used">มือ 2 (มือสอง)</SelectItem>
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
                <span className="text-green-600 font-medium">{Number(filters.maxPrice).toLocaleString()} บาท</span>
              </div>
              <div className="flex gap-2 items-center">
                <Slider
                  min={0}
                  max={30000}
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
                  max="30000"
                  step="50"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                  className="w-24 text-right"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 ฿</span>
                <span>30,000 ฿</span>
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
                  <SelectItem value="popular">ยอดนิยม</SelectItem>
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

              {filters.type && filters.type !== "" && filters.type !== "all" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>ประเภท: {filters.type}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("type", "")} />
                </Badge>
              )}

              {filters.brand && filters.brand !== "all" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>ยี่ห้อ: {filters.brand}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("brand", "all")} />
                </Badge>
              )}

              {filters.condition && filters.condition !== "all" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>สภาพ: {filters.condition === "new" ? "มือ 1 (ใหม่)" : "มือ 2 (มือสอง)"}</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("condition", "all")} />
                </Badge>
              )}

              {filters.maxPrice && filters.maxPrice !== "15000" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>ราคาสูงสุด: {Number(filters.maxPrice).toLocaleString()} บาท</span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("maxPrice", "15000")} />
                </Badge>
              )}

              {filters.sort && filters.sort !== "newest" && (
                <Badge variant="outline" className="bg-white flex items-center gap-1 px-3 py-1 border-gray-200">
                  <span>
                    เรียงตาม:{" "}
                    {filters.sort === "price-asc"
                      ? "ราคาต่ำ-สูง"
                      : filters.sort === "price-desc"
                        ? "ราคาสูง-ต่ำ"
                        : "ยอดนิยม"}
                  </span>
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter("sort", "newest")} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ผลลัพธ์การค้นหา */}
      <div className="mb-4 flex justify-between items-center">
        <p className="text-gray-600">
          พบ <span className="font-medium">{loading ? "..." : equipment.length}</span> รายการ
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          // แสดง Skeleton loading
          Array(8)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                <div className="bg-white p-4 rounded-b-lg border border-gray-200">
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
        ) : equipment.length > 0 ? (
          equipment.map((item) => (
            <EquipmentCard key={item.id} equipment={item} isFavorite={favorites.includes(item.id)} />
          ))
        ) : (
          <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="text-gray-400 mb-2">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-xl text-gray-500 mb-2">ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-gray-400 mb-4">ลองปรับเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</p>
            <Button className="bg-green-600 hover:bg-green-700" onClick={clearFilters}>
              ล้างตัวกรอง
            </Button>
          </div>
        )}
      </div>

      {/* ตัวกรองสำหรับมือถือ */}
      <MobileFilterDrawer
        isOpen={showMobileFilter}
        onClose={() => setShowMobileFilter(false)}
        types={types}
        brands={brands}
        activeFilters={activeFilters}
        defaultValues={filters}
        onClearFilters={clearFilters}
        updateFilter={updateFilter}
      />
    </div>
  )
}
