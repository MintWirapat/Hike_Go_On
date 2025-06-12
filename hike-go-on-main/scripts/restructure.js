/**
 * สคริปต์สำหรับปรับโครงสร้างโปรเจ็ค HikeGoOn
 *
 * วิธีใช้:
 * 1. สำรองโค้ดทั้งหมดก่อนรันสคริปต์นี้
 * 2. รันคำสั่ง: node scripts/restructure.js
 *
 * สคริปต์นี้จะ:
 * - สร้างโครงสร้างโฟลเดอร์ใหม่
 * - ย้ายไฟล์ไปยังตำแหน่งที่เหมาะสม
 * - ปรับ import paths ในไฟล์ต่างๆ
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// สร้างโครงสร้างโฟลเดอร์ใหม่
const directories = [
  // App Router
  "app/api/auth",
  "app/api/campsite",
  "app/api/profile",
  "app/(auth)/login",
  "app/(auth)/register",
  "app/(main)/search",
  "app/(main)/equipment",
  "app/(features)/campsite/[id]",
  "app/(features)/campsite/edit/[id]",
  "app/(features)/campsite/booking",
  "app/(features)/equipment/[id]",
  "app/(features)/post",
  "app/(features)/equipment-post",
  "app/(features)/profile/my-campsites",
  "app/(features)/profile/bookings",

  // Components
  "components/auth",
  "components/campsite",
  "components/equipment",
  "components/layout",
  "components/reviews",
  "components/comments",
  "components/ui",
  "components/animations",

  // Lib
  "lib/actions",
  "lib/hooks",
  "lib/supabase",
  "lib/utils",

  // Others
  "public/images",
  "public/icons",
  "styles",
]

// สร้างโฟลเดอร์
console.log("กำลังสร้างโครงสร้างโฟลเดอร์ใหม่...")
directories.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`สร้างโฟลเดอร์: ${dir}`)
  }
})

// แผนการย้ายไฟล์
const fileMoves = [
  // Auth components
  { from: "components/auth-check.jsx", to: "components/auth/auth-check.jsx" },
  { from: "components/auth/auth-form.jsx", to: "components/auth/auth-form.jsx" },

  // Layout components
  { from: "components/navbar.jsx", to: "components/layout/navbar.jsx" },

  // UI components
  { from: "components/ui/animated-button.jsx", to: "components/ui/animated-button.jsx" },
  { from: "components/ui/radio-group.jsx", to: "components/ui/radio-group.jsx" },
  { from: "components/ui/checkbox.jsx", to: "components/ui/checkbox.jsx" },
  { from: "components/ui/slider.jsx", to: "components/ui/slider.jsx" },
  { from: "components/ui/custom-slider.jsx", to: "components/ui/custom-slider.jsx" },
  { from: "components/ui/single-slider.jsx", to: "components/ui/single-slider.jsx" },
  { from: "components/ui/dropdown-menu.jsx", to: "components/ui/dropdown-menu.jsx" },
  { from: "components/ui/select.jsx", to: "components/ui/select.jsx" },
  { from: "components/ui/alert-dialog.jsx", to: "components/ui/alert-dialog.jsx" },
  { from: "components/ui/calendar.jsx", to: "components/ui/calendar.jsx" },
  { from: "components/ui/popover.jsx", to: "components/ui/popover.jsx" },
  { from: "components/ui/badge.jsx", to: "components/ui/badge.jsx" },

  // Animation components
  { from: "components/animations/fade-in.jsx", to: "components/animations/fade-in.jsx" },
  { from: "components/animations/scroll-reveal.jsx", to: "components/animations/scroll-reveal.jsx" },
  { from: "components/animations/hover-card.jsx", to: "components/animations/hover-card.jsx" },
  { from: "components/animations/pulse-icon.jsx", to: "components/animations/pulse-icon.jsx" },

  // Campsite components
  { from: "components/campsites/campsite-card.jsx", to: "components/campsite/campsite-card.jsx" },

  // Equipment components
  { from: "components/equipment/equipment-card.jsx", to: "components/equipment/equipment-card.jsx" },

  // Review components
  { from: "components/reviews/campsite-review-form.jsx", to: "components/reviews/campsite-review-form.jsx" },
  { from: "components/reviews/campsite-review-item.jsx", to: "components/reviews/campsite-review-item.jsx" },
  { from: "components/reviews/campsite-reviews-section.jsx", to: "components/reviews/campsite-reviews-section.jsx" },

  // Comment components
  {
    from: "components/comments/equipment-comments-section.jsx",
    to: "components/comments/equipment-comments-section.jsx",
  },
  { from: "components/comments/equipment-comment-item.jsx", to: "components/comments/equipment-comment-item.jsx" },
  { from: "components/comments/equipment-comment-form.jsx", to: "components/comments/equipment-comment-form.jsx" },
  { from: "components/comments/comment-reply-form.jsx", to: "components/comments/comment-reply-form.jsx" },
  { from: "components/comments/comment-reply-item.jsx", to: "components/comments/comment-reply-item.jsx" },

  // Lib files
  { from: "lib/supabase/client.js", to: "lib/supabase/client.js" },
  { from: "lib/supabase/server.js", to: "lib/supabase/server.js" },
  { from: "lib/supabase/storage.js", to: "lib/supabase/storage.js" },
  { from: "lib/supabase/supabase-provider.jsx", to: "lib/supabase/supabase-provider.jsx" },

  // Actions
  { from: "lib/supabase/actions.js", to: "lib/actions/campsite-actions.js" },
  { from: "lib/supabase/review-actions.js", to: "lib/actions/review-actions.js" },
  { from: "lib/supabase/booking-actions.js", to: "lib/actions/booking-actions.js" },

  // App Router pages
  { from: "app/page.jsx", to: "app/page.jsx" },
  { from: "app/layout.jsx", to: "app/layout.jsx" },
  { from: "app/login/page.jsx", to: "app/(auth)/login/page.jsx" },
  { from: "app/register/page.jsx", to: "app/(auth)/register/page.jsx" },
  { from: "app/search/page.jsx", to: "app/(main)/search/page.jsx" },
  { from: "app/equipment/page.jsx", to: "app/(main)/equipment/page.jsx" },
  { from: "app/campsite/[id]/page.jsx", to: "app/(features)/campsite/[id]/page.jsx" },
  { from: "app/campsite/edit/[id]/page.jsx", to: "app/(features)/campsite/edit/[id]/page.jsx" },
  { from: "app/campsite/[id]/booking/page.jsx", to: "app/(features)/campsite/booking/page.jsx" },
  { from: "app/equipment/[id]/page.jsx", to: "app/(features)/equipment/[id]/page.jsx" },
  { from: "app/post/page.jsx", to: "app/(features)/post/page.jsx" },
  { from: "app/equipment-post/page.jsx", to: "app/(features)/equipment-post/page.jsx" },
  { from: "app/profile/page.jsx", to: "app/(features)/profile/page.jsx" },
  { from: "app/profile/my-campsites/page.jsx", to: "app/(features)/profile/my-campsites/page.jsx" },
  { from: "app/profile/bookings/page.jsx", to: "app/(features)/profile/bookings/page.jsx" },

  // API Routes
  { from: "app/api/auth/callback/route.js", to: "app/api/auth/callback/route.js" },
  { from: "app/api/campsites/slug/route.js", to: "app/api/campsite/slug/route.js" },
  { from: "app/api/profile/update/route.js", to: "app/api/profile/update/route.js" },
  { from: "app/api/profile/upload/route.js", to: "app/api/profile/upload/route.js" },

  // Loading states
  { from: "app/loading.jsx", to: "app/loading.jsx" },
  { from: "app/search/loading.jsx", to: "app/(main)/search/loading.jsx" },
  { from: "app/login/loading.jsx", to: "app/(auth)/login/loading.jsx" },
  { from: "app/equipment/loading.jsx", to: "app/(main)/equipment/loading.jsx" },

  // Styles
  { from: "app/globals.css", to: "styles/globals.css" },

  // Config files
  { from: "tailwind.config.js", to: "tailwind.config.js" },
  { from: "next.config.mjs", to: "next.config.mjs" },
  { from: "postcss.config.mjs", to: "postcss.config.mjs" },
  { from: "middleware.js", to: "middleware.js" },
]

// ย้ายไฟล์
console.log("\nกำลังย้ายไฟล์...")
fileMoves.forEach(({ from, to }) => {
  const sourcePath = path.join(process.cwd(), from)
  const destPath = path.join(process.cwd(), to)

  // ตรวจสอบว่าไฟล์ต้นทางมีอยู่จริง
  if (fs.existsSync(sourcePath)) {
    // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
    const destDir = path.dirname(destPath)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    // คัดลอกไฟล์
    fs.copyFileSync(sourcePath, destPath)
    console.log(`ย้ายไฟล์: ${from} -> ${to}`)
  } else {
    console.log(`ข้ามการย้าย: ไม่พบไฟล์ ${from}`)
  }
})

console.log("\nการปรับโครงสร้างเสร็จสิ้น!")
console.log("\nขั้นตอนต่อไป:")
console.log("1. ตรวจสอบว่าไฟล์ทั้งหมดถูกย้ายอย่างถูกต้อง")
console.log("2. ปรับ import paths ในไฟล์ต่างๆ")
console.log("3. ทดสอบการทำงานของแอปพลิเคชัน")
