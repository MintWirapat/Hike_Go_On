/**
 * Utility functions สำหรับจัดการวันที่และเวลา
 */

/**
 * แปลงวันที่เป็นรูปแบบที่อ่านง่าย
 * @param {string|Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบที่อ่านง่าย
 */
export function formatDate(date) {
  if (!date) return ""

  const d = new Date(date)
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * แปลงวันที่เป็นรูปแบบไทย (วัน/เดือน/ปี พ.ศ.)
 * @param {string|Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่ในรูปแบบไทย
 */
export function formatThaiDate(date) {
  if (!date) return ""

  const d = new Date(date)
  const thaiYear = d.getFullYear() + 543 // แปลงเป็นปี พ.ศ.

  const day = d.getDate()
  const month = d.getMonth() + 1

  return `${day}/${month}/${thaiYear}`
}

/**
 * แปลงวันที่เป็นรูปแบบที่อ่านง่ายพร้อมเวลา
 * @param {string|Date} date - วันที่ที่ต้องการแปลง
 * @returns {string} วันที่และเวลาในรูปแบบที่อ่านง่าย
 */
export function formatDateTime(date) {
  if (!date) return ""

  const d = new Date(date)
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * คำนวณระยะเวลาที่ผ่านไปจากวันที่ที่กำหนด
 * @param {string|Date} date - วันที่ที่ต้องการคำนวณ
 * @returns {string} ระยะเวลาที่ผ่านไป
 */
export function timeAgo(date) {
  if (!date) return ""

  const d = new Date(date)
  const now = new Date()
  const seconds = Math.floor((now - d) / 1000)

  let interval = Math.floor(seconds / 31536000)
  if (interval >= 1) {
    return `${interval} ปีที่แล้ว`
  }

  interval = Math.floor(seconds / 2592000)
  if (interval >= 1) {
    return `${interval} เดือนที่แล้ว`
  }

  interval = Math.floor(seconds / 86400)
  if (interval >= 1) {
    return `${interval} วันที่แล้ว`
  }

  interval = Math.floor(seconds / 3600)
  if (interval >= 1) {
    return `${interval} ชั่วโมงที่แล้ว`
  }

  interval = Math.floor(seconds / 60)
  if (interval >= 1) {
    return `${interval} นาทีที่แล้ว`
  }

  return "เมื่อสักครู่"
}

/**
 * คำนวณจำนวนวันระหว่างวันที่สองวัน
 * @param {string|Date} startDate - วันที่เริ่มต้น
 * @param {string|Date} endDate - วันที่สิ้นสุด
 * @returns {number} จำนวนวัน
 */
export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}
