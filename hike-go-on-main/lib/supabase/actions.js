"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { deleteImageFromUrl } from "./storage"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// ฟังก์ชันสำหรับสร้าง Supabase client
const getSupabase = () => {
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return supabase
}

// แก้ไขฟังก์ชัน createClient ให้เป็น async
export async function createClient() {
  const cookieStore = cookies()
  return createServerActionClient({ cookies: () => cookieStore })
}

// ตรวจสอบให้แน่ใจว่าทุกฟังก์ชันมี async
export async function signUp(email, password, username, fullName) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, user: data.user }
}

// แก้ไขฟังก์ชัน signIn เพื่อดึงข้อมูลโปรไฟล์เพิ่มเติม
export async function signIn(email, password) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // ดึงข้อมูลโปรไฟล์เพิ่มเติม
  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // เพิ่มข้อมูลโปรไฟล์เข้าไปใน user metadata
  if (profileData) {
    data.user.user_metadata = {
      ...data.user.user_metadata,
      avatar_url: profileData.avatar_url,
      username: profileData.username || data.user.user_metadata?.username,
      full_name: profileData.full_name || data.user.user_metadata?.full_name,
    }
  }

  return { success: true, user: data.user }
}

/**
 * ออกจากระบบ
 * @returns {Object} ผลลัพธ์การดำเนินการ
 */
export async function signOut() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in signOut:", error)
    return { success: false, error: error.message }
  }
}

// แก้ไขฟังก์ชัน addCampsite เพื่อรองรับการบันทึกข้อมูลโซน
export async function addCampsite(campsiteData, facilities, rules, images, zones) {
  const supabase = await createClient()

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มสถานที่แคมป์" }
  }

  // เพิ่มข้อมูลสถานที่แคมป์
  const { data: campsite, error: campsiteError } = await supabase
    .from("campsites")
    .insert({
      ...campsiteData,
      owner_id: session.user.id,
    })
    .select()
    .single()

  if (campsiteError) {
    return { error: campsiteError.message }
  }

  // เพิ่มสิ่งอำนวยความสะดวก
  if (facilities && facilities.length > 0) {
    const facilitiesData = facilities.map((name) => ({
      campsite_id: campsite.id,
      name,
    }))

    const { error: facilitiesError } = await supabase.from("campsite_facilities").insert(facilitiesData)

    if (facilitiesError) {
      return { error: facilitiesError.message }
    }
  }

  // เพิ่มกฎระเบียบ
  if (rules && rules.length > 0) {
    const rulesData = rules.map((rule) => ({
      campsite_id: campsite.id,
      rule,
    }))

    const { error: rulesError } = await supabase.from("campsite_rules").insert(rulesData)

    if (rulesError) {
      return { error: rulesError.message }
    }
  }

  // เพิ่มรูปภาพ
  if (images && images.length > 0) {
    const imagesData = images.map((image_url, index) => ({
      campsite_id: campsite.id,
      image_url,
      is_main: index === 0, // รูปแรกเป็นรูปหลัก
    }))

    const { error: imagesError } = await supabase.from("campsite_images").insert(imagesData)

    if (imagesError) {
      return { error: imagesError.message }
    }
  }

  // เพิ่มข้อมูลโซน
  if (zones && zones.length > 0) {
    for (const zone of zones) {
      // เพิ่มข้อมูลโซน
      const { data: zoneData, error: zoneError } = await supabase
        .from("campsite_zones")
        .insert({
          campsite_id: campsite.id,
          name: zone.name,
          width: Number.parseFloat(zone.width) || 0,
          length: Number.parseFloat(zone.length) || 0,
        })
        .select()
        .single()

      if (zoneError) {
        return { error: `เกิดข้อผิดพลาดในการเพิ่มข้อมูลโซน: ${zoneError.message}` }
      }

      // เพิ่มรูปภาพของโซน
      if (zone.imageUrls && zone.imageUrls.length > 0) {
        const zoneImagesData = zone.imageUrls.map((image_url) => ({
          zone_id: zoneData.id,
          image_url,
        }))

        const { error: zoneImagesError } = await supabase.from("campsite_zone_images").insert(zoneImagesData)

        if (zoneImagesError) {
          return { error: `เกิดข้อผิดพลาดในการเพิ่มรูปภาพโซน: ${zoneImagesError.message}` }
        }
      }
    }
  }

  revalidatePath("/search")
  revalidatePath(`/campsite/${campsite.id}`)

  return { success: true, campsite }
}

