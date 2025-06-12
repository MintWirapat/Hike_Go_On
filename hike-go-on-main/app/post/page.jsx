"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageIcon, Plus, Trash2, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
// เพิ่มการ import ฟังก์ชัน deleteImageFromUrl
import { uploadMultipleImages } from "@/lib/supabase/storage"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { addCampsite } from "@/lib/actions/campsite-actions"

// แก้ไข state ในฟังก์ชัน PostCampsite เพื่อเพิ่ม zones
export default function PostCampsite() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    province: "",
    description: "",
    price: "",
    priceType: "perNight",
    phone: "",
    email: "",
    website: "",
    latitude: "",
    longitude: "",
    location: "",
  })
  const [facilities, setFacilities] = useState([])
  const [rules, setRules] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // เพิ่ม state สำหรับเก็บข้อมูลโซน
  const [zones, setZones] = useState([
    {
      name: "Zone A",
      width: "",
      length: "",
      description: "", // เพิ่มฟิลด์คำอธิบายโซน
      capacity: "", // เพิ่มฟิลด์ capacity
      images: [],
    },
  ])

  // เพิ่มฟังก์ชันสำหรับจัดการโซน
  const addZone = () => {
    // สร้างชื่อโซนใหม่โดยใช้ตัวอักษรถัดไป
    const lastZone = zones[zones.length - 1]
    const lastZoneLetter = lastZone.name.split(" ")[1]
    const nextZoneLetter = String.fromCharCode(lastZoneLetter.charCodeAt(0) + 1)

    setZones([
      ...zones,
      {
        name: `Zone ${nextZoneLetter}`,
        width: "",
        length: "",
        description: "", // เพิ่มฟิลด์คำอธิบายโซน
        capacity: "", // เพิ่มฟิลด์ capacity
        images: [],
      },
    ])
  }

  const removeZone = (index) => {
    if (zones.length === 1) {
      return // ไม่อนุญาตให้ลบโซนสุดท้าย
    }

    const newZones = [...zones]
    newZones.splice(index, 1)
    setZones(newZones)
  }

  const updateZone = (index, field, value) => {
    const newZones = [...zones]

    // ถ้าเป็นการอัพเดทชื่อโซน ให้ตรวจสอบและรักษาคำว่า "Zone " ไว้
    if (field === "name") {
      // ถ้าไม่มีคำว่า "Zone " นำหน้า ให้เพิ่มเข้าไป
      if (!value.startsWith("Zone ")) {
        value = "Zone " + value.trim()
      }
      // ถ้ามีแค่คำว่า "Zone " ให้เพิ่มตัวอักษรเดิมกลับไป
      if (value === "Zone ") {
        const currentLetter = zones[index].name.split(" ")[1] || ""
        value = "Zone " + currentLetter
      }
    }

    newZones[index][field] = value
    setZones(newZones)
  }

  // เพิ่มฟังก์ชันสำหรับจัดการรูปภาพของโซน
  const handleZoneImageUpload = (e, zoneIndex) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const currentZone = zones[zoneIndex]
    const currentImages = currentZone.images || []

    // จำกัดจำนวนรูปภาพไม่เกิน 3 รูปต่อโซน
    const maxImages = 3
    const remainingSlots = maxImages - currentImages.length
    const filesToAdd = Math.min(files.length, remainingSlots)

    if (remainingSlots <= 0) {
      alert("คุณสามารถอัปโหลดรูปภาพได้สูงสุด 3 รูปต่อโซน")
      return
    }

    const newImages = [...currentImages]
    const maxSizeInBytes = 5 * 1024 * 1024 // 5MB

    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i]

      // ตรวจสอบขนาดไฟล์
      if (file.size > maxSizeInBytes) {
        alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (สูงสุด 5MB)`)
        continue
      }

      // สร้าง URL สำหรับแสดงรูปภาพตัวอย่าง
      const imageUrl = URL.createObjectURL(file)
      newImages.push({
        file: file,
        preview: imageUrl,
        name: file.name,
      })
    }

    const newZones = [...zones]
    newZones[zoneIndex].images = newImages
    setZones(newZones)

    // รีเซ็ต input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = null
  }

  const removeZoneImage = (zoneIndex, imageIndex) => {
    const newZones = [...zones]
    const currentImages = [...newZones[zoneIndex].images]

    // ลบ URL ที่สร้างไว้เพื่อป้องกัน memory leak
    if (currentImages[imageIndex]?.preview) {
      URL.revokeObjectURL(currentImages[imageIndex].preview)
    }

    currentImages.splice(imageIndex, 1)
    newZones[zoneIndex].images = currentImages
    setZones(newZones)
  }

  // แก้ไขฟังก์ชัน handleChange, handleSelectChange, handleFacilityChange, handleRuleChange, removeRule, handleImageUpload, removeImage ไม่มีการเปลี่ยนแปลง

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFacilityChange = (facility) => {
    setFacilities((prev) => {
      // ตรวจสอบว่ามี facility.id อยู่ใน array หรือไม่
      const existingIndex = prev.findIndex((item) => item.id === facility.id)

      if (existingIndex >= 0) {
        // ถ้ามีอยู่แล้ว ให้ลบออก
        return prev.filter((_, i) => i !== existingIndex)
      } else {
        // ถ้ายังไม่มี ให้เพิ่มเข้าไป
        return [...prev, { id: facility.id, name: facility.id, label: facility.label }]
      }
    })
  }

  const handleRuleChange = (e) => {
    if (e.target.value.trim()) {
      const newRule = {
        rule: e.target.value.trim(),
        id: Date.now().toString(), // สร้าง id ชั่วคราวเพื่อใช้ในการอ้างอิง
      }
      setRules((prev) => [...prev, newRule])
      e.target.value = ""
    }
  }

  const removeRule = (index) => {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  // แก้ไขฟังก์ชัน handleImageUpload ให้สร้าง URL สำหรับแสดงรูปภาพตัวอย่าง
  const handleImageUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // จำกัดจำนวนรูปภาพไม่เกิน 5 รูป
    const maxImages = 5
    const remainingSlots = maxImages - images.length
    const filesToAdd = Math.min(files.length, remainingSlots)

    if (remainingSlots <= 0) {
      alert("คุณสามารถอัปโหลดรูปภาพได้สูงสุด 5 รูป")
      return
    }

    const newImages = [...images]
    const maxSizeInBytes = 5 * 1024 * 1024 // 5MB

    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i]

      // ตรวจสอบขนาดไฟล์
      if (file.size > maxSizeInBytes) {
        alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินไป (สูงสุด 5MB)`)
        continue
      }

      // สร้าง URL สำหรับแสดงรูปภาพตัวอย่าง
      const imageUrl = URL.createObjectURL(file)
      newImages.push({
        file: file,
        preview: imageUrl,
        name: file.name,
      })
    }

    setImages(newImages)

    // รีเซ็ต input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = null
  }

  // แก้ไขฟังก์ชัน removeImage ให้ลบ URL ที่สร้างไว้ด้วย
  const removeImage = (index) => {
    setImages((prev) => {
      const newImages = [...prev]
      // ลบ URL ที่สร้างไว้เพื่อป้องกัน memory leak
      if (newImages[index]?.preview) {
        URL.revokeObjectURL(newImages[index].preview)
      }
      newImages.splice(index, 1)
      return newImages
    })
  }

  // แก้ไขฟังก์ชัน handleSubmit เพื่อรวมข้อมูลโซน
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // ตรวจสอบราคาไม่ให้ติดลบ
      if (Number.parseFloat(formData.price) < 0) {
        throw new Error("ราคาต้องไม่ติดลบ")
      }

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ถูกต้อง
      const campsiteData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        province: formData.province,
        price: Number.parseFloat(formData.price),
        price_type: formData.priceType, // เพิ่มการส่งข้อมูลประเภทราคา
        latitude: formData.latitude ? Number.parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? Number.parseFloat(formData.longitude) : null,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
      }

      // อัพโหลดรูปภาพไปยัง Supabase Storage
      const imagesToUpload = images.map((image) => image.file)
      // ใช้ timestamp แทนชื่อสถานที่เพื่อป้องกันปัญหากับภาษาไทย
      const folderName = `campsite-${Date.now()}`
      const { urls: imageUrls, errors: uploadErrors } = await uploadMultipleImages(
        imagesToUpload,
        "campsite-images",
        folderName,
      )

      if (uploadErrors.length > 0) {
        console.error("Some images failed to upload:", uploadErrors)
        setError(`บางรูปภาพอัพโหลดไม่สำเร็จ: ${uploadErrors[0]}`)
        setLoading(false)
        return
      }

      // อัพโหลดรูปภาพของแต่ละโซน
      const zonesWithImages = await Promise.all(
        zones.map(async (zone, index) => {
          const zoneImages = zone.images.map((image) => image.file)
          const zoneFolderName = `${folderName}/zone-${index}`

          if (zoneImages.length > 0) {
            const { urls: zoneImageUrls, errors: zoneUploadErrors } = await uploadMultipleImages(
              zoneImages,
              "campsite-images",
              zoneFolderName,
            )

            if (zoneUploadErrors.length > 0) {
              console.error(`Some images for zone ${zone.name} failed to upload:`, zoneUploadErrors)
              throw new Error(`บางรูปภาพของ ${zone.name} อัพโหลดไม่สำเร็จ`)
            }

            // แก้ไขตรงนี้: ตรวจสอบว่า capacity ถูกแปลงเป็นตัวเลขอย่างถูกต้อง
            const zoneData = {
              ...zone,
              capacity: zone.capacity && zone.capacity !== "" ? Number.parseInt(zone.capacity) : null,
              imageUrls: zoneImageUrls,
              images: undefined, // ไม่ส่ง File objects ไปยัง server
            }
            console.log("Zone data being sent:", zoneData)
            return zoneData
          }

          // แก้ไขตรงนี้: ตรวจสอบว่า capacity ถูกแปลงเป็นตัวเลขอย่างถูกต้อง
          const zoneData = {
            ...zone,
            capacity: zone.capacity && zone.capacity !== "" ? Number.parseInt(zone.capacity) : null,
            imageUrls: [],
            images: undefined,
          }
          console.log("Zone data being sent:", zoneData)
          return zoneData
        }),
      )

      // ตรวจสอบข้อมูลก่อนส่งไปยัง server
      console.log("Zones data being sent to server:", zonesWithImages)
      console.log("Facilities being sent:", facilities)
      console.log("Rules being sent:", rules)

      // ตรวจสอบว่า facilities และ rules เป็น array
      const facilitiesToSend = Array.isArray(facilities) ? facilities : []
      console.log("Final facilities being sent:", facilitiesToSend)
      const rulesToSend = Array.isArray(rules) ? rules : []

      console.log("Final facilities being sent:", facilitiesToSend)
      console.log("Final rules being sent:", rulesToSend)

      const { success, error, campsite } = await addCampsite(
        campsiteData,
        facilitiesToSend,
        rulesToSend,
        imageUrls,
        zonesWithImages,
      )

      if (error) {
        setError(error)
      } else {
        setSuccess(true)
        // รอสักครู่แล้วนำทางไปยังหน้ารายละเอียดสถานที่แคมป์
        setTimeout(() => {
          router.push(`/campsite/${campsite.id}`)
        }, 2000)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const provinces = [
    "กรุงเทพมหานคร",
    "กระบี่",
    "กาญจนบุรี",
    "กาฬสินธุ์",
    "กำแพงเพชร",
    "ขอนแก่น",
    "จันทบุรี",
    "ฉะเชิงเทรา",
    "ชลบุรี",
    "ชัยนาท",
    "ชัยภูมิ",
    "ชุมพร",
    "เชียงราย",
    "เชียงใหม่",
    "ตรัง",
    "ตราด",
    "ตาก",
    "นครนายก",
    "นครปฐม",
    "นครพนม",
    "นครราชสีมา",
    "นครศรีธรรมราช",
    "นครสวรรค์",
    "นนทบุรี",
    "นราธิวาส",
    "น่าน",
    "บึงกาฬ",
    "บุรีรัมย์",
    "ปทุมธานี",
    "ประจวบคีรีขันธ์",
    "ปราจีนบุรี",
    "ปัตตานี",
    "พระนครศรีอยุธยา",
    "พะเยา",
    "พังงา",
    "พัทลุง",
    "พิจิตร",
    "พิษณุโลก",
    "เพชรบุรี",
    "เพชรบูรณ์",
    "แพร่",
    "ภูเก็ต",
    "มหาสารคาม",
    "มุกดาหาร",
    "แม่ฮ่องสอน",
    "ยโสธร",
    "ยะลา",
    "ร้อยเอ็ด",
    "ระนอง",
    "ระยอง",
    "ราชบุรี",
    "ลพบุรี",
    "ลำปาง",
    "ลำพูน",
    "เลย",
    "ศรีสะเกษ",
    "สกลนคร",
    "สงขลา",
    "สตูล",
    "สมุทรปราการ",
    "สมุทรสงคราม",
    "สมุทรสาคร",
    "สระแก้ว",
    "สระบุรี",
    "สิงห์บุรี",
    "สุโขทัย",
    "สุพรรณบุรี",
    "สุราษฎร์ธานี",
    "สุรินทร์",
    "หนองคาย",
    "หนองบัวลำภู",
    "อ่างทอง",
    "อำนาจเจริญ",
    "อุดรธานี",
    "อุตรดิตถ์",
    "อุทัยธานี",
    "อุบลราชธานี",
  ]

  // แก้ไขตัวเลือกสิ่งอำนวยความสะดวกให้ไม่มีการซ้ำกัน
  const facilityOptions = [
    { id: "cleanToilet", label: "ห้องน้ำสะอาด" },
    { id: "tapWater", label: "น้ำประปา" },
    { id: "waterfall", label: "น้ำตกใกล้เคียง" },
    { id: "campfire", label: "กิจกรรมแคมป์ไฟ" },
    { id: "bbq", label: "บาร์บีคิวกริลล์" },
    { id: "viewpoint", label: "จุดชมวิว" },
    { id: "wifi", label: "WiFi" },
    { id: "outlet", label: "จุดปลั๊ก" },
    { id: "drinks", label: "ขายเครื่องดื่ม" },
    { id: "parking", label: "ที่จอดรถ" },
    { id: "drinkingWater", label: "น้ำดื่ม" },
    { id: "shop", label: "ร้านค้า" },
    { id: "breakfast", label: "อาหารเช้า" },
  ]

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-10 px-3 sm:px-4 max-w-3xl">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">เพิ่มสถานที่แคมป์ใหม่</h1>
      <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">กรอกข้อมูลสถานที่แคมป์ของคุณเพื่อให้ผู้ใช้สามารถค้นพบได้</p>

      {error && (
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <AlertDescription>เพิ่มสถานที่แคมป์สำเร็จ! กำลังนำคุณไปยังหน้ารายละเอียด...</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6 bg-white p-4 sm:p-6 rounded-lg border border-gray-200"
      >
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center">
            ชื่อสถานที่แคมป์<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="name"
            placeholder="เช่น อุบลแคมป์"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            lang="th"
            dir="auto"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="province" className="flex items-center">
            จังหวัด<span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={formData.province} onValueChange={(value) => handleSelectChange("province", value)} required>
            <SelectTrigger id="province">
              <SelectValue placeholder="เลือกจังหวัด" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-md">
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center">
            ตำบล/อำเภอ<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="location"
            name="location"
            required
            value={formData.location}
            onChange={handleChange}
            placeholder="ตำบล อำเภอ"
            lang="th"
            dir="auto"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center">
            รายละเอียด<span className="text-red-500 ml-1">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            placeholder="บรรยายรายละเอียดของสถานที่แคมป์ของคุณ..."
            rows={5}
            lang="th"
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center">
            ราคา (บาท)<span className="text-red-500 ml-1">*</span>
          </Label>
          <div className="flex items-center space-x-4">
            <Input
              id="price"
              name="price"
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={handleChange}
              placeholder="0"
              className="w-32"
            />
            <RadioGroup
              value={formData.priceType}
              onValueChange={(value) => handleSelectChange("priceType", value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="perNight" id="perNight" />
                <Label htmlFor="perNight">ต่อคืน</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="perPerson" id="perPerson" />
                <Label htmlFor="perPerson">ต่อคน</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center">
            รูปภาพ<span className="text-red-500 ml-1">*</span>{" "}
            <span className="text-gray-500 text-sm ml-2">(สูงสุด 5 รูป)</span>
          </Label>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <div className="flex justify-center">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
            <p className="mt-2 text-sm text-green-600 font-medium">คลิกเพื่ออัปโหลดรูปภาพ</p>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP, HEIC ขนาดสูงสุด 5MB</p>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
            <Button
              type="button"
              variant="outline"
              className="mt-4 text-sm border-green-500 text-green-500 hover:bg-green-50"
              onClick={() => document.querySelector('input[type="file"]').click()}
            >
              เลือกรูปภาพ
            </Button>
          </div>

          {/* แสดงรูปภาพที่อัปโหลดแล้ว */}
          {images.length > 0 && (
            <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image.preview || "/placeholder.svg"}
                    alt={`รูปภาพ ${index + 1}`}
                    className="h-20 sm:h-24 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm"
                    onClick={() => removeImage(index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ส่วนของโซน */}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-medium">โซนพื้นที่แคมป์</Label>
            <Button
              type="button"
              onClick={addZone}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-green-600 border-green-500"
            >
              <Plus size={16} /> เพิ่มโซน
            </Button>
          </div>

          <div className="space-y-6">
            {zones.map((zone, zoneIndex) => (
              <Card key={zoneIndex} className="border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <span className="font-medium">Zone</span>
                        <Input
                          value={zone.name.startsWith("Zone ") ? zone.name.substring(5) : zone.name}
                          onChange={(e) => updateZone(zoneIndex, "name", "Zone " + e.target.value)}
                          className="h-8 w-16 ml-1 font-medium"
                        />
                      </div>
                    </div>
                    {zones.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeZone(zoneIndex)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`zone-width-${zoneIndex}`}>ความกว้าง (เมตร)</Label>
                      <Input
                        id={`zone-width-${zoneIndex}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={zone.width}
                        onChange={(e) => updateZone(zoneIndex, "width", e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`zone-length-${zoneIndex}`}>ความยาว (เมตร)</Label>
                      <Input
                        id={`zone-length-${zoneIndex}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={zone.length}
                        onChange={(e) => updateZone(zoneIndex, "length", e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`zone-capacity-${zoneIndex}`}>จำนวนคนที่รองรับ</Label>
                    <Input
                      id={`zone-capacity-${zoneIndex}`}
                      type="number"
                      min="0"
                      value={zone.capacity}
                      onChange={(e) => updateZone(zoneIndex, "capacity", e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`zone-description-${zoneIndex}`}>คำอธิบายโซน</Label>
                    <Textarea
                      id={`zone-description-${zoneIndex}`}
                      value={zone.description}
                      onChange={(e) => updateZone(zoneIndex, "description", e.target.value)}
                      placeholder="อธิบายรายละเอียดเกี่ยวกับโซนนี้..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center">
                      รูปภาพโซน <span className="text-gray-500 text-sm ml-2">(สูงสุด 3 รูป)</span>
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                      <input
                        type="file"
                        id={`zone-images-${zoneIndex}`}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleZoneImageUpload(e, zoneIndex)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-sm border-green-500 text-green-500 hover:bg-green-50"
                        onClick={() => document.getElementById(`zone-images-${zoneIndex}`).click()}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" /> เลือกรูปภาพ
                      </Button>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP, HEIC ขนาดสูงสุด 5MB</p>
                    </div>

                    {/* แสดงรูปภาพที่อัปโหลดแล้ว */}
                    {zone.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {zone.images.map((image, imageIndex) => (
                          <div key={imageIndex} className="relative">
                            <img
                              src={image.preview || "/placeholder.svg"}
                              alt={`รูปภาพโซน ${zone.name} ${imageIndex + 1}`}
                              className="h-20 w-full object-cover rounded"
                            />
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm"
                              onClick={() => removeZoneImage(zoneIndex, imageIndex)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>สิ่งอำนวยความสะดวก</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 sm:gap-2">
            {facilityOptions.map((facility) => (
              <div key={facility.id} className="flex items-center space-x-2">
                <Checkbox
                  id={facility.id}
                  checked={facilities.some((item) => item.id === facility.id)}
                  onCheckedChange={() => handleFacilityChange(facility)}
                />
                <Label htmlFor={facility.id} className="text-xs sm:text-sm">
                  {facility.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>กฎระเบียบ</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="เพิ่มกฎระเบียบ เช่น ห้ามส่งเสียงดังหลัง 22.00 น."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleRuleChange(e)
                }
              }}
              onBlur={handleRuleChange}
              lang="th"
              dir="auto"
            />
            <Button
              type="button"
              onClick={(e) =>
                handleRuleChange({
                  target: document.querySelector('input[placeholder="เพิ่มกฎระเบียบ เช่น ห้ามส่งเสียงดังหลัง 22.00 น."]'),
                })
              }
            >
              เพิ่ม
            </Button>
          </div>

          {/* แสดงกฎระเบียบที่เพิ่มแล้ว */}
          {rules.length > 0 && (
            <ul className="mt-2 space-y-1">
              {rules.map((ruleItem, index) => (
                <li key={ruleItem.id || index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span>{ruleItem.rule}</span>
                  <button type="button" className="text-red-500" onClick={() => removeRule(index)}>
                    ลบ
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="08x-xxx-xxxx" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">เว็บไซต์</Label>
          <Input
            id="website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="latitude">ละติจูด</Label>
            <Input
              id="latitude"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="13.7563"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">ลองจิจูด</Label>
            <Input
              id="longitude"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="100.5018"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 py-4 sm:py-6 text-base sm:text-lg"
          disabled={loading}
        >
          {loading ? "กำลังดำเนินการ..." : "เพิ่มสถานที่แคมป์"}
        </Button>
      </form>
    </div>
  )
}
