import { createClient } from "./client"

/**
 * อัพโหลดรูปภาพไปยัง Supabase Storage
 * @param {File} file - ไฟล์รูปภาพที่ต้องการอัพโหลด
 * @param {string} bucket - ชื่อ bucket ที่ต้องการอัพโหลดไปยัง
 * @param {string} folder - โฟลเดอร์ภายใน bucket (ถ้ามี)
 * @returns {Promise<{url: string, error: any}>} - URL ของรูปภาพที่อัพโหลดแล้ว หรือ error
 */
export async function uploadImage(file, bucket, folder = "") {
  try {
    if (!file) return { url: null, error: "ไม่พบไฟล์" }

    const supabase = await createClient()

    // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { url: null, error: "กรุณาเข้าสู่ระบบก่อนอัพโหลดรูปภาพ" }
    }

    // สร้างชื่อไฟล์ที่ไม่ซ้ำกันและใช้เฉพาะตัวอักษรภาษาอังกฤษและตัวเลข
    const fileExt = file.name.split(".").pop()
    const randomId = Math.random().toString(36).substring(2, 10)
    const fileName = `${session.user.id}-${Date.now()}-${randomId}.${fileExt}`
    // ตรวจสอบว่า folder เป็นภาษาอังกฤษหรือไม่ ถ้าไม่ใช่ให้ใช้ค่าเริ่มต้น
    const safeFolder = folder ? folder.replace(/[^\w-]/g, "") : "uploads"
    const filePath = safeFolder ? `${safeFolder}/${fileName}` : fileName

    // อัพโหลดไฟล์
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Error uploading image:", error)
      return { url: null, error: error.message }
    }

    // สร้าง URL สาธารณะ
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return { url: publicUrl, error: null }
  } catch (error) {
    console.error("Error in uploadImage:", error)
    return { url: null, error: error.message }
  }
}

/**
 * อัพโหลดรูปภาพหลายรูปไปยัง Supabase Storage
 * @param {Array<File>} files - ไฟล์รูปภาพที่ต้องการอัพโหลด
 * @param {string} bucket - ชื่อ bucket ที่ต้องการอัพโหลดไปยัง
 * @param {string} folder - โฟลเดอร์ภายใน bucket (ถ้ามี)
 * @returns {Promise<{urls: Array<string>, errors: Array<any>}>} - URLs ของรูปภาพที่อัพโหลดแล้ว และ errors
 */
export async function uploadMultipleImages(files, bucket, folder = "") {
  const results = await Promise.all(files.map((file) => uploadImage(file, bucket, folder)))

  const urls = results.filter((result) => result.url).map((result) => result.url)
  const errors = results.filter((result) => result.error).map((result) => result.error)

  return { urls, errors }
}

/**
 * ลบรูปภาพจาก Supabase Storage
 * @param {string} url - URL ของรูปภาพที่ต้องการลบ
 * @param {string} bucket - ชื่อ bucket ที่รูปภาพอยู่
 * @returns {Promise<{success: boolean, error: any}>} - ผลลัพธ์การลบรูปภาพ
 */
export async function deleteImage(url, bucket) {
  try {
    if (!url) return { success: false, error: "ไม่พบ URL" }

    const supabase = await createClient()

    // แยกชื่อไฟล์จาก URL
    const urlParts = url.split("/")
    const fileName = urlParts[urlParts.length - 1]

    // ลบไฟล์
    const { error } = await supabase.storage.from(bucket).remove([fileName])

    if (error) {
      console.error("Error deleting image:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteImage:", error)
    return { success: false, error: error.message }
  }
}

/**
 * ลบรูปภาพจาก URL ที่มีโฟลเดอร์
 * @param {string} url - URL ของรูปภาพที่ต้องการลบ
 * @param {string} bucket - ชื่อ bucket ที่รูปภาพอยู่
 * @returns {Promise<{success: boolean, error: any}>} - ผลลัพธ์การลบรูปภาพ
 */
export async function deleteImageFromUrl(url, bucket) {
  try {
    if (!url) return { success: false, error: "ไม่พบ URL" }

    const supabase = await createClient()

    // แยกชื่อไฟล์และพาธจาก URL
    // URL จะมีรูปแบบเช่น https://xxx.supabase.co/storage/v1/object/public/bucket-name/folder/filename.jpg
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/")

    // หาส่วนที่เป็นพาธของไฟล์หลังจากชื่อ bucket
    const bucketIndex = pathParts.findIndex((part) => part === "public") + 1
    if (bucketIndex <= 0 || bucketIndex >= pathParts.length) {
      return { success: false, error: "รูปแบบ URL ไม่ถูกต้อง" }
    }

    // สร้างพาธของไฟล์ที่จะลบ (ไม่รวม bucket name)
    const filePath = pathParts.slice(bucketIndex + 1).join("/")

    if (!filePath) {
      return { success: false, error: "ไม่สามารถแยกพาธของไฟล์ได้" }
    }

    // ลบไฟล์
    const { error } = await supabase.storage.from(bucket).remove([filePath])

    if (error) {
      console.error("Error deleting image:", error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Error in deleteImageFromUrl:", error)
    return { success: false, error: error.message }
  }
}