export async function updateCampsite(campsiteData, facilities, rules, newImages, existingImageIds) {
  const supabase = await createClient()

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "กรุณาเข้าสู่ระบบก่อนแก้ไขสถานที่แคมป์" }
  }

  // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
  const { data: campsite, error: checkError } = await supabase
    .from("campsites")
    .select("owner_id")
    .eq("id", campsiteData.id)
    .single()

  if (checkError) {
    return { error: checkError.message }
  }

  if (campsite.owner_id !== session.user.id) {
    return { error: "คุณไม่มีสิทธิ์แก้ไขสถานที่แคมป์นี้" }
  }

  // อัปเดตข้อมูลสถานที่แคมป์
  const { error: updateError } = await supabase
    .from("campsites")
    .update({
      name: campsiteData.name,
      description: campsiteData.description,
      location: campsiteData.location,
      province: campsiteData.province,
      price: campsiteData.price,
      latitude: campsiteData.latitude,
      longitude: campsiteData.longitude,
      phone: campsiteData.phone,
      email: campsiteData.email,
      website: campsiteData.website,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campsiteData.id)

  if (updateError) {
    return { error: updateError.message }
  }

  // ลบสิ่งอำนวยความสะดวกเดิมทั้งหมด
  const { error: deleteFacilitiesError } = await supabase
    .from("campsite_facilities")
    .delete()
    .eq("campsite_id", campsiteData.id)

  if (deleteFacilitiesError) {
    return { error: deleteFacilitiesError.message }
  }

  // เพิ่มสิ่งอำนวยความสะดวกใหม่
  if (facilities && facilities.length > 0) {
    const facilitiesData = facilities.map((name) => ({
      campsite_id: campsiteData.id,
      name,
    }))

    const { error: facilitiesError } = await supabase.from("campsite_facilities").insert(facilitiesData)

    if (facilitiesError) {
      return { error: facilitiesError.message }
    }
  }

  // ลบกฎระเบียบเดิมทั้งหมด
  const { error: deleteRulesError } = await supabase.from("campsite_rules").delete().eq("campsite_id", campsiteData.id)

  if (deleteRulesError) {
    return { error: deleteRulesError.message }
  }

  // เพิ่มกฎระเบียบใหม่
  if (rules && rules.length > 0) {
    const rulesData = rules.map((rule) => ({
      campsite_id: campsiteData.id,
      rule,
    }))

    const { error: rulesError } = await supabase.from("campsite_rules").insert(rulesData)

    if (rulesError) {
      return { error: rulesError.message }
    }
  }

  // ลบรูปภาพที่ไม่ได้อยู่ในรายการ existingImageIds
  const { data: allImages } = await supabase
    .from("campsite_images")
    .select("id, image_url")
    .eq("campsite_id", campsiteData.id)

  if (allImages) {
    const imagesToDelete = allImages.filter((img) => !existingImageIds.includes(img.id))

    // ลบข้อมูลรูปภาพจากฐานข้อมูล
    if (imagesToDelete.length > 0) {
      const imageIdsToDelete = imagesToDelete.map((img) => img.id)
      const { error: deleteImagesError } = await supabase.from("campsite_images").delete().in("id", imageIdsToDelete)

      if (deleteImagesError) {
        return { error: deleteImagesError.message }
      }

      // ลบไฟล์รูปภาพออกจาก Storage
      for (const image of imagesToDelete) {
        if (image.image_url) {
          await deleteImageFromUrl(image.image_url, "campsite-images")
        }
      }
    }
  }

  // เพิ่มรูปภาพใหม่
  if (newImages && newImages.length > 0) {
    // ตรวจสอบว่ามีรูปหลักหรือไม่
    const { data: mainImage } = await supabase
      .from("campsite_images")
      .select("id")
      .eq("campsite_id", campsiteData.id)
      .eq("is_main", true)
      .maybeSingle()

    const hasMainImage = !!mainImage

    const imagesData = newImages.map((image, index) => ({
      campsite_id: campsiteData.id,
      image_url: image,
      is_main: !hasMainImage && index === 0, // ถ้าไม่มีรูปหลัก ให้รูปแรกเป็นรูปหลัก
    }))

    const { error: imagesError } = await supabase.from("campsite_images").insert(imagesData)

    if (imagesError) {
      return { error: imagesError.message }
    }
  }

  revalidatePath("/search")
  revalidatePath(`/campsite/${campsiteData.id}`)
  revalidatePath("/profile/my-campsites")

  return { success: true }
}

