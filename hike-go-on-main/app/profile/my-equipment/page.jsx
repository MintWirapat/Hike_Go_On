"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2, Plus, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { deleteEquipment } from "@/lib/actions/equipment-actions"
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

export default function MyEquipmentPage() {
  const router = useRouter()
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push("/login?redirect=/profile/my-equipment")
      return
    }

    fetchMyEquipment()
  }, [router])

  const fetchMyEquipment = async () => {
    setLoading(true)
    setError(null)

    try {
      // เพิ่ม await ตรงนี้
      const supabase = await createClient()

      // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("กรุณาเข้าสู่ระบบก่อนดูรายการอุปกรณ์ของคุณ")
      }

      // ดึงข้อมูลอุปกรณ์ที่ผู้ใช้เป็นเจ้าของ
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          images:equipment_images(*)
        `)
        .eq("seller_id", session.user.id)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }

      setEquipment(data || [])
    } catch (error) {
      console.error("Error fetching equipment:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (item) => {
    setEquipmentToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return

    setIsDeleting(true)
    try {
      const { success, error } = await deleteEquipment(equipmentToDelete.id)

      if (error) {
        throw new Error(error)
      }

      if (success) {
        // อัปเดตรายการอุปกรณ์หลังจากลบสำเร็จ
        setEquipment(equipment.filter((item) => item.id !== equipmentToDelete.id))
        setDeleteDialogOpen(false)
        setEquipmentToDelete(null)
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      alert(`ไม่สามารถลบอุปกรณ์ได้: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // ฟังก์ชันสำหรับหาภาพหลักของอุปกรณ์
  const getMainImage = (images) => {
    if (!images || images.length === 0) return "/lakeside-campout.png"
    const mainImage = images.find((img) => img.is_main) || images[0]
    return mainImage.image_url || "/lakeside-campout.png"
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">อุปกรณ์ของฉัน</h1>
        <Link href="/equipment-post">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มอุปกรณ์
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="bg-white p-4 rounded-b-lg border border-gray-200">
                <div className="h-5 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : equipment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={getMainImage(item.images) || "/placeholder.svg"}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="text-lg font-bold mb-1 line-clamp-1">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{item.type}</p>
                <p className="text-gray-700 mb-3 text-sm line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-green-700">{item.price} บาท</p>
                  <div className="flex space-x-2">
                    <Link href={`/equipment/edit/${item.id}`}>
                      <Button variant="outline" size="sm" className="border-blue-500 text-blue-500 hover:bg-blue-50">
                        <Pencil className="h-4 w-4 mr-1" />
                        แก้ไข
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      ลบ
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">คุณยังไม่มีอุปกรณ์</h2>
          <p className="text-gray-600 mb-6">เพิ่มอุปกรณ์แรกของคุณเพื่อให้ผู้ใช้คนอื่นค้นพบ</p>
          <Link href="/equipment-post">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มอุปกรณ์
            </Button>
          </Link>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>
              การลบอุปกรณ์ "{equipmentToDelete?.name}" จะไม่สามารถกู้คืนได้ ข้อมูลทั้งหมดรวมถึงรูปภาพและความคิดเห็นจะถูกลบออกจากระบบ
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
    </div>
  )
}
