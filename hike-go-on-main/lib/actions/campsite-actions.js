"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

/**
 * เพิ่มสถานที่แคมป์ใหม่
 * @param {Object} campsiteData - ข้อมูลสถานที่แคมป์
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function addCampsite(campsiteData, imageUrls) {
  try {
    const supabase = createClient(cookies)

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเพิ่มสถานที่แคมป์" }
    }

    // เพิ่ม owner_id ให้กับข้อมูลสถานที่แคมป์
    const campsiteWithOwner = {
      ...campsiteData,
      owner_id: session.user.id,
    }

    // เพิ่มข้อมูลสถานที่แคมป์
    const { data: campsite, error: campsiteError } = await supabase
      .from("campsites")
      .insert(campsiteWithOwner)
      .select()
      .single()

    if (campsiteError) {
      console.error("Error adding campsite:", campsiteError)
      return { success: false, error: campsiteError.message }
    }

    // เพิ่มข้อมูลรูปภาพ
    if (imageUrls && imageUrls.length > 0) {
      const campsiteImages = imageUrls.map((url, index) => ({
        campsite_id: campsite.id,
        image_url: url,
        is_main: index === 0, // รูปแรกเป็นรูปหลัก
      }))

      const { error: imagesError } = await supabase.from("campsite_images").insert(campsiteImages)

      if (imagesError) {
        console.error("Error adding campsite images:", imagesError)
        return { success: false, error: imagesError.message }
      }
    }

    // Revalidate paths
    revalidatePath("/search")
    revalidatePath(`/campsite/${campsite.id}`)

    return { success: true, campsite }
  } catch (error) {
    console.error("Error in addCampsite:", error)
    return { success: false, error: error.message }
  }
}
