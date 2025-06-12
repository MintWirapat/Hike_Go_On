/**
 * สคริปต์สำหรับปรับ import paths หลังจากปรับโครงสร้างโปรเจ็ค
 *
 * วิธีใช้:
 * 1. สำรองโค้ดทั้งหมดก่อนรันสคริปต์นี้
 * 2. รันคำสั่ง: node scripts/update-imports.js
 *
 * สคริปต์นี้จะปรับ import paths ในไฟล์ต่างๆ ให้สอดคล้องกับโครงสร้างใหม่
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// แผนการปรับ import paths
const importMappings = [
  // Components
  { from: "@/components/auth-check", to: "@/components/auth/auth-check" },
  { from: "@/components/navbar", to: "@/components/layout/navbar" },

  // Lib
  { from: "@/lib/supabase/actions", to: "@/lib/actions/campsite-actions" },
  { from: "@/lib/supabase/review-actions", to: "@/lib/actions/review-actions" },
  { from: "@/lib/supabase/booking-actions", to: "@/lib/actions/booking-actions" },

  // Components with directory changes
  { from: "@/components/campsites/campsite-card", to: "@/components/campsite/campsite-card" },
]

// ฟังก์ชันสำหรับปรับ import paths ในไฟล์
function updateImportsInFile(filePath, mappings) {
  try {
    let content = fs.readFileSync(filePath, "utf8")
    let updated = false

    mappings.forEach(({ from, to }) => {
      const regex = new RegExp(`from\\s+['"]${from}['"]`, "g")
      if (regex.test(content)) {
        content = content.replace(regex, `from '${to}'`)
        updated = true
      }
    })

    if (updated) {
      fs.writeFileSync(filePath, content, "utf8")
      console.log(`ปรับ import paths ในไฟล์: ${filePath}`)
    }
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดในการปรับไฟล์ ${filePath}:`, error)
  }
}

// ฟังก์ชันสำหรับค้นหาไฟล์ทั้งหมดในโปรเจ็ค
function findAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // ข้ามโฟลเดอร์ที่ไม่ต้องการ
      if (!["node_modules", ".git", ".next"].includes(file)) {
        findAllFiles(filePath, fileList)
      }
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(path.extname(file))) {
      fileList.push(filePath)
    }
  })

  return fileList
}

// ค้นหาไฟล์ทั้งหมดและปรับ import paths
console.log("กำลังค้นหาไฟล์และปรับ import paths...")
const allFiles = findAllFiles(process.cwd())
allFiles.forEach((file) => updateImportsInFile(file, importMappings))

console.log("\nการปรับ import paths เสร็จสิ้น!")
console.log("\nขั้นตอนต่อไป:")
console.log("1. ตรวจสอบว่า import paths ถูกปรับอย่างถูกต้อง")
console.log("2. แก้ไข import paths ที่อาจยังไม่ถูกต้อง")
console.log("3. ทดสอบการทำงานของแอปพลิเคชัน")
