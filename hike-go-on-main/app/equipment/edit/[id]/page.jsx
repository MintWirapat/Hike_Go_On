"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ImageIcon, X, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateEquipment } from "@/lib/actions/equipment-actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseInstance } from "@/lib/supabase/client"
import Image from "next/image"
import { uploadMultipleImages, deleteImageFromUrl } from "@/lib/supabase/storage"

export default function EditEquipment({ params }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    condition: "new",
    price: "",
    brand: "",
    description: "",
    contactInfo: "",
    phone: "",
    email: "",
    location: "",
  })
  const [existingImages, setExistingImages] = useState([])
  const [newImages, setNewImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push(`/login?redirect=/equipment/edit/${params.id}`)
      return
    }

    fetchEquipmentData()
  }, [params.id, router])

  const fetchEquipmentData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseInstance()

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขอุปกรณ์")
      }

      // ดึงข้อมูลอุปกรณ์
      const { data: equipment, error: equipmentError } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", params.id)
        .single()

      if (equipmentError) {
        throw equipmentError
      }

      // ตรวจสอบว่าผู้ใช้เป็นเจ้าของอุปกรณ์หรือไม่
      if (equipment.seller_id !== session.user.id) {
        setIsOwner(false)
        throw new Error("คุณไม่มีสิทธิ์แก้ไขอุปกรณ์นี้")
      }

      setIsOwner(true)

      // ดึงข้อมูลรูปภาพ
      const { data: images, error: imagesError } = await supabase
        .from("equipment_images")
        .select("*")
        .eq("equipment_id", params.id)
        .order("is_main", { ascending: false })

      if (imagesError) {
        throw imagesError
      }

      // แยกข้อมูลติดต่อออกจากคำอธิบาย
      let description = equipment.description || ""
      let contactInfo = ""
      let phone = ""
      let email = ""
      let location = ""

      // ตรวจสอบว่ามีข้อมูลติดต่อในคำอธิบายหรือไม่
      const contactSectionIndex = description.indexOf("--- ข้อมูลติดต่อ ---")
      if (contactSectionIndex !== -1) {
        const contactSection = description.substring(contactSectionIndex)
        description = description.substring(0, contactSectionIndex).trim()

        // แยกข้อมูลติดต่อ
        const contactLines = contactSection.split("\n")
        for (const line of contactLines) {
          if (line.startsWith("ข้อมูลติดต่อ:")) {
            contactInfo = line.replace("ข้อมูลติดต่อ:", "").trim()
          } else if (line.startsWith("เบอร์โทร:")) {
            phone = line.replace("เบอร์โทร:", "").trim()
          } else if (line.startsWith("อีเมล:")) {
            email = line.replace("อีเมล:", "").trim()
          } else if (line.startsWith("สถานที่:")) {
            location = line.replace("สถานที่:", "").trim()
          }
        }
      }

      // ตั้งค่าข้อมูลฟอร์ม
      setFormData({
        name: equipment.name || "",
        type: equipment.type || "",
        condition: equipment.condition || "new",
        price: equipment.price?.toString() || "",
        brand: equipment.brand || "",
        description: description || "",
        contactInfo: contactInfo || "",
        phone: phone || "",
        email: email || "",
        location: location || "",
      })

      // ตั้งค่ารูปภาพที่มีอยู่
      setExistingImages(images || [])
    } catch (error) {
      console.error("Error fetching equipment data:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // เพิ่มการตรวจสอบขนาดไฟล์ในฟังก์ชัน handleImageUpload
  const handleImageUpload = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // จำกัดจำนวนรูปภาพไม่เกิน 5 รูป (รวมรูปเดิมและรูปใหม่)
    const maxImages = 5
    const remainingSlots = maxImages - (existingImages.length + newImages.length)
    const filesToAdd = Math.min(files.length, remainingSlots)

    if (remainingSlots <= 0) {
      alert("คุณสามารถอัปโหลดรูปภาพได้สูงสุด 5 รูป")
      return
    }

    const newImagesArray = [...newImages]
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
      newImagesArray.push({
        file: file,
        preview: imageUrl,
        name: file.name,
      })
    }

    setNewImages(newImagesArray)

    // รีเซ็ต input เพื่อให้สามารถเลือกไฟล์เดิมซ้ำได้
    e.target.value = null
  }

  const removeNewImage = (index) => {
    setNewImages((prev) => {
      const newImagesArray = [...prev]
      // ลบ URL ที่สร้างไว้เพื่อป้องกัน memory leak
      if (newImagesArray[index]?.preview) {
        URL.revokeObjectURL(newImagesArray[index].preview)
      }
      newImagesArray.splice(index, 1)
      return newImagesArray
    })
  }

  const removeExistingImage = async (imageId) => {
    // หารูปภาพที่ต้องการลบ
    const imageToDelete = existingImages.find((img) => img.id === imageId)

    if (imageToDelete && imageToDelete.image_url) {
      // ลบรูปภาพออกจาก Storage
      await deleteImageFromUrl(imageToDelete.image_url, "equipment-images")
    }

    // อัพเดทสถานะ UI
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // ตรวจสอบราคาไม่ให้ติดลบ
      if (Number.parseFloat(formData.price) < 0) {
        throw new Error("ราคาต้องไม่ติดลบ")
      }

      // เพิ่มข้อมูลติดต่อเข้าไปในคำอธิบาย
      let fullDescription = formData.description || ""

      // เพิ่มข้อมูลติดต่อทั้งหมดเข้าไปในคำอธิบาย
      const contactDetails = []

      if (formData.contactInfo) {
        contactDetails.push(`ข้อมูลติดต่อ: ${formData.contactInfo}`)
      }

      if (formData.phone) {
        contactDetails.push(`เบอร์โทร: ${formData.phone}`)
      }

      if (formData.email) {
        contactDetails.push(`อีเมล: ${formData.email}`)
      }

      if (formData.location) {
        contactDetails.push(`สถานที่: ${formData.location}`)
      }

      // เพิ่มข้อมูลติดต่อเข้าไปในคำอธิบายถ้ามีข้อมูล
      if (contactDetails.length > 0) {
        fullDescription += "\n\n--- ข้อมูลติดต่อ ---\n" + contactDetails.join("\n")
      }

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ถูกต้อง
      const equipmentData = {
        id: params.id,
        name: formData.name,
        type: formData.type,
        condition: formData.condition,
        price: Number.parseFloat(formData.price),
        brand: formData.brand || null,
        description: fullDescription,
        location: formData.location || null,
      }

      // อัพโหลดรูปภาพใหม่ไปยัง Supabase Storage (ถ้ามี)
      let newImageUrls = []
      if (newImages.length > 0) {
        const imagesToUpload = newImages.map((image) => image.file)
        // ใช้ timestamp แทนชื่ออุปกรณ์เพื่อป้องกันปัญหากับภาษาไทย
        const folderName = `equipment-edit-${Date.now()}`
        const { urls, errors: uploadErrors } = await uploadMultipleImages(
          imagesToUpload,
          "equipment-images",
          folderName,
        )

        if (uploadErrors.length > 0) {
          console.error("Some images failed to upload:", uploadErrors)
          setError(`บางรูปภาพอัพโหลดไม่สำเร็จ: ${uploadErrors[0]}`)
          setSaving(false)
          return
        }

        newImageUrls = urls
      }

      // ส่งข้อมูลไปยัง server action
      const { success, error } = await updateEquipment(
        equipmentData,
        newImageUrls,
        existingImages.map((img) => img.id),
      )

      if (error) {
        throw new Error(error)
      }

      setSuccess(true)

      // รอสักครู่แล้วนำทางไปยังหน้ารายละเอียดอุปกรณ์
      setTimeout(() => {
        router.push(`/equipment/${params.id}`)
      }, 2000)
    } catch (err) {
      console.error("Error updating equipment:", err)
      setError(err.message)
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="container mx-auto py-6 md:py-10 px-4 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error && !isOwner) {
    return (
      <div className="container mx-auto py-6 md:py-10 px-4">
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/profile/my-equipment")} className="mt-4">
          กลับไปยังรายการอุปกรณ์ของฉัน
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">แก้ไขอุปกรณ์</h1>
      <p className="text-gray-600 mb-6">แก้ไขข้อมูลอุปกรณ์ของคุณ</p>

      {error && (
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <AlertDescription>แก้ไขอุปกรณ์สำเร็จ! กำลังนำคุณไปยังหน้ารายละเอียด...</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center">
            ชื่ออุปกรณ์<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type" className="flex items-center">
            ประเภทอุปกรณ์<span className="text-red-500 ml-1">*</span>
          </Label>
          <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)} required>
            <SelectTrigger id="type">
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
            value={formData.condition}
            onValueChange={(value) => handleSelectChange("condition", value)}
            className="flex space-x-6"
            required
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">มือ 1 (ใหม่)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="used" id="used" />
              <Label htmlFor="used">มือ 2 (มือสอง)</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price" className="flex items-center">
              ราคา (บาท)<span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              placeholder="0"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">ยี่ห้อ</Label>
            <Input
              id="brand"
              name="brand"
              placeholder="เช่น Coleman, NatureHike"
              value={formData.brand}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center">
            รายละเอียด<span className="text-red-500 ml-1">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="บรรยายรายละเอียดของอุปกรณ์ เช่น สภาพ คุณสมบัติพิเศษ ข้อมูลจำเพาะ..."
            rows={4}
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center">
            รูปภาพ<span className="text-red-500 ml-1">*</span>{" "}
            <span className="text-gray-500 text-sm ml-2">(สูงสุด 5 รูป)</span>
          </Label>

          {/* รูปภาพที่มีอยู่เดิม */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">รูปภาพปัจจุบัน</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {existingImages.map((image) => (
                  <div key={image.id} className="relative">
                    <div className="h-24 w-full relative rounded overflow-hidden">
                      <Image
                        src={image.image_url || "/placeholder.svg"}
                        alt="รูปภาพอุปกรณ์"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      onClick={() => removeExistingImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {image.is_main && (
                      <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                        รูปหลัก
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* อัปโหลดรูปภาพใหม่ */}
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <div className="flex justify-center">
              <ImageIcon className="h-12 w-12 text-gray-400" />
            </div>
            <p className="mt-2 text-sm text-green-600 font-medium">คลิกเพื่ออัปโหลดรูปภาพเพิ่มเติม</p>
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP, HEIC ขนาดสูงสุด 5MB</p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              ref={fileInputRef}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4 text-sm border-green-500 text-green-500 hover:bg-green-50"
              onClick={() => fileInputRef.current.click()}
              disabled={existingImages.length + newImages.length >= 5}
            >
              เลือกรูปภาพ
            </Button>
          </div>

          {/* แสดงรูปภาพใหม่ที่อัปโหลด */}
          {newImages.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">รูปภาพใหม่</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {newImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.preview || "/placeholder.svg"}
                      alt={`รูปภาพ ${index + 1}`}
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      onClick={() => removeNewImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactInfo" className="flex items-center">
            ข้อมูลติดต่อ<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="contactInfo"
            name="contactInfo"
            placeholder="เช่น Line ID, Facebook"
            value={formData.contactInfo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
            <Input id="phone" name="phone" placeholder="08x-xxx-xxxx" value={formData.phone} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="example@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">สถานที่/ที่อยู่</Label>
          <Input
            id="location"
            name="location"
            placeholder="เช่น กรุงเทพฯ, เชียงใหม่"
            value={formData.location}
            onChange={handleChange}
          />
        </div>

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/equipment/${params.id}`)}
            disabled={saving}
          >
            ยกเลิก
          </Button>
          <Button type="submit" className="w-full bg-green-500 hover:bg-green-600" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </form>
    </div>
  )
}
