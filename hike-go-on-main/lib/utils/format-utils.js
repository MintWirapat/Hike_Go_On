/**
 * Utility functions สำหรับการจัดรูปแบบข้อมูล
 */

/**
 * จัดรูปแบบราคาเป็นสกุลเงินบาท
 * @param {number} price - ราคาที่ต้องการจัดรูปแบบ
 * @returns {string} ราคาในรูปแบบสกุลเงินบาท
 */
export function formatPrice(price) {
  if (price === undefined || price === null) return "0 บาท"

  return price.toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * จัดรูปแบบจำนวนเงินเป็นสกุลเงินที่กำหนด
 * @param {number} amount - จำนวนเงินที่ต้องการจัดรูปแบบ
 * @param {string} currency - รหัสสกุลเงิน (เช่น THB, USD)
 * @param {string} locale - รหัสภาษา (เช่น th-TH, en-US)
 * @returns {string} จำนวนเงินในรูปแบบสกุลเงินที่กำหนด
 */
export function formatCurrency(amount, currency = "THB", locale = "th-TH") {
  if (amount === undefined || amount === null) return "0"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * จัดรูปแบบตัวเลขให้มีเครื่องหมายจุลภาค (,) แบ่งหลักพัน
 * @param {number} number - ตัวเลขที่ต้องการจัดรูปแบบ
 * @param {string} suffix - ข้อความต่อท้าย (เช่น บาท, คน)
 * @returns {string} ตัวเลขที่จัดรูปแบบแล้ว
 */
export function formatNumber(number, suffix = "") {
  if (number === undefined || number === null) return `0${suffix ? " " + suffix : ""}`

  return number.toLocaleString("th-TH") + (suffix ? " " + suffix : "")
}

/**
 * ตัดข้อความให้สั้นลงและเพิ่ม ... ท้ายข้อความ
 * @param {string} text - ข้อความที่ต้องการตัด
 * @param {number} maxLength - ความยาวสูงสุดที่ต้องการ
 * @returns {string} ข้อความที่ถูกตัด
 */
export function truncateText(text, maxLength = 100) {
  if (!text) return ""

  if (text.length <= maxLength) return text

  return text.substring(0, maxLength) + "..."
}

/**
 * แปลงข้อความเป็น slug
 * @param {string} text - ข้อความที่ต้องการแปลง
 * @returns {string} slug
 */
export function slugify(text) {
  if (!text) return ""

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

/**
 * แปลงข้อความ Markdown เป็น HTML
 * @param {string} markdown - ข้อความ Markdown
 * @returns {string} HTML
 */
export function markdownToHtml(markdown) {
  if (!markdown) return ""

  // แปลง Markdown เป็น HTML อย่างง่าย
  return markdown
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}
