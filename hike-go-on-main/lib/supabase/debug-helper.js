// ไฟล์สำหรับช่วยในการดีบั๊ก Supabase

// ฟังก์ชันสำหรับตรวจสอบโครงสร้างตาราง
export async function checkTableStructure(supabase, tableName) {
  try {
    console.log(`Checking structure of table: ${tableName}`)

    // ดึงข้อมูลตัวอย่างเพื่อตรวจสอบโครงสร้าง
    const { data, error } = await supabase.from(tableName).select("*").limit(1)

    if (error) {
      console.error(`Error fetching from ${tableName}:`, error)
      return { success: false, error }
    }

    if (!data || data.length === 0) {
      console.log(`No data found in ${tableName}`)
      return { success: true, structure: "No data to analyze" }
    }

    // วิเคราะห์โครงสร้างจากข้อมูลตัวอย่าง
    const sampleItem = data[0]
    const structure = Object.keys(sampleItem).map((key) => {
      return {
        column: key,
        type: typeof sampleItem[key],
        sample: sampleItem[key],
      }
    })

    console.log(`Structure of ${tableName}:`, structure)
    return { success: true, structure }
  } catch (err) {
    console.error(`Unexpected error checking ${tableName} structure:`, err)
    return { success: false, error: err.message }
  }
}

// ฟังก์ชันสำหรับตรวจสอบความสัมพันธ์ระหว่างตาราง
export async function checkTableRelationship(supabase, mainTable, relatedTable, foreignKey) {
  try {
    console.log(`Checking relationship between ${mainTable} and ${relatedTable} via ${foreignKey}`)

    // ดึงข้อมูลตัวอย่างจากตารางหลัก
    const { data: mainData, error: mainError } = await supabase.from(mainTable).select("id").limit(1)

    if (mainError) {
      console.error(`Error fetching from ${mainTable}:`, mainError)
      return { success: false, error: mainError }
    }

    if (!mainData || mainData.length === 0) {
      console.log(`No data found in ${mainTable}`)
      return { success: false, error: `No data in ${mainTable}` }
    }

    const mainId = mainData[0].id

    // ตรวจสอบความสัมพันธ์โดยการค้นห��ข้อมูลที่เกี่ยวข้อง
    const { data: relatedData, error: relatedError } = await supabase
      .from(relatedTable)
      .select("*")
      .eq(foreignKey, mainId)
      .limit(5)

    if (relatedError) {
      console.error(`Error checking relationship with ${relatedTable}:`, relatedError)
      return { success: false, error: relatedError }
    }

    console.log(`Found ${relatedData?.length || 0} related records in ${relatedTable} for ${mainTable} id ${mainId}`)
    return {
      success: true,
      hasRelatedData: relatedData && relatedData.length > 0,
      sampleData: relatedData,
    }
  } catch (err) {
    console.error(`Unexpected error checking relationship:`, err)
    return { success: false, error: err.message }
  }
}

// ฟังก์ชันสำหรับตรวจสอบข้อมูลในตาราง
export async function checkTableData(supabase, tableName, limit = 5) {
  try {
    console.log(`Checking data in table: ${tableName} (limit: ${limit})`)

    // ดึงจำนวนข้อมูลทั้งหมด
    const { count, error: countError } = await supabase.from(tableName).select("*", { count: "exact", head: true })

    if (countError) {
      console.error(`Error counting records in ${tableName}:`, countError)
      return { success: false, error: countError }
    }

    console.log(`Total records in ${tableName}: ${count || "unknown"}`)

    // ดึงข้อมูลตัวอย่าง
    const { data, error } = await supabase.from(tableName).select("*").limit(limit)

    if (error) {
      console.error(`Error fetching from ${tableName}:`, error)
      return { success: false, error }
    }

    console.log(`Sample data from ${tableName}:`, data)
    return {
      success: true,
      count,
      sampleData: data,
    }
  } catch (err) {
    console.error(`Unexpected error checking ${tableName} data:`, err)
    return { success: false, error: err.message }
  }
}

// ฟังก์ชันสำหรับตรวจสอบการเชื่อมต่อ Supabase
export async function checkSupabaseConnection(supabase) {
  try {
    console.log("Checking Supabase connection...")

    // ทดสอบการเชื่อมต่อด้วยการดึงข้อมูลง่ายๆ
    const startTime = Date.now()
    const { error } = await supabase.from("campsites").select("id").limit(1)
    const endTime = Date.now()

    if (error) {
      console.error("Supabase connection test failed:", error)
      return { success: false, error, latency: endTime - startTime }
    }

    console.log(`Supabase connection successful! (Latency: ${endTime - startTime}ms)`)
    return { success: true, latency: endTime - startTime }
  } catch (err) {
    console.error("Unexpected error testing Supabase connection:", err)
    return { success: false, error: err.message }
  }
}
