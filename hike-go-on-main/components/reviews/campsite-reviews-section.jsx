"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CampsiteReviewForm } from "./campsite-review-form"
import { CampsiteReviewItem } from "./campsite-review-item"
import { createClient } from "@/lib/supabase/client"
import { useAuthCheck } from "@/components/auth-check"
import { useRouter } from "next/navigation"
import { getCampsiteReviews } from "@/lib/actions/review-actions"
import { useToast } from "@/hooks/use-toast"

export function CampsiteReviewsSection({ campsiteId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { isLoggedIn } = useAuthCheck()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      try {
        const supabase = await createClient()

        // ดึงข้อมูลผู้ใช้ที่เข้าสู่ระบบ (ถ้ามี)
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        if (user) {
          setCurrentUserId(user.id)

          // ตรวจสอบว่าผู้ใช้เคยรีวิวแล้วหรือไม่
          const { data: userReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("user_id", user.id)
            .eq("campsite_id", campsiteId)
            .maybeSingle()

          setHasReviewed(!!userReview)
        }

        // ดึงข้อมูลรีวิวโดยใช้ฟังก์ชัน server action
        const { success, reviews, error } = await getCampsiteReviews(campsiteId)

        if (error) {
          console.error("Error fetching reviews:", error)
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถโหลดรีวิวได้ กรุณาลองใหม่อีกครั้ง",
            variant: "destructive",
          })
        } else if (success) {
          setReviews(reviews || [])
        }
      } catch (error) {
        console.error("Error in fetchReviews:", error)
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดรีวิวได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [campsiteId, toast])

  const handleReviewSuccess = (newReview) => {
    // เพิ่มข้อมูลผู้ใช้ลงในรีวิวใหม่
    const reviewWithUser = {
      ...newReview,
      user: {
        id: currentUserId,
        username: "คุณ", // ชื่อผู้ใช้เริ่มต้น
      },
    }

    setReviews((prevReviews) => [reviewWithUser, ...prevReviews])
    setHasReviewed(true)
    setShowForm(false)
  }

  const handleReviewUpdate = (updatedReview) => {
    console.log("Updating review in state:", updatedReview)

    setReviews((prevReviews) =>
      prevReviews.map((review) => {
        if (review.id === updatedReview.id) {
          // คงข้อมูลผู้ใช้เดิมไว้ แต่อัพเดทข้อมูลรีวิว
          return {
            ...updatedReview,
            user: review.user, // คงข้อมูลผู้ใช้เดิมไว้
          }
        }
        return review
      }),
    )
  }

  const handleReviewDelete = (reviewId) => {
    setReviews((prevReviews) => prevReviews.filter((review) => review.id !== reviewId))
    setHasReviewed(false)
  }

  const handleAddReviewClick = () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/campsite/${campsiteId}`)
      return
    }

    setShowForm(true)
  }

  // คำนวณคะแนนเฉลี่ย
  const averageRating =
    reviews.length > 0 ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : 0

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">รีวิวจากผู้เข้าพัก</h3>
          <p className="text-sm text-gray-500">
            {reviews.length} รีวิว • คะแนนเฉลี่ย {averageRating}
          </p>
        </div>
        {!hasReviewed && !showForm && (
          <Button onClick={handleAddReviewClick} className="bg-green-600 hover:bg-green-700">
            เขียนรีวิว
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 border rounded-lg p-4">
          <h4 className="font-semibold mb-2">เขียนรีวิวของคุณ</h4>
          <CampsiteReviewForm
            campsiteId={campsiteId}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={`skeleton-${i}`} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="ml-3">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="flex mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={`star-skeleton-${i}-${star}`} className="w-4 h-4 mr-1 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <CampsiteReviewItem
              key={`review-${review.id}`}
              review={review}
              currentUserId={currentUserId}
              onUpdate={handleReviewUpdate}
              onDelete={handleReviewDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-gray-500 mb-2">ยังไม่มีรีวิวสำหรับสถานที่แคมป์นี้</p>
          {!hasReviewed && !showForm && (
            <Button onClick={handleAddReviewClick} className="bg-green-600 hover:bg-green-700">
              เป็นคนแรกที่รีวิว
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
