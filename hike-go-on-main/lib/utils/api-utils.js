// ฟังก์ชันสำหรับจัดการการเรียก API

// ฟังก์ชันสำหรับเรียก API พร้อมการจัดการข้อผิดพลาด
export async function fetchWithRetry(url, options = {}, maxRetries = 3, retryDelay = 1000) {
  let lastError = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // ตรวจสอบสถานะการตอบกลับ
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed (attempt ${attempt + 1}/${maxRetries}):`, error)
      lastError = error

      // รอก่อนลองใหม่
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError
}

// ฟังก์ชันสำหรับเรียก API แบบมี timeout
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }

    throw error
  }
}

// ฟังก์ชันสำหรับเรียก API แบบมีการแคช
export async function fetchWithCache(url, options = {}, cacheKey, cacheDurationMinutes = 5) {
  // ตรวจสอบว่าอยู่ใน browser environment
  if (typeof window === "undefined") {
    return fetchWithRetry(url, options)
  }

  try {
    // ลองดึงข้อมูลจากแคช
    const cacheData = getCacheData(cacheKey)

    if (cacheData) {
      return cacheData
    }

    // ถ้าไม่มีข้อมูลในแคช ให้เรียก API
    const data = await fetchWithRetry(url, options)

    // บันทึกข้อมูลลงในแคช
    setCacheData(cacheKey, data, cacheDurationMinutes)

    return data
  } catch (error) {
    console.error("Error in fetchWithCache:", error)
    throw error
  }
}

// ฟังก์ชันสำหรับตั้งค่าข้อมูลในแคช
function setCacheData(key, data, expirationMinutes = 5) {
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

// ฟังก์ชันสำหรับดึงข้อมูลจากแคช
function getCacheData(key) {
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
