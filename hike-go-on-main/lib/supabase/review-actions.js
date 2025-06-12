"use server"

import { createClient } from "./server"
import { revalidatePath } from "next/cache"

// ฟังก์ชันสำหรับเพิ่มรีวิวแคมป์ไซต์
export async function addCampsiteReview(campsiteId, rating, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มรีวิว" }
    }

    // ตรวจสอบว่าผู้ใช้เคยรีวิวแคมป์ไซต์นี้แล้วหรือไม่
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("campsite_id", campsiteId)
      .maybeSingle()

    if (existingReview) {
      return { error: "คุณได้รีวิวแคมป์ไซต์นี้ไปแล้ว กรุณาแก้ไขรีวิวเดิมแทน" }
    }

    // เพิ่มรีวิวใหม่
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        user_id: session.user.id,
        campsite_id: campsiteId,
        rating,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding review:", error)
      return { error: error.message }
    }

    revalidatePath(`/campsite/${campsiteId}`)
    return { success: true, review: data }
  } catch (error) {
    console.error("Error in addCampsiteReview:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการเพิ่มรีวิว" }
  }
}

// ฟังก์ชันสำหรับแก้ไขรีวิวแคมป์ไซต์
export async function updateCampsiteReview(reviewId, rating, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนแก้ไขรีวิว" }
    }

    // ตรวจสอบว่ารีวิวนี้เป็นของผู้ใช้หรือไม่
    const { data: existingReview, error: checkError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .eq("user_id", session.user.id)
      .single()

    if (checkError || !existingReview) {
      console.error("Error checking review ownership:", checkError)
      return { error: "คุณไม่มีสิทธิ์แก้ไขรีวิวนี้" }
    }

    // อัพเดทรีวิว
    const { data, error } = await supabase
      .from("reviews")
      .update({
        rating,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select()

    if (error) {
      console.error("Error updating review:", error)
      return { error: "ไม่สามารถแก้ไขรีวิวได้" }
    }

    revalidatePath(`/campsite/${existingReview.campsite_id}`)

    // ส่งข้อมูลรีวิวที่อัพเดทแล้วกลับไป
    return {
      success: true,
      review: data[0] || existingReview,
    }
  } catch (error) {
    console.error("Error in updateCampsiteReview:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขรีวิว" }
  }
}

// ฟังก์ชันสำหรับลบรีวิวแคมป์ไซต์
export async function deleteCampsiteReview(reviewId) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนลบรีวิว" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของรีวิวหรือไม่
    const { data: review } = await supabase.from("reviews").select("user_id, campsite_id").eq("id", reviewId).single()

    if (!review) {
      return { error: "ไม่พบรีวิวที่ต้องการลบ" }
    }

    if (review.user_id !== session.user.id) {
      return { error: "คุณไม่มีสิทธิ์ลบรีวิวนี้" }
    }

    // ลบรีวิว
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId)

    if (error) {
      console.error("Error deleting review:", error)
      return { error: error.message }
    }

    revalidatePath(`/campsite/${review.campsite_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error in deleteCampsiteReview:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการลบรีวิว" }
  }
}

// ฟังก์ชันสำหรับดึงรีวิวของแคมป์ไซต์
export async function getCampsiteReviews(campsiteId) {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        user:profiles(id, username, avatar_url)
      `)
      .eq("campsite_id", campsiteId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching reviews:", error)
      return { error: error.message }
    }

    return { success: true, reviews: data }
  } catch (error) {
    console.error("Error in getCampsiteReviews:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว" }
  }
}

// ฟังก์ชันสำหรับเพิ่มคอมเม้นต์อุปกรณ์
export async function addEquipmentComment(equipmentId, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มคอมเม้นต์" }
    }

    // เพิ่มคอมเม้นต์ใหม่
    const { data, error } = await supabase
      .from("equipment_comments")
      .insert({
        user_id: session.user.id,
        equipment_id: equipmentId,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding comment:", error)
      return { error: error.message }
    }

    // ดึงข้อมูลผู้ใช้เพื่อส่งกลับไปพร้อมกับคอมเม้นต์
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
    }

    // เพิ่มข้อมูลผู้ใช้เข้าไปในคอมเม้นต์
    const commentWithUser = {
      ...data,
      user: userData || null,
      replies: [],
    }

    revalidatePath(`/equipment/${equipmentId}`)
    return { success: true, comment: commentWithUser }
  } catch (error) {
    console.error("Error in addEquipmentComment:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการเพิ่มคอมเม้นต์" }
  }
}

