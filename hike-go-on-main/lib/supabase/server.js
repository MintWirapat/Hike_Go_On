import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// สร้าง Supabase client สำหรับใช้ใน server components
export function createClient(cookieStore) {
  if (!cookieStore) {
    cookieStore = cookies()
  }
  return createServerComponentClient({ cookies: () => cookieStore })
}
