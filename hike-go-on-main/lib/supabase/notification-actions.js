import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * ดึงข้อมูลการแจ้งเตือนของผู้ใช้
 * @param {string} userId - รหัสผู้ใช้
 * @param {number} limit - จำนวนการแจ้งเตือนที่ต้องการดึง
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function getUserNotifications(userId, limit = 10) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching notifications:", error)
      return { success: false, error: error.message }
    }

    return { success: true, notifications: data }
  } catch (error) {
    console.error("Error in getUserNotifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * สร้างการแจ้งเตือนใหม่
 * @param {Object} notificationData - ข้อมูลการแจ้งเตือน
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function createNotification(notificationData) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.from("notifications").insert(notificationData).select().single()

    if (error) {
      console.error("Error creating notification:", error)
      return { success: false, error: error.message }
    }

    // Revalidate paths
    revalidatePath("/profile")

    return { success: true, notification: data }
  } catch (error) {
    console.error("Error in createNotification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปเดตสถานะการอ่านของการแจ้งเตือน
 * @param {string} notificationId - รหัสการแจ้งเตือน
 * @param {boolean} isRead - สถานะการอ่าน
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function markNotificationAsRead(notificationId, isRead = true) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("id", notificationId)
      .select()
      .single()

    if (error) {
      console.error("Error updating notification:", error)
      return { success: false, error: error.message }
    }

    // Revalidate paths
    revalidatePath("/profile")

    return { success: true, notification: data }
  } catch (error) {
    console.error("Error in markNotificationAsRead:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปเดตสถานะการอ่านของการแจ้งเตือนทั้งหมดของผู้ใช้
 * @param {string} userId - รหัสผู้ใช้
 * @param {boolean} isRead - สถานะการอ่าน
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function markAllNotificationsAsRead(userId, isRead = true) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: isRead })
      .eq("user_id", userId)
      .eq("is_read", !isRead)
      .select()

    if (error) {
      console.error("Error updating notifications:", error)
      return { success: false, error: error.message }
    }

    // Revalidate paths
    revalidatePath("/profile")

    return { success: true, notifications: data }
  } catch (error) {
    console.error("Error in markAllNotificationsAsRead:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ลบการแจ้งเตือน
 * @param {string} notificationId - รหัสการแจ้งเตือน
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function deleteNotification(notificationId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

    if (error) {
      console.error("Error deleting notification:", error)
      return { success: false, error: error.message }
    }

    // Revalidate paths
    revalidatePath("/profile")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteNotification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * นับจำนวนการแจ้งเตือนที่ยังไม่ได้อ่านของผู้ใช้
 * @param {string} userId - รหัสผู้ใช้
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function countUnreadNotifications(userId) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)

    if (error) {
      console.error("Error counting notifications:", error)
      return { success: false, error: error.message }
    }

    return { success: true, count }
  } catch (error) {
    console.error("Error in countUnreadNotifications:", error)
    return { success: false, error: error.message }
  }
}

/**
 * สร้างการแจ้งเตือนสำหรับการจองใหม่
 * @param {Object} booking - ข้อมูลการจอง
 * @param {Object} user - ข้อมูลผู้ใช้
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function createBookingNotification(booking, user) {
  try {
    // สร้างการแจ้งเตือนสำหรับผู้ใช้
    const userNotification = {
      user_id: user.id,
      title: "การจองสำเร็จ",
      message: `คุณได้จองแคมป์ไซต์เรียบร้อยแล้ว รหัสการจอง: ${booking.id}`,
      type: "booking_created",
      related_id: booking.id,
    }

    await createNotification(userNotification)

    // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์ไซต์
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ดึงข้อมูลแคมป์ไซต์
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("user_id, name")
      .eq("id", booking.campsite_id)
      .single()

    if (campsiteError) {
      console.error("Error fetching campsite:", campsiteError)
      return { success: false, error: campsiteError.message }
    }

    // สร้างการแจ้งเตือนสำหรับเจ้าของแคมป์ไซต์
    const ownerNotification = {
      user_id: campsite.user_id,
      title: "มีการจองใหม่",
      message: `มีผู้จองแคมป์ไซต์ ${campsite.name} ของคุณ`,
      type: "booking_received",
      related_id: booking.id,
    }

    await createNotification(ownerNotification)

    return { success: true }
  } catch (error) {
    console.error("Error in createBookingNotification:", error)
    return { success: false, error: error.message }
  }
}

/**
 * สร้างการแจ้งเตือนสำหรับการอัปเดตสถานะการจอง
 * @param {Object} booking - ข้อมูลการจอง
 * @param {string} status - สถานะการจองใหม่
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function createBookingStatusNotification(booking, status) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // ดึงข้อมูลแคมป์ไซต์
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .select("name")
      .eq("id", booking.campsite_id)
      .single()

    if (campsiteError) {
      console.error("Error fetching campsite:", campsiteError)
      return { success: false, error: campsiteError.message }
    }

    let title = ""
    let message = ""

    switch (status) {
      case "confirmed":
        title = "การจองได้รับการยืนยัน"
        message = `การจองแคมป์ไซต์ ${campsite.name} ของคุณได้รับการยืนยันแล้ว`
        break
      case "cancelled":
        title = "การจองถูกยกเลิก"
        message = `การจองแคมป์ไซต์ ${campsite.name} ของคุณถูกยกเลิก`
        break
      case "completed":
        title = "การจองเสร็จสิ้น"
        message = `การจองแคมป์ไซต์ ${campsite.name} ของคุณเสร็จสิ้นแล้ว`
        break
      default:
        title = "การอัปเดตสถานะการจอง"
        message = `สถานะการจองแคมป์ไซต์ ${campsite.name} ของคุณได้รับการอัปเดตเป็น ${status}`
    }

    const notification = {
      user_id: booking.user_id,
      title,
      message,
      type: "booking_status_updated",
      related_id: booking.id,
    }

    return await createNotification(notification)
  } catch (error) {
    console.error("Error in createBookingStatusNotification:", error)
    return { success: false, error: error.message }
  }
}