// ฟังก์ชันสำหรับแก้ไขคอมเม้นต์อุปกรณ์
export async function updateEquipmentComment(commentId, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนแก้ไขคอมเม้นต์" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของคอมเม้นต์หรือไม่
    const { data: comment } = await supabase
      .from("equipment_comments")
      .select("user_id, equipment_id")
      .eq("id", commentId)
      .single()

    if (!comment) {
      return { error: "ไม่พบคอมเม้นต์ที่ต้องการแก้ไข" }
    }

    if (comment.user_id !== session.user.id) {
      return { error: "คุณไม่มีสิทธิ์แก้ไขคอมเม้นต์นี้" }
    }

    // แก้ไขคอมเม้นต์
    const { data, error } = await supabase
      .from("equipment_comments")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select()
      .single()

    if (error) {
      console.error("Error updating comment:", error)
      return { error: error.message }
    }

    // ดึงข้อมูลผู้ใช้เพื่อส่งกลับไปพร้อมกับคอมเม้นต์
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
    }

    // ดึงข้อมูลการตอบกลับของคอมเม้นต์นี้
    const { data: replies, error: repliesError } = await supabase
      .from("comment_replies")
      .select("*")
      .eq("comment_id", commentId)
      .order("created_at", { ascending: true })

    if (repliesError) {
      console.error("Error fetching replies:", repliesError)
    }

    // เพิ่มข้อมูลผู้ใช้และการตอบกลับเข้าไปในคอมเม้นต์
    const commentWithUserAndReplies = {
      ...data,
      user: userData || null,
      replies: replies || [],
    }

    revalidatePath(`/equipment/${comment.equipment_id}`)
    return { success: true, comment: commentWithUserAndReplies }
  } catch (error) {
    console.error("Error in updateEquipmentComment:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขคอมเม้นต์" }
  }
}

