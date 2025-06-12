// ไฟล์สำหรับตรวจสอบข้อมูลสิ่งอำนวยความสะดวกและกฎระเบียบในฐานข้อมูล
import { createClient } from "@supabase/supabase-js"

// สร้าง Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// กำหนด ID ของแคมป์ไซต์ที่ต้องการตรวจสอบ
const campsiteId = "1a59074e-b7d8-49ae-be32-ebd4c32f5b47" // แก้ไขเป็น ID ที่ต้องการตรวจสอบ

async function checkFacilitiesAndRules() {
  try {
    // ตรวจสอบข้อมูลสิ่งอำนวยความสะดวก
    const { data: facilities, error: facilitiesError } = await supabase
      .from("campsite_facilities")
      .select("*")
      .eq("campsite_id", campsiteId)

    if (facilitiesError) {
      console.error("Error fetching facilities:", facilitiesError)
    } else {
      console.log("Facilities data:", facilities)
      console.log("Number of facilities:", facilities.length)
    }

    // ตรวจสอบข้อมูลกฎระเบียบ
    const { data: rules, error: rulesError } = await supabase
      .from("campsite_rules")
      .select("*")
      .eq("campsite_id", campsiteId)

    if (rulesError) {
      console.error("Error fetching rules:", rulesError)
    } else {
      console.log("Rules data:", rules)
      console.log("Number of rules:", rules.length)
    }

    // ตรวจสอบโครงสร้างตาราง
    console.log("Checking table structure...")

    const { data: facilitiesColumns, error: facilitiesColumnsError } = await supabase.rpc("get_table_columns", {
      table_name: "campsite_facilities",
    })

    if (facilitiesColumnsError) {
      console.error("Error fetching facilities table structure:", facilitiesColumnsError)
    } else {
      console.log("Facilities table structure:", facilitiesColumns)
    }

    const { data: rulesColumns, error: rulesColumnsError } = await supabase.rpc("get_table_columns", {
      table_name: "campsite_rules",
    })

    if (rulesColumnsError) {
      console.error("Error fetching rules table structure:", rulesColumnsError)
    } else {
      console.log("Rules table structure:", rulesColumns)
    }
  } catch (error) {
    console.error("Error in checkFacilitiesAndRules:", error)
  }
}

// เรียกใช้ฟังก์ชัน
checkFacilitiesAndRules()
