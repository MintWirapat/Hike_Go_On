/**
 * Server actions สำหรับจัดการอุปกรณ์แคมป์ปิ้ง
 */
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * เพิ่มอุปกรณ์แคมป์ปิ้งใหม่
 * @param {Object} equipmentData - ข้อมูลอุปกรณ์แคมป์ปิ้ง
 * @param {Array} imageUrls - URLs ของรูปภาพ
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function addEquipment(equipmentData, imageUrls) {
  try {
    const supabase = await createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเพิ่มอุปกรณ์แคมป์ปิ้ง" }
    }

    // เพิ่ม seller_id ให้กับข้อมูลอุปกรณ์
    const equipmentWithSeller = {
      ...equipmentData,
      seller_id: session.user.id,
    }

    // เพิ่มข้อมูลอุปกรณ์
    const { data: equipment, error: equipmentError } = await supabase
      .from("equipment")
      .insert(equipmentWithSeller)
      .select()
      .single()

    if (equipmentError) {
      console.error("Error adding equipment:", equipmentError)
      return { success: false, error: equipmentError.message }
    }

    // เพิ่มข้อมูลรูปภาพ
    if (imageUrls && imageUrls.length > 0) {
      const equipmentImages = imageUrls.map((url, index) => ({
        equipment_id: equipment.id,
        image_url: url,
        is_main: index === 0, // รูปแรกเป็นรูปหลัก
      }))

      const { error: imagesError } = await supabase.from("equipment_images").insert(equipmentImages)

      if (imagesError) {
        console.error("Error adding equipment images:", imagesError)
        return { success: false, error: imagesError.message }
      }
    }

    // Revalidate paths
    revalidatePath("/equipment")
    revalidatePath(`/equipment/${equipment.id}`)

    return { success: true, equipment }
  } catch (error) {
    console.error("Error in addEquipment:", error)
    return { success: false, error: error.message }
  }
}

/**
 * อัปเดตอุปกรณ์แคมป์ปิ้ง
 * @param {Object} equipmentData - ข้อมูลอุปกรณ์แคมป์ปิ้ง
 * @param {Array} newImageUrls - URLs ของรูปภาพใหม่
 * @param {Array} existingImageIds - IDs ของรูปภาพที่มีอยู่
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function updateEquipment(equipmentData, newImageUrls, existingImageIds) {
  try {
    const supabase = await createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนแก้ไขอุปกรณ์แคมป์ปิ้ง" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของอุปกรณ์หรือไม่
    const { data: existingEquipment, error: checkError } = await supabase
      .from("equipment")
      .select("seller_id")
      .eq("id", equipmentData.id)
      .single()

    if (checkError) {
      return { success: false, error: checkError.message }
    }

    if (existingEquipment.seller_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์แก้ไขอุปกรณ์นี้" }
    }

    // อัปเดตข้อมูลอุปกรณ์
    const { error: updateError } = await supabase.from("equipment").update(equipmentData).eq("id", equipmentData.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // ลบรูปภาพที่ไม่ได้อยู่ในรายการ existingImageIds
    if (existingImageIds && existingImageIds.length > 0) {
      await supabase
        .from("equipment_images")
        .delete()
        .eq("equipment_id", equipmentData.id)
        .not("id", "in", `(${existingImageIds.join(",")})`)
    } else {
      // ถ้าไม่มีรูปภาพเดิมเหลืออยู่ ให้ลบทั้งหมด
      await supabase.from("equipment_images").delete().eq("equipment_id", equipmentData.id)
    }

    // เพิ่มรูปภาพใหม่
    if (newImageUrls && newImageUrls.length > 0) {
      // ตรวจสอบว่ามีรูปหลักหรือไม่
      const { data: mainImage } = await supabase
        .from("equipment_images")
        .select("id")
        .eq("equipment_id", equipmentData.id)
        .eq("is_main", true)
        .maybeSingle()

      const hasMainImage = !!mainImage

      const equipmentImages = newImageUrls.map((url, index) => ({
        equipment_id: equipmentData.id,
        image_url: url,
        is_main: !hasMainImage && index === 0, // ถ้าไม่มีรูปหลัก ให้รูปแรกเป็นรูปหลัก
      }))

      await supabase.from("equipment_images").insert(equipmentImages)
    }

    // Revalidate paths
    revalidatePath("/equipment")
    revalidatePath(`/equipment/${equipmentData.id}`)

    return { success: true }
  } catch (error) {
    console.error("Error in updateEquipment:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ลบอุปกรณ์แคมป์ปิ้ง
 * @param {string} equipmentId - ID ของอุปกรณ์แคมป์ปิ้ง
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function deleteEquipment(equipmentId) {
  try {
    const supabase = await createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนลบอุปกรณ์แคมป์ปิ้ง" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของอุปกรณ์หรือไม่
    const { data: existingEquipment, error: checkError } = await supabase
      .from("equipment")
      .select("seller_id") // แก้จาก owner_id เป็น seller_id
      .eq("id", equipmentId)
      .single()

    if (checkError) {
      return { success: false, error: checkError.message }
    }

    if (existingEquipment.seller_id !== session.user.id) {
      // แก้จาก owner_id เป็น seller_id
      return { success: false, error: "คุณไม่มีสิทธิ์ลบอุปกรณ์นี้" }
    }

    // ลบข้อมูลที่เกี่ยวข้องทั้งหมด
    // ลบรูปภาพ
    await supabase.from("equipment_images").delete().eq("equipment_id", equipmentId)

    // ลบความคิดเห็น
    const { data: comments } = await supabase.from("equipment_comments").select("id").eq("equipment_id", equipmentId)

    if (comments && comments.length > 0) {
      const commentIds = comments.map((comment) => comment.id)

      // ลบการตอบกลับความคิดเห็น
      await supabase.from("comment_replies").delete().in("comment_id", commentIds)

      // ลบความคิดเห็น
      await supabase.from("equipment_comments").delete().eq("equipment_id", equipmentId)
    }

    // ลบรายการโปรด
    await supabase.from("favorites").delete().eq("equipment_id", equipmentId)

    // ลบอุปกรณ์
    const { error: deleteError } = await supabase.from("equipment").delete().eq("id", equipmentId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    // Revalidate paths
    revalidatePath("/equipment")
    revalidatePath("/profile/my-equipment")

    return { success: true }
  } catch (error) {
    console.error("Error in deleteEquipment:", error)
    return { success: false, error: error.message }
  }
}
