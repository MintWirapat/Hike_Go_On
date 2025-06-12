import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

/**
 * สร้าง Supabase client สำหรับใช้ใน server components
 * เพิ่มความสามารถในการกำหนด options เพิ่มเติม
 */
export function createClient(cookieStore, options = {}) {
  if (!cookieStore) {
    cookieStore = cookies()
  }

  // สร้าง client ด้วย options ที่กำหนด
  return createServerComponentClient(
    {
      cookies: () => cookieStore,
    },
    options,
  )
}
