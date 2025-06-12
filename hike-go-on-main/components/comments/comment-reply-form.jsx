"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateCommentReply } from "@/lib/supabase/review-actions"
import { addCommentReply } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"

export function CommentReplyForm({ commentId, initialData = null, onSuccess, onCancel }) {
  const [content, setContent] = useState(initialData?.content || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const isEditing = !!initialData

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (content.trim().length < 3) {
        toast({
          title: "เนื้อหาการตอบกลับสั้นเกินไป",
          description: "กรุณาเขียนการตอบกลับอย่างน้อย 3 ตัวอักษร",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      let result

      if (isEditing) {
        result = await updateCommentReply(initialData.id, content)
      } else {
        result = await addCommentReply(commentId, content)
      }

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: isEditing ? "แก้ไขการตอบกลับสำเร็จ" : "เพิ่มการตอบกลับสำเร็จ",
          description: isEditing ? "การตอบกลับของคุณถูกแก้ไขแล้ว" : "ขอบคุณสำหรับการตอบกลับของคุณ",
        })

        if (onSuccess) {
          onSuccess(result.reply)
        }
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตอบกลับได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="เขียนการตอบกลับของคุณที่นี่..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" className="bg-green-600 hover:bg-green-700" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "กำลังบันทึก..." : isEditing ? "แก้ไข" : "ตอบกลับ"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            ยกเลิก
          </Button>
        )}
      </div>
    </form>
  )
}
