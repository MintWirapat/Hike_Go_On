"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageIcon, X, Loader2, Plus, Trash2, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { uploadMultipleImages, deleteImageFromUrl } from "@/lib/supabase/storage"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// เพิ่มฟังก์ชัน getFacilityDisplayName ที่ด้านบนของไฟล์ (นอกฟังก์ชัน)
function getFacilityDisplayName(facilityName) {
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

export default function EditCampsite({ params }) {
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
  const [existingImages, setExistingImages] = useState([])
  const [newImages, setNewImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const fileInputRef = useRef(null)
  const [zones, setZones] = useState([])

  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push(`/login?redirect=/campsite/edit/${params.id}`)
      return
    }

    fetchCampsiteData()
  }, [params.id, router])

  // แก้ไขฟังก์ชัน fetchCampsiteData เพื่อให้ดึงข้อมูลสิ่งอำนวยความสะดวกและกฎระเบียบอย่างถูกต้อง
  const fetchCampsiteData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = await createClient()

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขสถานที่แคมป์")
      }

      // ดึข้อมูลสถานที่แคมป์
      const { data: campsite, error: campsiteError } = await supabase
        .from("campsites")
        .select("*")
        .eq("id", params.id)
        .single()

      if (campsiteError) {
        throw campsiteError
      }

      // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
      if (campsite.owner_id !== session.user.id) {
        setIsOwner(false)
        throw new Error("คุณไม่มีสิทธิ์แก้ไขสถานที่แคมป์นี้")
      }

      setIsOwner(true)

      // ดึงข้อมูลรูปภาพ
      const { data: images, error: imagesError } = await supabase
        .from("campsite_images")
        .select("*")
        .eq("campsite_id", params.id)
        .order("is_main", { ascending: false })

      if (imagesError) {
        throw imagesError
      }

      // ดึงข้อมูลสิ่งอำนวยความสะดวก
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("campsite_facilities")
        .select("*")
        .eq("campsite_id", params.id)

      if (facilitiesError) {
        throw facilitiesError
      }

      // ดึงข้อมูลกฎระเบียบ
      const { data: rulesData, error: rulesError } = await supabase
        .from("campsite_rules")
        .select("*")
        .eq("campsite_id", params.id)

      if (rulesError) {
        throw rulesError
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

          // แปลงข้อมูลรูปภาพให้อยู่ในรูปแบบที่ต้องการ
          const formattedImages = zoneImages.map((img) => ({
            id: img.id,
            preview: img.image_url,
            image_url: img.image_url,
          }))

          return { ...zone, images: formattedImages }
        }),
      )

      // ตั้งค่าข้อมูลฟอร์ม
      setFormData({
        name: campsite.name || "",
        province: campsite.province || "",
        description: campsite.description || "",
        price: campsite.price?.toString() || "",
        priceType: campsite.price_type || "perNight", // ดึงข้อมูลประเภทราคาจากฐานข้อมูล
        phone: campsite.phone || "",
        email: campsite.email || "",
        website: campsite.website || "",
        latitude: campsite.latitude?.toString() || "",
        longitude: campsite.longitude?.toString() || "",
        location: campsite.location || "",
      })

      // ตั้งค่ารูปภาพที่มีอยู่
      setExistingImages(images || [])

      // ตั้งค่าสิ่งอำนวยความสะดวก
      console.log("Facilities data from DB:", facilitiesData)
      if (facilitiesData && facilitiesData.length > 0) {
        // เก็บข้อมูลทั้ง id, name และ label
        const formattedFacilities = facilitiesData.map((f) => ({
          id: f.id,
          name: f.name,
          label: f.label || getFacilityDisplayName(f.name),
        }))
        console.log("Setting facilities to:", formattedFacilities)
        setFacilities(formattedFacilities)
      } else {
        console.log("No facilities found, setting empty array")
        setFacilities([])
      }

      // ตั้งค่ากฎระเบียบ
      console.log("Rules data from DB:", rulesData)
      if (rulesData && rulesData.length > 0) {
        const formattedRules = rulesData.map((r) => ({
          id: r.id,
          rule: r.rule,
        }))
        console.log("Setting rules to:", formattedRules)
        setRules(formattedRules)
      } else {
        console.log("No rules found, setting empty array")
        setRules([])
      }

      // ตั้งค่าโซน
      if (zonesWithImages && zonesWithImages.length > 0) {
        setZones(zonesWithImages)
      } else {
        // ถ้าไม่มีโซน ให้สร้างโซนเริ่มต้น
        setZones([
          {
            name: "Zone A",
            width: "",
            length: "",
            description: "",
            capacity: "",
            images: [],
          },
        ])
      }
    } catch (error) {
      console.error("Error fetching campsite data:", error)
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

  const handleFacilityChange = (facility) => {
    setFacilities((prev) => {
      // ตรวจสอบว่ามี facility.id อยู่ใน array หรือไม่
      const existingIndex = prev.findIndex((item) =>
        typeof item === "string" ? item === facility.id : item.id === facility.id || item.name === facility.id,
      )

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
      await deleteImageFromUrl(imageToDelete.image_url, "campsite-images")
    }

    // อัพเดทสถานะ UI
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
  }

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
        description: "",
        capacity: "",
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
    if (currentImages[imageIndex]?.preview && !currentImages[imageIndex].image_url) {
      URL.revokeObjectURL(currentImages[imageIndex].preview)
    }

    currentImages.splice(imageIndex, 1)
    newZones[zoneIndex].images = currentImages
    setZones(newZones)
  }

  // แก้ไขฟังก์ชัน handleSubmit เพื่อให้ส่งข้อมูลสิ่งอำนวยความสะดวกและกฎระเบียบอย่างถูกต้อง
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

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ถูกต้อง
      const campsiteData = {
        id: params.id,
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

      // อัพโหลดรูปภาพใหม่ไปยัง Supabase Storage (ถ้ามี)
      let newImageUrls = []
      if (newImages.length > 0) {
        const imagesToUpload = newImages.map((image) => image.file)
        // ใช้ timestamp แทนชื่อสถานที่เพื่อป้องกันปัญหากับภาษาไทย
        const folderName = `campsite-edit-${Date.now()}`
        const { urls, errors: uploadErrors } = await uploadMultipleImages(imagesToUpload, "campsite-images", folderName)

        if (uploadErrors.length > 0) {
          console.error("Some images failed to upload:", uploadErrors)
          setError(`บางรูปภาพอัพโหลดไม่สำเร็จ: ${uploadErrors[0]}`)
          setSaving(false)
          return
        }

        newImageUrls = urls
      }

      // อัพโหลดรูปภาพของแต่ละโซน
      const folderName = `campsite-edit-${Date.now()}`
      const zonesWithImages = await Promise.all(
        zones.map(async (zone, index) => {
          const zoneImages = zone.images.filter((img) => img.file).map((image) => image.file)
          const zoneFolderName = `${folderName}/zone-${index}`
          let zoneImageUrls = []

          if (zoneImages.length > 0) {
            const { urls, errors: zoneUploadErrors } = await uploadMultipleImages(
              zoneImages,
              "campsite-images",
              zoneFolderName,
            )

            if (zoneUploadErrors.length > 0) {
              console.error(`Some images for zone ${zone.name} failed to upload:`, zoneUploadErrors)
              throw new Error(`บางรูปภาพของ ${zone.name} อัพโหลดไม่สำเร็จ`)
            }

            zoneImageUrls = urls
          }

          // รวมรูปภาพเดิมที่ไม่ได้ลบ
          const existingImageUrls = zone.images.filter((img) => img.image_url && !img.file).map((img) => img.image_url)

          // แก้ไขตรงนี้: ตรวจสอบว่า capacity ถูกแปลงเป็นตัวเลขอย่างถูกต้อง
          const zoneData = {
            id: zone.id, // ส่ง id ไปด้วยถ้ามี
            name: zone.name,
            width: zone.width,
            length: zone.length,
            description: zone.description,
            capacity: zone.capacity && zone.capacity !== "" ? Number.parseInt(zone.capacity) : null,
            imageUrls: [...existingImageUrls, ...zoneImageUrls],
            images: undefined, // ไม่ส่ง File objects ไปยัง server
          }
          console.log("Zone data being sent:", zoneData)
          return zoneData
        }),
      )

      console.log("Zones data being sent:", zonesWithImages)
      console.log("Facilities being sent:", facilities)
      console.log("Rules being sent:", rules)

      // ส่งข้อมูลไปยัง server action
      const supabase = await createClient()

      // อัปเดตข้อมูลสถานที่แคมป์
      const { error: updateError } = await supabase
        .from("campsites")
        .update({
          name: campsiteData.name,
          description: campsiteData.description,
          location: campsiteData.location,
          province: campsiteData.province,
          price: campsiteData.price,
          price_type: campsiteData.price_type, // เพิ่มการอัปเดตประเภทราคา
          latitude: campsiteData.latitude,
          longitude: campsiteData.longitude,
          phone: campsiteData.phone,
          email: campsiteData.email,
          website: campsiteData.website,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campsiteData.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // ลบข้อมูลสิ่งอำนวยความสะดวกเดิม
      await supabase.from("campsite_facilities").delete().eq("campsite_id", campsiteData.id)

      // เพิ่มข้อมูลสิ่งอำนวยความสะดวกใหม่
      if (facilities && facilities.length > 0) {
        const campFacilities = facilities.map((facility) => ({
          campsite_id: campsiteData.id,
          name: facility.name,
        }))

        const { error: facilitiesError } = await supabase.from("campsite_facilities").insert(campFacilities)
        if (facilitiesError) {
          console.error("Error adding facilities:", facilitiesError)
        }
      }

      // ลบข้อมูลกฎระเบียบเดิม
      await supabase.from("campsite_rules").delete().eq("campsite_id", campsiteData.id)

      // เพิ่มข้อมูลกฎระเบียบใหม่
      if (rules && rules.length > 0) {
        const campRules = rules.map((rule) => ({
          campsite_id: campsiteData.id,
          rule: rule.rule,
        }))

        const { error: rulesError } = await supabase.from("campsite_rules").insert(campRules)
        if (rulesError) {
          console.error("Error adding rules:", rulesError)
        }
      }

      // ลบรูปภาพที่ไม่ได้อยู่ในรายการ existingImageIds
      const existingImageIds = existingImages.map((img) => img.id)
      if (existingImageIds && existingImageIds.length > 0) {
        await supabase
          .from("campsite_images")
          .delete()
          .eq("campsite_id", campsiteData.id)
          .not("id", "in", `(${existingImageIds.join(",")})`)
      } else {
        // ถ้าไม่มีรูปภาพเดิมเหลืออยู่ ให้ลบทั้งหมด
        await supabase.from("campsite_images").delete().eq("campsite_id", campsiteData.id)
      }

      // เพิ่มรูปภาพใหม่
      if (newImageUrls && newImageUrls.length > 0) {
        // ตรวจสอบว่ามีรูปหลักหรือไม่
        const { data: mainImage } = await supabase
          .from("campsite_images")
          .select("id")
          .eq("campsite_id", campsiteData.id)
          .eq("is_main", true)
          .maybeSingle()

        const hasMainImage = !!mainImage

        const campsiteImages = newImageUrls.map((url, index) => ({
          campsite_id: campsiteData.id,
          image_url: url,
          is_main: !hasMainImage && index === 0, // ถ้าไม่มีรูปหลัก ให้รูปแรกเป็นรูปหลัก
        }))

        await supabase.from("campsite_images").insert(campsiteImages)
      }

      // อัพเดทข้อมูลโซน
      if (zonesWithImages && zonesWithImages.length > 0) {
        console.log("Received zones data from client:", zonesWithImages)
        // ลบข้อมูลโซนเดิมและรูปภาพของโซน
        const { data: existingZones } = await supabase
          .from("campsite_zones")
          .select("id")
          .eq("campsite_id", campsiteData.id)

        if (existingZones && existingZones.length > 0) {
          const zoneIds = existingZones.map((zone) => zone.id)

          // ลบรูปภาพของโซน
          await supabase.from("campsite_zone_images").delete().in("zone_id", zoneIds)

          // ลบโซน
          await supabase.from("campsite_zones").delete().in("id", zoneIds)
        }

        // เพิ่มข้อมูลโซนใหม่
        // แก้ไขตรงนี้: ตรวจสอบว่า capacity ถูกส่งมาและแปลงเป็นตัวเลขอย่างถูกต้อง
        const campZones = zonesWithImages.map((zone) => {
          console.log("Zone capacity before conversion:", zone.capacity, typeof zone.capacity)
          return {
            campsite_id: campsiteData.id,
            name: zone.name,
            width: zone.width ? Number.parseFloat(zone.width) : null,
            length: zone.length ? Number.parseFloat(zone.length) : null,
            description: zone.description || null,
            capacity: zone.capacity !== "" && zone.capacity !== undefined ? Number.parseInt(zone.capacity) : null,
          }
        })

        console.log("Zones data being saved to database:", campZones)
        const { data: zones, error: zonesError } = await supabase.from("campsite_zones").insert(campZones).select()

        if (zonesError) {
          console.error("Error updating campsite zones:", zonesError)
          throw new Error(zonesError.message)
        }

        // เพิ่มรูปภาพของแต่ละโซน
        for (let i = 0; i < zonesWithImages.length; i++) {
          const zone = zonesWithImages[i]
          const zoneId = zones[i].id

          if (zone.imageUrls && zone.imageUrls.length > 0) {
            const zoneImages = zone.imageUrls.map((url) => ({
              zone_id: zoneId,
              image_url: url,
            }))

            const { error: zoneImagesError } = await supabase.from("campsite_zone_images").insert(zoneImages)

            if (zoneImagesError) {
              console.error(`Error adding images for zone ${zone.name}:`, zoneImagesError)
              // ไม่ return error เพื่อให้สามารถดำเนินการต่อได้
            }
          }
        }
      }

      setSuccess(true)

      // รอสักครู่แล้วนำทางไปยังหน้ารายละเอียดสถานที่แคมป์
      setTimeout(() => {
        router.push(`/campsite/${params.id}`)
      }, 2000)
    } catch (err) {
      console.error("Error updating campsite:", err)
      setError(err.message)
    } finally {
      setSaving(false)
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
        <Button onClick={() => router.push("/profile/my-campsites")} className="mt-4">
          กลับไปยังรายการสถานที่แคมป์ของฉัน
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">แก้ไขสถานที่แคมป์</h1>
      <p className="text-gray-600 mb-6">แก้ไขข้อมูลสถานที่แคมป์ของคุณ</p>

      {error && (
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <AlertDescription>แก้ไขสถานที่แคมป์สำเร็จ! กำลังนำคุณไปยังหน้ารายละเอียด...</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center">
            ชื่อสถานที่แคมป์<span className="text-red-500 ml-1">*</span>
          </Label>
          <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
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
                        alt="รูปภาพสถานที่แคมป์"
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
          <Label>สิ่งอำนวยความสะดวก</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {facilityOptions.map((facility) => (
              <div key={facility.id} className="flex items-center space-x-2">
                <Checkbox
                  id={facility.id}
                  checked={facilities.some((item) =>
                    typeof item === "string"
                      ? item === facility.id
                      : item.id === facility.id || item.name === facility.id,
                  )}
                  onCheckedChange={() => handleFacilityChange(facility)}
                />
                <Label htmlFor={facility.id} className="text-sm">
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
                <li
                  key={typeof ruleItem === "string" ? index : ruleItem.id || index}
                  className="flex items-center justify-between bg-gray-50 p-2 rounded"
                >
                  <span>{typeof ruleItem === "string" ? ruleItem : ruleItem.rule}</span>
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
                        value={zone.width || ""}
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
                        value={zone.length || ""}
                        onChange={(e) => updateZone(zoneIndex, "length", e.target.value)}
                        placeholder="0.0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`zone-capacity-${zoneIndex}`} className="flex items-center">
                      <Users className="h-4 w-4 mr-1" /> จำนวนคนที่รองรับได้
                    </Label>
                    <Input
                      id={`zone-capacity-${zoneIndex}`}
                      type="number"
                      min="1"
                      value={zone.capacity || ""}
                      onChange={(e) => updateZone(zoneIndex, "capacity", e.target.value)}
                      placeholder="จำนวนคน"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`zone-description-${zoneIndex}`}>คำอธิบายโซน</Label>
                    <Textarea
                      id={`zone-description-${zoneIndex}`}
                      value={zone.description || ""}
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
                    {zone.images && zone.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {zone.images.map((image, imageIndex) => (
                          <div key={imageIndex} className="relative">
                            <div className="h-20 w-full relative rounded overflow-hidden">
                              <Image
                                src={image.preview || image.image_url || "/placeholder.svg"}
                                alt={`รูปภาพโซน ${zone.name} ${imageIndex + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
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

        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/campsite/${params.id}`)}
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
