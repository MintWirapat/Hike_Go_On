"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, MoreVertical } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"
import { deleteCommentReply } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"
import { CommentReplyForm } from "./comment-reply-form"
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

export function CommentReplyItem({ reply, currentUserId, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()

  const isOwner = currentUserId === reply.user_id
  const formattedDate = formatDistanceToNow(new Date(reply.created_at), {
    addSuffix: true,
    locale: th,
  })

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteCommentReply(reply.id)

      if (result.error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "ลบการตอบกลับสำเร็จ",
          description: "การตอบกลับของคุณถูกลบออกแล้ว",
        })

        if (onDelete) {
          onDelete(reply.id)
        }
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบการตอบกลับได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUpdateSuccess = (updatedReply) => {
    setIsEditing(false)

    if (onUpdate) {
      onUpdate(updatedReply)
    }
  }

  if (isEditing) {
    return (
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {reply.user?.avatar_url ? (
                <img
                  src={reply.user.avatar_url || "/placeholder.svg"}
                  alt={reply.user?.username || "ผู้ใช้"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500">{(reply.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="ml-2">
              <div className="font-semibold text-sm">{reply.user?.username || "ผู้ใช้"}</div>
              <div className="text-xs text-gray-500">{formattedDate}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsEditing(false)}>
            <span className="sr-only">ยกเลิก</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>
        </div>

        <CommentReplyForm commentId={reply.comment_id} initialData={reply} onSuccess={handleUpdateSuccess} />
      </div>
    )
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {reply.user?.avatar_url ? (
              <img
                src={reply.user.avatar_url || "/placeholder.svg"}
                alt={reply.user?.username || "ผู้ใช้"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500">{(reply.user?.username || "ผู้ใช้").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="ml-2">
            <div className="font-semibold text-sm">{reply.user?.username || "ผู้ใช้"}</div>
            <p className="text-gray-700 text-sm whitespace-pre-line">{reply.content}</p>
            <div className="text-xs text-gray-500 mt-1">{formattedDate}</div>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-3 w-3" />
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>การลบการตอบกลับนี้จะไม่สามารถกู้คืนได้</AlertDialogDescription>
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
