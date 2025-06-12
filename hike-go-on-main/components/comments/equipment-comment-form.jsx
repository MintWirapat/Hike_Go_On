"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addEquipmentComment, updateEquipmentComment } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"

export function EquipmentCommentForm({ equipmentId, initialData = null, onSuccess, onCancel }) {
  const [content, setContent] = useState(initialData?.content || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const isEditing = !!initialData

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (content.trim().length < 5) {
        toast({
          title: "เนื้อหาคอมเม้นต์สั้นเกินไป",
          description: "กรุณาเขียนคอมเม้นต์อย่างน้อย 5 ตัวอักษร",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      let result

      if (isEditing) {
        console.log("Updating comment:", {
          commentId: initialData.id,
          content,
        })
        result = await updateEquipmentComment(initialData.id, content)
      } else {
        console.log("Adding comment:", {
          equipmentId,
          content,
        })
        result = await addEquipmentComment(equipmentId, content)
      }

      console.log("Comment result:", result)

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: isEditing ? "แก้ไขคอมเม้นต์สำเร็จ" : "เพิ่มคอมเม้นต์สำเร็จ",
          description: isEditing ? "คอมเม้นต์ของคุณถูกแก้ไขแล้ว" : "ขอบคุณสำหรับคอมเม้นต์ของคุณ",
        })

        if (onSuccess) {
          onSuccess(result.comment)
        }
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกคอมเม้นต์ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700 mb-1">
          คอมเม้นต์ของคุณ
        </label>
        <Textarea
          id="comment-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="เขียนคอมเม้นต์ของคุณที่นี่..."
          className="min-h-[100px]"
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : isEditing ? "แก้ไขคอมเม้นต์" : "เพิ่มคอมเม้นต์"}
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