// ฟังก์ชันสำหรับลบสถานที่แคมป์
export async function deleteCampsite(id) {
  try {
    const supabase = getSupabase()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนลบสถานที่แคมป์" }
    }

    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของสถานที่แคมป์หรือไม่
    const { data: campsite } = await supabase.from("campsites").select("owner_id").eq("id", id).single()

    if (!campsite || campsite.owner_id !== session.user.id) {
      return { success: false, error: "คุณไม่มีสิทธิ์ลบสถานที่แคมป์นี้" }
    }

    // ลบข้อมูลที่เกี่ยวข้องทั้งหมด
    // 1. ลบรูปภาพของสถานที่แคมป์
    const { error: deleteImagesError } = await supabase.from("campsite_images").delete().eq("campsite_id", id)

    if (deleteImagesError) throw deleteImagesError

    // 2. ลบรูปภาพของโซน
    // ก่อนอื่นต้องหา zone_id ทั้งหมดที่เกี่ยวข้อง
    const { data: zones } = await supabase.from("campsite_zones").select("id").eq("campsite_id", id)

    if (zones && zones.length > 0) {
      const zoneIds = zones.map((zone) => zone.id)

      // ลบรูปภาพของโซน
      const { error: deleteZoneImagesError } = await supabase
        .from("campsite_zone_images")
        .delete()
        .in("zone_id", zoneIds)

      if (deleteZoneImagesError) throw deleteZoneImagesError
    }

    // 3. ลบโซนของสถานที่แคมป์
    const { error: deleteZonesError } = await supabase.from("campsite_zones").delete().eq("campsite_id", id)

    if (deleteZonesError) throw deleteZonesError

    // 4. ลบสิ่งอำนวยความสะดวกของสถานที่แคมป์
    const { error: deleteFacilitiesError } = await supabase.from("campsite_facilities").delete().eq("campsite_id", id)

    if (deleteFacilitiesError) throw deleteFacilitiesError

    // 5. ลบกฎระเบียบของสถานที่แคมป์
    const { error: deleteRulesError } = await supabase.from("campsite_rules").delete().eq("campsite_id", id)

    if (deleteRulesError) throw deleteRulesError

    // 6. ลบรายการโปรดที่เกี่ยวข้องกับสถานที่แคมป์
    const { error: deleteFavoritesError } = await supabase.from("favorites").delete().eq("campsite_id", id)

    if (deleteFavoritesError) throw deleteFavoritesError

    // 7. ลบรีวิวที่เกี่ยวข้องกับสถานที่แคมป์
    const { error: deleteReviewsError } = await supabase.from("reviews").delete().eq("campsite_id", id)

    if (deleteReviewsError) throw deleteReviewsError

    // 8. ลบการจองที่เกี่ยวข้องกับสถานที่แคมป์
    const { error: deleteBookingsError } = await supabase.from("bookings").delete().eq("campsite_id", id)

    if (deleteBookingsError) throw deleteBookingsError

    // 9. ลบสถานที่แคมป์
    const { error: deleteCampsiteError } = await supabase.from("campsites").delete().eq("id", id)

    if (deleteCampsiteError) throw deleteCampsiteError

    return { success: true }
  } catch (error) {
    console.error("Error deleting campsite:", error)
    return { success: false, error: error.message }
  }
}

export async function addEquipment(equipmentData, images) {
  const supabase = await createClient()

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มอุปกรณ์แคมป์ปิ้ง" }
  }

  // เพิ่มข้อมูลอุปกรณ์แคมป์ปิ้ง
  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .insert({
      ...equipmentData,
      seller_id: session.user.id,
    })
    .select()
    .single()

  if (equipmentError) {
    return { error: equipmentError.message }
  }

  // เพิ่มรูปภาพ
  if (images && images.length > 0) {
    const imagesData = images.map((image_url, index) => ({
      equipment_id: equipment.id,
      image_url,
      is_main: index === 0, // รูปแรกเป็นรูปหลัก
    }))

    const { error: imagesError } = await supabase.from("equipment_images").insert(imagesData)

    if (imagesError) {
      return { error: imagesError.message }
    }
  }

  revalidatePath("/equipment")
  revalidatePath(`/equipment/${equipment.id}`)

  return { success: true, equipment }
}

export async function addReview(reviewData) {
  const supabase = await createClient()

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "กรุณาเข้าสู่ระบบก่อนเพิ่มรีวิว" }
  }

  // เพิ่มข้อมูลรีวิว
  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      ...reviewData,
      user_id: session.user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  if (reviewData.campsite_id) {
    revalidatePath(`/campsite/${reviewData.campsite_id}`)
  } else if (reviewData.equipment_id) {
    revalidatePath(`/equipment/${reviewData.equipment_id}`)
  }

  return { success: true, review }
}

export async function addBooking(bookingData) {
  const supabase = await createClient()

  // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return { error: "กรุณาเข้าสู่ระบบก่อนจองสถานที่แคมป์" }
  }

  // เพิ่มข้อมูลการจอง
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      ...bookingData,
      user_id: session.user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/profile/bookings")

  return { success: true, booking }
}

// ฟังก์ชันสำหรับเพิ่ม/ลบรายการโปรด
export async function toggleFavorite(type, id) {
  try {
    const supabase = getSupabase()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด" }
    }

    const userId = session.user.id

    // ตรวจสอบว่ามีรายการโปรดนี้อยู่แล้วหรือไม่
    const { data: existingFavorite } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .eq(`${type}_id`, id)
      .maybeSingle()

    if (existingFavorite) {
      // ถ้ามีอยู่แล้ว ให้ลบออก
      const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq(`${type}_id`, id)

      if (error) throw error
      return { success: true, added: false }
    } else {
      // ถ้ายังไม่มี ให้เพิ่มเข้าไป
      const { error } = await supabase.from("favorites").insert({
        user_id: userId,
        [`${type}_id`]: id,
        created_at: new Date().toISOString(),
      })

      if (error) throw error
      return { success: true, added: true }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return { success: false, error: error.message }
  }
}
