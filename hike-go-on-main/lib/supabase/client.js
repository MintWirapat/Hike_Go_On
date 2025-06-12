"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// ปรับปรุงฟังก์ชัน createClient เพื่อให้มั่นใจว่าสร้าง client ได้อย่างถูกต้อง

// สร้าง singleton instance สำหรับ client-side
let supabaseClient = null

export async function createClient() {
  try {
    if (!supabaseClient) {
      supabaseClient = createClientComponentClient()
    }
    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    throw new Error("ไม่สามารถเชื่อมต่อกับ Supabase ได้")
  }
}

// สร้าง singleton instance เพื่อป้องกันการสร้าง client ซ้ำซ้อน
let supabaseInstance = null

export function getSupabaseInstance() {
  if (!supabaseInstance) {
    console.log("[Supabase Client] Creating singleton instance")
    supabaseInstance = createClientComponentClient()
  }
  return supabaseInstance
}

// ใช้ Singleton Pattern เพื่อให้มีการสร้าง client เพียงตัวเดียว
let connectionAttempts = 0
const MAX_ATTEMPTS = 5
const RETRY_DELAY = 1000

// ฟังก์ชันตรวจสอบการเชื่อมต่อ
const checkConnection = async (client) => {
  try {
    // ทดสอบการเชื่อมต่อด้วยการดึงข้อมูลง่ายๆ
    const { error } = await client.from("campsites").select("id").limit(1)
    return !error
  } catch (e) {
    console.error("[Supabase Client] Connection check failed:", e)
    return false
  }
}

// เพิ่มฟังก์ชันสำหรับดึงข้อมูลผู้ใช้ปัจจุบันอย่างปลอดภัย
export const getCurrentUser = async () => {
  try {
    const supabase = getSupabaseInstance()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("[Supabase Client] Error getting current user:", error)
      return null
    }

    return data?.user || null
  } catch (error) {
    console.error("[Supabase Client] Unexpected error getting current user:", error)
    return null
  }
}

// เพิ่มฟังก์ชันสำหรับรีเซ็ต client (ใช้เมื่อต้องการสร้าง client ใหม่)
export const resetClient = () => {
  console.log("[Supabase Client] Resetting client")
  supabaseClient = null
  supabaseInstance = null
  connectionAttempts = 0
}