// ฟังก์ชันสำหรับลบคอมเม้นต์อุปกรณ์
export async function deleteEquipmentComment(commentId) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนลบคอมเม้นต์" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของคอมเม้นต์หรือไม่
    const { data: comment } = await supabase
      .from("equipment_comments")
      .select("user_id, equipment_id")
      .eq("id", commentId)
      .single()

    if (!comment) {
      return { error: "ไม่พบคอมเม้นต์ที่ต้องการลบ" }
    }

    if (comment.user_id !== session.user.id) {
      return { error: "คุณไม่มีสิทธิ์ลบคอมเม้นต์นี้" }
    }

    // ลบการตอบกลับทั้งหมดของคอมเม้นต์นี้
    await supabase.from("comment_replies").delete().eq("comment_id", commentId)

    // ลบคอมเม้นต์
    const { error } = await supabase.from("equipment_comments").delete().eq("id", commentId)

    if (error) {
      console.error("Error deleting comment:", error)
      return { error: error.message }
    }

    revalidatePath(`/equipment/${comment.equipment_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error in deleteEquipmentComment:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการลบคอมเม้นต์" }
  }
}

// ฟังก์ชันสำหรับเพิ่มการตอบกลับคอมเม้นต์
export async function addCommentReply(commentId, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มการตอบกลับ" }
    }

    // ตรวจสอบว่าคอมเม้นต์ที่ต้องการตอบกลับมีอยู่จริงหรือไม่
    const { data: comment } = await supabase
      .from("equipment_comments")
      .select("equipment_id")
      .eq("id", commentId)
      .single()

    if (!comment) {
      return { error: "ไม่พบคอมเม้นต์ที่ต้องการตอบกลับ" }
    }

    // เพิ่มการตอบกลับใหม่
    const { data, error } = await supabase
      .from("comment_replies")
      .insert({
        user_id: session.user.id,
        comment_id: commentId,
        content,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding reply:", error)
      return { error: error.message }
    }

    // ดึงข้อมูลผู้ใช้เพื่อส่งกลับไปพร้อมกับการตอบกลับ
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
    }

    // เพิ่มข้อมูลผู้ใช้เข้าไปในการตอบกลับ
    const replyWithUser = {
      ...data,
      user: userData || null,
    }

    revalidatePath(`/equipment/${comment.equipment_id}`)
    return { success: true, reply: replyWithUser }
  } catch (error) {
    console.error("Error in addCommentReply:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการเพิ่มการตอบกลับ" }
  }
}

// ฟังก์ชันสำหรับแก้ไขการตอบกลับคอมเม้นต์
export async function updateCommentReply(replyId, content) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนแก้ไขการตอบกลับ" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของการตอบกลับหรือไม่
    const { data: reply } = await supabase
      .from("comment_replies")
      .select("user_id, comment_id")
      .eq("id", replyId)
      .single()

    if (!reply) {
      return { error: "ไม่พบการตอบกลับที่ต้องการแก้ไข" }
    }

    if (reply.user_id !== session.user.id) {
      return { error: "คุณไม่มีสิทธิ์แก้ไขการตอบกลับนี้" }
    }

    // แก้ไขการตอบกลับ
    const { data, error } = await supabase
      .from("comment_replies")
      .update({
        content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", replyId)
      .select()
      .single()

    if (error) {
      console.error("Error updating reply:", error)
      return { error: error.message }
    }

    // ดึงข้อมูลผู้ใช้เพื่อส่งกลับไปพร้อมกับการตอบกลับ
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
    }

    // เพิ่มข้อมูลผู้ใช้เข้าไปในการตอบกลับ
    const replyWithUser = {
      ...data,
      user: userData || null,
    }

    // ดึงข้อมูล equipment_id จากคอมเม้นต์
    const { data: comment } = await supabase
      .from("equipment_comments")
      .select("equipment_id")
      .eq("id", reply.comment_id)
      .single()

    revalidatePath(`/equipment/${comment.equipment_id}`)
    return { success: true, reply: replyWithUser }
  } catch (error) {
    console.error("Error in updateCommentReply:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการแก้ไขการตอบกลับ" }
  }
}

// ฟังก์ชันสำหรับลบการตอบกลับคอมเม้นต์
export async function deleteCommentReply(replyId) {
  try {
    const supabase = createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return { error: "กรุณาเข้าสู่ระบบก่อนลบการตอบกลับ" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของการตอบกลับหรือไม่
    const { data: reply } = await supabase
      .from("comment_replies")
      .select("user_id, comment_id")
      .eq("id", replyId)
      .single()

    if (!reply) {
      return { error: "ไม่พบการตอบกลับที่ต้องการลบ" }
    }

    if (reply.user_id !== session.user.id) {
      return { error: "คุณไม่มีสิทธิ์ลบการตอบกลับนี้" }
    }

    // ลบการตอบกลับ
    const { error } = await supabase.from("comment_replies").delete().eq("id", replyId)

    if (error) {
      console.error("Error deleting reply:", error)
      return { error: error.message }
    }

    // ดึงข้อมูล equipment_id จากคอมเม้นต์
    const { data: comment } = await supabase
      .from("equipment_comments")
      .select("equipment_id")
      .eq("id", reply.comment_id)
      .single()

    revalidatePath(`/equipment/${comment.equipment_id}`)
    return { success: true }
  } catch (error) {
    console.error("Error in deleteCommentReply:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการลบการตอบกลับ" }
  }
}

// ฟังก์ชันสำหรับดึงคอมเม้นต์และการตอบกลับของอุปกรณ์
export async function getEquipmentComments(equipmentId) {
  try {
    const supabase = createClient()

    // ดึงคอมเม้นต์
    const { data: comments, error: commentsError } = await supabase
      .from("equipment_comments")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("created_at", { ascending: false })

    if (commentsError) {
      console.error("Error fetching comments:", commentsError)
      return { error: commentsError.message }
    }

    // ดึงข้อมูลผู้ใช้สำหรับแต่ละคอมเม้นต์
    if (comments && comments.length > 0) {
      const userIds = [...new Set(comments.map((comment) => comment.user_id))]

      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)

      if (usersError) {
        console.error("Error fetching users:", usersError)
        return { error: usersError.message }
      }

      // สร้าง map ของผู้ใช้
      const userMap = {}
      users.forEach((user) => {
        userMap[user.id] = user
      })

      // เพิ่มข้อมูลผู้ใช้เข้าไปในคอมเม้นต์
      comments.forEach((comment) => {
        comment.user = userMap[comment.user_id] || null
      })

      // ดึงการตอบกลับสำหรับแต่ละคอมเม้นต์
      const commentIds = comments.map((comment) => comment.id)

      const { data: replies, error: repliesError } = await supabase
        .from("comment_replies")
        .select("*")
        .in("comment_id", commentIds)
        .order("created_at", { ascending: true })

      if (repliesError) {
        console.error("Error fetching replies:", repliesError)
        return { error: repliesError.message }
      }

      if (replies && replies.length > 0) {
        // ดึงข้อมูลผู้ใช้สำหรับการตอบกลับ
        const replyUserIds = [...new Set(replies.map((reply) => reply.user_id))]

        // เพิ่มผู้ใช้ที่ยังไม่ได้ดึงข้อมูล
        const newUserIds = replyUserIds.filter((id) => !userMap[id])

        if (newUserIds.length > 0) {
          const { data: replyUsers, error: replyUsersError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", newUserIds)

          if (replyUsersError) {
            console.error("Error fetching reply users:", replyUsersError)
            return { error: replyUsersError.message }
          }

          // เพิ่มผู้ใช้ใหม่เข้าไปใน map
          replyUsers.forEach((user) => {
            userMap[user.id] = user
          })
        }

        // เพิ่มข้อมูลผู้ใช้เข้าไปในการตอบกลับ
        replies.forEach((reply) => {
          reply.user = userMap[reply.user_id] || null
        })

        // จัดกลุ่มการตอบกลับตาม comment_id
        const repliesByCommentId = {}
        replies.forEach((reply) => {
          if (!repliesByCommentId[reply.comment_id]) {
            repliesByCommentId[reply.comment_id] = []
          }
          repliesByCommentId[reply.comment_id].push(reply)
        })

        // เพิ่มการตอบกลับเข้าไปในคอมเม้นต์
        comments.forEach((comment) => {
          comment.replies = repliesByCommentId[comment.id] || []
        })
      } else {
        // ถ้าไม่มีการตอบกลับ ให้เพิ่ม array ว่างเข้าไปในคอมเม้นต์
        comments.forEach((comment) => {
          comment.replies = []
        })
      }
    }

    return { success: true, comments }
  } catch (error) {
    console.error("Error in getEquipmentComments:", error)
    return { error: error.message || "เกิดข้อผิดพลาดในการดึงข้อมูลคอมเม้นต์" }
  }
}
