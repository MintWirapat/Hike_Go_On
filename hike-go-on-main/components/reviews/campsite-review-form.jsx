"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { addCampsiteReview, updateCampsiteReview } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"

export function CampsiteReviewForm({ campsiteId, initialData = null, onSuccess, onCancel }) {
  const [rating, setRating] = useState(initialData?.rating || 5)
  const [content, setContent] = useState(initialData?.content || "")
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const isEditing = !!initialData

  // เพิ่ม useEffect เพื่อให้แน่ใจว่า state ถูกอัพเดทเมื่อ initialData เปลี่ยน
  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating || 5)
      setContent(initialData.content || "")
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (content.trim().length < 5) {
        toast({
          title: "เนื้อหารีวิวสั้นเกินไป",
          description: "กรุณาเขียนรีวิวอย่างน้อย 5 ตัวอักษร",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      let result

      if (isEditing) {
        console.log("Updating review:", {
          reviewId: initialData.id,
          rating,
          content,
        })

        result = await updateCampsiteReview(initialData.id, rating, content)
      } else {
        console.log("Adding review:", {
          campsiteId,
          rating,
          content,
        })

        result = await addCampsiteReview(campsiteId, rating, content)
      }

      console.log("Review result:", result)

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: isEditing ? "แก้ไขรีวิวสำเร็จ" : "เพิ่มรีวิวสำเร็จ",
          description: isEditing ? "รีวิวของคุณถูกแก้ไขแล้ว" : "ขอบคุณสำหรับรีวิวของคุณ",
        })

        // ตรวจสอบว่าข้อมูลรีวิวอยู่ในรูปแบบใด
        const reviewData = result.review || (result.data && result.data[0]) || result.data

        if (onSuccess && reviewData) {
          onSuccess(reviewData)
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกรีวิวได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">คะแนน</label>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 focus:outline-none"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              <Star
                className={`h-6 w-6 ${
                  star <= (hoveredRating || rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-1">
          รีวิวของคุณ
        </label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="เขียนรีวิวของคุณที่นี่..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : isEditing ? "แก้ไขรีวิว" : "เพิ่มรีวิว"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            ยกเลิก
          </Button>
        )}
      </div>
    </form>
  )
}
