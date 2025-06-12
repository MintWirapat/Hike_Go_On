"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, MoreVertical, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
// import { deleteEquipmentComment } from "@/lib/supabase/review-actions"
import { deleteEquipmentComment } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"
import { EquipmentCommentForm } from "./equipment-comment-form"
import { CommentReplyForm } from "./comment-reply-form"
import { CommentReplyItem } from "./comment-reply-item"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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

export function EquipmentCommentItem({ comment, currentUserId, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [replies, setReplies] = useState(comment.replies || [])
  const { toast } = useToast()

  const isOwner = currentUserId === comment.user_id
  const formattedDate = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: th,
  })

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteEquipmentComment(comment.id)

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "ลบคอมเม้นต์สำเร็จ",
          description: "คอมเม้นต์ของคุณถูกลบออกแล้ว",
        })

        if (onDelete) {
          onDelete(comment.id)
        }
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบคอมเม้นต์ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUpdateSuccess = (updatedComment) => {
    setIsEditing(false)

    if (onUpdate) {
      onUpdate(updatedComment)
    }
  }

  const handleReplySuccess = (newReply) => {
    setIsReplying(false)
    setReplies([...replies, newReply])
  }

  const handleReplyUpdate = (updatedReply) => {
    setReplies(replies.map((reply) => (reply.id === updatedReply.id ? updatedReply : reply)))
  }

  const handleReplyDelete = (replyId) => {
    setReplies(replies.filter((reply) => reply.id !== replyId))
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {comment.user?.avatar_url ? (
                <img
                  src={comment.user.avatar_url || "/placeholder.svg"}
                  alt={comment.user?.username || "ผู้ใช้"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500">{(comment.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="ml-3">
              <div className="font-semibold">{comment.user?.username || "ผู้ใช้"}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            ยกเลิก
          </Button>
        </div>

        <EquipmentCommentForm
          equipmentId={comment.equipment_id}
          initialData={comment}
          onSuccess={handleUpdateSuccess}
        />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {comment.user?.avatar_url ? (
              <img
                src={comment.user.avatar_url || "/placeholder.svg"}
                alt={comment.user?.username || "ผู้ใช้"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500">{(comment.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="ml-3">
            <div className="font-semibold">{comment.user?.username || "ผู้ใช้"}</div>
            <div className="text-xs text-gray-500">{formattedDate}</div>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">เมนู</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit2 className="mr-2 h-4 w-4" />
                <span>แก้ไข</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>ลบ</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="text-gray-700 whitespace-pre-line mb-3">{comment.content}</p>

      <div className="flex items-center mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700 p-0 h-auto"
          onClick={() => setIsReplying(!isReplying)}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          <span className="text-sm">ตอบกลับ</span>
        </Button>
      </div>

      {isReplying && (
        <div className="ml-6 mb-4">
          <CommentReplyForm
            commentId={comment.id}
            onSuccess={handleReplySuccess}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-6 space-y-3 mt-3 border-l-2 border-gray-100 pl-4">
          {replies.map((reply) => (
            <CommentReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              onUpdate={handleReplyUpdate}
              onDelete={handleReplyDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>การลบคอมเม้นต์นี้จะลบการตอบกลับทั้งหมดด้วย และไม่สามารถกู้คืนได้</AlertDialogDescription>
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
