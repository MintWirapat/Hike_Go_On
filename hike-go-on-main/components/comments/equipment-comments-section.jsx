"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuthCheck } from "@/components/auth-check"
import { EquipmentCommentForm } from "./equipment-comment-form"
import { EquipmentCommentItem } from "./equipment-comment-item"
import { getEquipmentComments } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function EquipmentCommentsSection({ equipmentId }) {
  const [comments, setComments] = useState([])
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const { isLoggedIn } = useAuthCheck()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true)
      try {
        const { success, comments, error } = await getEquipmentComments(equipmentId)

        if (error) {
          console.error("Error fetching comments:", error)
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดคอมเม้นต์ได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          })
          return
        }

        if (success) {
          setComments(comments)
        }
      } catch (error) {
        console.error("Error fetching comments:", error)
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดคอมเม้นต์ได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    const checkCurrentUser = async () => {
      try {
        const supabase = await createClient()
        const { data } = await supabase.auth.getUser()

        if (data?.user) {
          setCurrentUserId(data.user.id)
        }
      } catch (error) {
        console.error("Error checking current user:", error)
      }
    }

    fetchComments()
    checkCurrentUser()
  }, [equipmentId, toast])

  const handleAddCommentClick = () => {
    if (!isLoggedIn) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนเพื่อเพิ่มคอมเม้นต์",
        variant: "destructive",
      })
      router.push(`/login?redirect=/equipment/${equipmentId}`)
      return
    }

    setIsAddingComment(true)
  }

  const handleCommentSuccess = (newComment) => {
    setIsAddingComment(false)
    setComments([newComment, ...comments])
  }

  const handleCommentUpdate = (updatedComment) => {
    setComments(comments.map((comment) => (comment.id === updatedComment.id ? updatedComment : comment)))
  }

  const handleCommentDelete = (commentId) => {
    setComments(comments.filter((comment) => comment.id !== commentId))
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">คอมเม้นต์ ({comments.length})</h3>

      {!isAddingComment && (
        <Button className="mb-6 bg-green-600 hover:bg-green-700 text-sm md:text-base" onClick={handleAddCommentClick}>
          เพิ่มคอมเม้นต์
        </Button>
      )}

      {isAddingComment && (
        <div className="mb-6">
          <EquipmentCommentForm
            equipmentId={equipmentId}
            onSuccess={handleCommentSuccess}
            onCancel={() => setIsAddingComment(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
                </div>
              </div>
              <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <EquipmentCommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onUpdate={handleCommentUpdate}
              onDelete={handleCommentDelete}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic text-sm md:text-base">ยังไม่มีคอมเม้นต์ เป็นคนแรกที่คอมเม้นต์</p>
      )}
    </div>
  )
}
