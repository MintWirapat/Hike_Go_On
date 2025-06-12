"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Star, Edit2, Trash2, MoreVertical } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { deleteCampsiteReview } from "@/lib/supabase/review-actions"
import { useToast } from "@/hooks/use-toast"
import { CampsiteReviewForm } from "./campsite-review-form"
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

export function CampsiteReviewItem({ review, currentUserId, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const { toast } = useToast()

  const isOwner = currentUserId === review.user_id
  const formattedDate = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
    locale: th,
  })

  const handleEdit = () => {
    setIsEditing(true)
    setShowOptions(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteCampsiteReview(review.id)

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "ลบรีวิวสำเร็",
          description: "รีวิวของคุณถูกลบออกแล้ว",
        })

        if (onDelete) {
          onDelete(review.id)
        }
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบรีวิวได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUpdateSuccess = (updatedReview) => {
    setIsEditing(false)

    if (onUpdate) {
      onUpdate(updatedReview)
    }
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {review.user?.avatar_url ? (
                <img
                  src={review.user.avatar_url || "/placeholder.svg"}
                  alt={review.user?.username || "ผู้ใช้"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500">{(review.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="ml-3">
              <div className="font-semibold">{review.user?.username || "ผู้ใช้"}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            ยกเลิก
          </Button>
        </div>

        <CampsiteReviewForm campsiteId={review.campsite_id} initialData={review} onSuccess={handleUpdateSuccess} />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {review.user?.avatar_url ? (
              <img
                src={review.user.avatar_url || "/placeholder.svg"}
                alt={review.user?.username || "ผู้ใช้"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500">{(review.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="ml-3">
            <div className="font-semibold">{review.user?.username || "ผู้ใช้"}</div>
            <div className="text-xs text-gray-500">{formattedDate}</div>
          </div>
        </div>

        {isOwner && (
          <div className="relative">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowOptions(!showOptions)}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">เมนู</span>
            </Button>

            {showOptions && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  <button
                    onClick={handleEdit}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowOptions(false)
                      setShowDeleteDialog(true)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={`star-${star}`}
            className={`h-4 w-4 ${star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>

      <p className="text-gray-700 whitespace-pre-line">{review.content}</p>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>การลบรีวิวนี้จะไม่สามารถกู้คืนได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
              {isDeleting ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
