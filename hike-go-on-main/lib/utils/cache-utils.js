// ฟังก์ชันสำหรับจัดการแคชข้อมูล

// ตั้งค่าข้อมูลในแคช
export const setCacheData = (key, data, expirationMinutes = 5) => {
  if (typeof window === "undefined") return

  try {
    const now = new Date()
    const item = {
      data,
      expiry: now.getTime() + expirationMinutes * 60 * 1000,
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(item))
  } catch (error) {
    console.error("Error setting cache data:", error)
  }
}

// ดึงข้อมูลจากแคช
export const getCacheData = (key) => {
  if (typeof window === "undefined") return null

  try {
    const itemStr = localStorage.getItem(`cache_${key}`)
    if (!itemStr) return null

    const item = JSON.parse(itemStr)
    const now = new Date()

    // ตรวจสอบว่าข้อมูลหมดอายุหรือไม่
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(`cache_${key}`)
      return null
    }

    return item.data
  } catch (error) {
    console.error("Error getting cache data:", error)
    return null
  }
}

// ล้างข้อมูลแคชทั้งหมด
export const clearAllCache = () => {
  if (typeof window === "undefined") return

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("cache_")) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error("Error clearing cache:", error)
  }
}

// ล้างข้อมูลแคชตามคีย์
export const clearCache = (key) => {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(`cache_${key}`)
  } catch (error) {
    console.error("Error clearing cache for key:", key, error)
  }
}
