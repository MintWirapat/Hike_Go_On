"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X, SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"

export function MobileFilterDrawer({
  isOpen,
  onClose,
  types = [],
  brands = [],
  activeFilters = 0,
  defaultValues = {},
  onClearFilters,
}) {
  const { query = "", type = "all", maxPrice = "15000", brand = "all", condition = "all" } = defaultValues

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] pt-6">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              ตัวกรอง
              {activeFilters > 0 && <Badge className="bg-green-600 hover:bg-green-700 ml-1">{activeFilters}</Badge>}
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto pb-20">
          <form action="/equipment" method="get" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="mobile-search">ค้นหา</Label>
              <Input
                id="mobile-search"
                name="q"
                placeholder="ค้นหาอุปกรณ์..."
                defaultValue={query}
                className="bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-type">ประเภท</Label>
              <Select name="type" defaultValue={type}>
                <SelectTrigger className="bg-gray-50 focus:bg-white">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>ราคาสูงสุด</Label>
                <span className="text-green-600 font-medium">{Number(maxPrice).toLocaleString()} บาท</span>
              </div>
              <Input
                type="range"
                name="maxPrice"
                min="0"
                max="30000"
                step="1000"
                defaultValue={maxPrice}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 ฿</span>
                <span>30,000 ฿</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-brand">แบรนด์</Label>
              <Select name="brand" defaultValue={brand}>
                <SelectTrigger className="bg-gray-50 focus:bg-white">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-md max-h-[200px]">
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>สภาพสินค้า</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="mobile-new" name="condition" value="new" defaultChecked={condition === "new"} />
                  <label htmlFor="mobile-new" className="text-sm">
                    มือ 1 (ใหม่)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="mobile-used" name="condition" value="used" defaultChecked={condition === "used"} />
                  <label htmlFor="mobile-used" className="text-sm">
                    มือ 2 (มือสอง)
                  </label>
                </div>
              </div>
            </div>

            <SheetFooter className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button type="button" variant="outline" className="w-full" onClick={onClearFilters}>
                ล้างตัวกรอง
              </Button>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                แสดงผลลัพธ์
              </Button>
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
