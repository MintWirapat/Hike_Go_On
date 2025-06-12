/**
 * Server actions สำหรับจัดการโปรไฟล์ผู้ใช้
 */
"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

/**
 * อัปเดตโปรไฟล์ผู้ใช้
 * @param {Object} profileData - ข้อมูลโปรไฟล์
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function updateProfile(profileData) {
  try {
    const supabase = createClient(cookies)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนอัปเดตโปรไฟล์" }
    }

    // ตรวจสอบว่าผู้ใช้กำลังอัปเดตโปรไฟล์ของตัวเองหรือไม่
    if (profileData.id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์อัปเดตโปรไฟล์ของผู้ใช้อื่น" }
    }

    // อัปเดตข้อมูลโปรไฟล์
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: profileData.id,
        username: profileData.username,
        full_name: profileData.fullName,
        phone: profileData.phone,
        avatar_url: profileData.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error updating profile:", error)
      return { success: false, error: error.message }
    }

    // Revalidate paths
    revalidatePath("/profile")

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateProfile:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปโหลดรูปโปรไฟล์
 * @param {File} file - ไฟล์รูปภาพ
 * @param {string} fileName - ชื่อไฟล์
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function uploadProfileImage(file, fileName) {
  try {
    const supabase = createClient(cookies)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปโปรไฟล์" }
    }

    // อัปโหลดไฟล์ไปยัง bucket 'avatars'
    const { data, error } = await supabase.storage.from("avatars").upload(fileName, file, {
      upsert: true,
    })

    if (error) {
      console.error("Storage upload error:", error)
      return { success: false, error: error.message }
    }

    // สร้าง URL สำหรับรูปที่อัปโหลด
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("Error in uploadProfileImage:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ดึงข้อมูลโปรไฟล์ผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function getProfile(userId) {
  try {
    const supabase = createClient(cookies)

    // ดึงข้อมูลโปรไฟล์
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error) {
      console.error("Error fetching profile:", error)
      return { success: false, error: error.message }
    }

    return { success: true, profile: data }
  } catch (error) {
    console.error("Error in getProfile:", error)
    return { success: false, error: error.message }
  }
}
