"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImageIcon, Plus, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// เพิ่มการ import ฟังก์ชัน deleteImageFromUrl
import { uploadMultipleImages } from "@/lib/supabase/storage"
import { addEquipment } from "@/lib/supabase/actions"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PostEquipment() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [equipments, setEquipments] = useState([
    {
      id: 1,
      name: "",
      type: "",
      condition: "new",
      price: "",
      brand: "",
      description: "",
      images: [],
      contactInfo: "",
      phone: "",
      email: "",
      location: "",
    },
  ])

  const handleChange = (id, field, value) => {
    setEquipments(equipments.map((equipment) => (equipment.id === id ? { ...equipment, [field]: value } : equipment)))
  }

  const handleAddEquipment = () => {
    const newId = equipments.length > 0 ? Math.max(...equipments.map((eq) => eq.id)) + 1 : 1
    setEquipments([
      ...equipments,
      {
        id: newId,
        name: "",
        type: "",
        condition: "new",
        price: "",
        brand: "",
        description: "",
        images: [],
        contactInfo: "",
        phone: "",
        email: "",
        location: "",
      },
    ])
  }

  const handleRemoveEquipment = (id) => {
    if (equipments.length > 1) {
      setEquipments(equipments.filter((equipment) => equipment.id !== id))
    } else {
      alert("ต้องมีอุปกรณ์อย่างน้อย 1 ชิ้น")
    }
  }

  // เพิ่มฟังก์ชัน handleImageUpload ในส่วนของ equipment-post
  const handleImageUpload = (id, e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // จำกัดจำนวนรูปภาพไม่เกิน 5 รูป
    const equipment = equipments.find((eq) => eq.id === id)
    if (!equipment) return

    const currentImages = equipment.images || []
    const maxImages = 5
    const remainingSlots = maxImages - currentImages.length
    const filesToAdd = Math.min(files.length, remainingSlots)

    if (remainingSlots <= 0) {
      alert("คุณสามารถอัปโหลดรูปภาพได้สูงสุด 5 รูป")
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

    setEquipments(equipments.map((eq) => (eq.id === id ? { ...eq, images: newImages } : eq)))

    // รีเซ็ต input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = null
  }

  // เพิ่มฟังก์ชัน removeImage ในส่วนของ equipment-post
  const removeImage = (equipmentId, imageIndex) => {
    setEquipments(
      equipments.map((eq) => {
        if (eq.id === equipmentId) {
          const newImages = [...eq.images]
          // ลบ URL ที่สร้างไว้เพื่อป้องกัน memory leak
          if (newImages[imageIndex]?.preview) {
            URL.revokeObjectURL(newImages[imageIndex].preview)
          }
          newImages.splice(imageIndex, 1)
          return { ...eq, images: newImages }
        }
        return eq
      }),
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // ตรวจสอบว่ามีอุปกรณ์อย่างน้อย 1 ชิ้น
      if (equipments.length === 0) {
        throw new Error("กรุณาเพิ่มอุปกรณ์อย่างน้อย 1 ชิ้น")
      }

      // ประมวลผลอุปกรณ์แต่ละชิ้น
      for (const equipment of equipments) {
        // ตรวจสอบข้อมูลที่จำเป็น
        if (!equipment.name || !equipment.type || !equipment.price) {
          throw new Error("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, ประเภท, ราคา)")
        }

        // เพิ่มข้อมูลติดต่อเข้าไปในคำอธิบาย
        let fullDescription = equipment.description || ""

        // เพิ่มข้อมูลติดต่อทั้งหมดเข้าไปในคำอธิบาย
        const contactDetails = []

        if (equipment.contactInfo) {
          contactDetails.push(`ข้อมูลติดต่อ: ${equipment.contactInfo}`)
        }

        if (equipment.phone) {
          contactDetails.push(`เบอร์โทร: ${equipment.phone}`)
        }

        if (equipment.email) {
          contactDetails.push(`อีเมล: ${equipment.email}`)
        }

        if (equipment.location) {
          contactDetails.push(`สถานที่: ${equipment.location}`)
        }

        // เพิ่มข้อมูลติดต่อเข้าไปในคำอธิบายถ้ามีข้อมูล
        if (contactDetails.length > 0) {
          fullDescription += "\n\n--- ข้อมูลติดต่อ ---\n" + contactDetails.join("\n")
        }

        // แปลงข้อมูลให้อยู่ในรูปแบบที่ถูกต้อง - ส่งเฉพาะฟิลด์ที่จำเป็น
        const equipmentData = {
          name: equipment.name,
          type: equipment.type,
          condition: equipment.condition,
          price: Number.parseFloat(equipment.price),
          brand: equipment.brand || null,
          description: fullDescription,
          // ลบฟิลด์ที่ไม่มีในฐานข้อมูลออกทั้งหมด
        }

        // อัพโหลดรูปภาพไปยัง Supabase Storage
        let imageUrls = []
        if (equipment.images && equipment.images.length > 0) {
          const imagesToUpload = equipment.images.map((image) => image.file)
          // ใช้ timestamp แทนชื่อสถานที่เพื่อป้องกันปัญหากับภาษาไทย
          const folderName = `equipment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
          const { urls, errors: uploadErrors } = await uploadMultipleImages(
            imagesToUpload,
            "equipment-images",
            folderName,
          )

          if (uploadErrors.length > 0) {
            console.error("Some images failed to upload:", uploadErrors)
            throw new Error(`บางรูปภาพอัพโหลดไม่สำเร็จ: ${uploadErrors[0]}`)
          }

          imageUrls = urls
        }

        // บันทึกข้อมูลอุปกรณ์
        const { success, error } = await addEquipment(equipmentData, imageUrls)

        if (error) {
          throw new Error(error)
        }
      }

      setSuccess(true)
      // รอสักครู่แล้วนำทางไปยังหน้าอุปกรณ์
      setTimeout(() => {
        router.push("/equipment")
      }, 2000)
    } catch (err) {
      console.error("Error submitting equipment:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const equipmentTypes = [
    "เต็นท์",
    "ถุงนอน",
    "เสื่อรองนอน",
    "เก้าอี้พกพา",
    "โต๊ะพกพา",
    "เตาแก๊ส",
    "หม้อ/กระทะ",
    "ไฟฉาย/โคมไฟ",
    "มีด/เครื่องมือ",
    "กระเป๋าเป้",
    "อื่นๆ",
  ]

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-10 px-3 sm:px-4 max-w-3xl">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">ลงประกาศขายอุปกรณ์แคมป์ปิ้ง</h1>
      {error && (
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <AlertDescription>ลงขายอุปกรณ์แคมป์ปิ้งสำเร็จ! กำลังนำคุณไปยังหน้าอุปกรณ์...</AlertDescription>
        </Alert>
      )}
      <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
        กรอกข้อมูลอุปกรณ์ที่คุณต้องการขายเพื่อให้ผู้ซื้อสามารถค้นหาและติดต่อคุณได้
      </p>

      <form onSubmit={handleSubmit}>
        {equipments.map((equipment, index) => (
          <div key={equipment.id} className="mb-6 bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">อุปกรณ์ชิ้นที่ {index + 1}</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`name-${equipment.id}`} className="flex items-center">
                  ชื่ออุปกรณ์<span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={`name-${equipment.id}`}
                  placeholder="เช่น เต็นท์ Coleman 4 คน รุ่น Sundome"
                  value={equipment.name}
                  onChange={(e) => handleChange(equipment.id, "name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`type-${equipment.id}`} className="flex items-center">
                  ประเภทอุปกรณ์<span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={equipment.type}
                  onValueChange={(value) => handleChange(equipment.id, "type", value)}
                  required
                >
                  <SelectTrigger id={`type-${equipment.id}`}>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-md">
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  ประเภทสินค้า<span className="text-red-500 ml-1">*</span>
                </Label>
                <RadioGroup
                  value={equipment.condition}
                  onValueChange={(value) => handleChange(equipment.id, "condition", value)}
                  className="flex space-x-6"
                  required
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id={`new-${equipment.id}`} />
                    <Label htmlFor={`new-${equipment.id}`}>มือ 1 (ใหม่)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="used" id={`used-${equipment.id}`} />
                    <Label htmlFor={`used-${equipment.id}`}>มือ 2 (มือสอง)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`price-${equipment.id}`} className="flex items-center">
                    ราคา (บาท)<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id={`price-${equipment.id}`}
                    type="number"
                    placeholder="0"
                    value={equipment.price}
                    onChange={(e) => handleChange(equipment.id, "price", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`brand-${equipment.id}`}>ยี่ห้อ</Label>
                  <Input
                    id={`brand-${equipment.id}`}
                    placeholder="เช่น Coleman, NatureHike"
                    value={equipment.brand}
                    onChange={(e) => handleChange(equipment.id, "brand", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`description-${equipment.id}`} className="flex items-center">
                  รายละเอียด<span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  id={`description-${equipment.id}`}
                  placeholder="บรรยายรายละเอียดของอุปกรณ์ เช่น สภาพ คุณสมบัติพิเศษ ข้อมูลจำเพาะ..."
                  rows={4}
                  value={equipment.description}
                  onChange={(e) => handleChange(equipment.id, "description", e.target.value)}
                  required
                />
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
                  <p className="mt-2 text-sm text-green-600 font-medium">คลิกเพื่ออัพโหลดรูปภาพ</p>
                  <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP, HEIC ขนาดสูงสุด 5MB</p>
                  <input
                    type="file"
                    id={`image-upload-${equipment.id}`}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(equipment.id, e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 text-sm border-green-500 text-green-500 hover:bg-green-50"
                    onClick={() => document.getElementById(`image-upload-${equipment.id}`).click()}
                  >
                    เลือกรูปภาพ
                  </Button>
                </div>

                {/* แสดงรูปภาพที่อัปโหลดแล้ว */}
                {equipment.images && equipment.images.length > 0 && (
                  <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {equipment.images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.preview || "/placeholder.svg"}
                          alt={`รูปภาพ ${index + 1}`}
                          className="h-20 sm:h-24 w-full object-cover rounded"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm"
                          onClick={() => removeImage(equipment.id, index)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`contactInfo-${equipment.id}`} className="flex items-center">
                  ข้อมูลติดต่อ<span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={`contactInfo-${equipment.id}`}
                  placeholder="เช่น Line ID, Facebook"
                  value={equipment.contactInfo}
                  onChange={(e) => handleChange(equipment.id, "contactInfo", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`phone-${equipment.id}`}>เบอร์โทรศัพท์</Label>
                  <Input
                    id={`phone-${equipment.id}`}
                    placeholder="08x-xxx-xxxx"
                    value={equipment.phone}
                    onChange={(e) => handleChange(equipment.id, "phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`email-${equipment.id}`}>อีเมล</Label>
                  <Input
                    id={`email-${equipment.id}`}
                    type="email"
                    placeholder="example@example.com"
                    value={equipment.email}
                    onChange={(e) => handleChange(equipment.id, "email", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`location-${equipment.id}`}>สถานที่/ที่อยู่</Label>
                <Input
                  id={`location-${equipment.id}`}
                  placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
                  value={equipment.location}
                  onChange={(e) => handleChange(equipment.id, "location", e.target.value)}
                />
              </div>

              {equipments.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 border-red-500 text-red-500 hover:bg-red-50"
                  onClick={() => handleRemoveEquipment(equipment.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบอุปกรณ์
                </Button>
              )}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="mb-4 sm:mb-6 border-green-500 text-green-500 hover:bg-green-50 text-sm w-full sm:w-auto"
          onClick={handleAddEquipment}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มอุปกรณ์ชิ้นใหม่
        </Button>

        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 py-4 sm:py-6 text-base sm:text-lg"
          disabled={loading}
        >
          {loading ? "กำลังบันทึกข้อมูล..." : "ส่งข้อมูล"}
        </Button>
      </form>
    </div>
  )
}
