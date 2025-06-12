"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseInstance } from "@/lib/supabase/client"
import { checkTableRelationship, checkTableData, checkSupabaseConnection } from "@/lib/supabase/debug-helper"

export default function DebugPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const supabase = getSupabaseInstance()

      // ตรวจสอบการเชื่อมต่อ
      const connectionResult = await checkSupabaseConnection(supabase)

      if (!connectionResult.success) {
        throw new Error(`Connection failed: ${connectionResult.error?.message || "Unknown error"}`)
      }

      // ตรวจสอบข้อมูลในตาราง campsites
      const campsitesData = await checkTableData(supabase, "campsites")

      // ตรวจสอบข้อมูลในตาราง equipment
      const equipmentData = await checkTableData(supabase, "equipment")

      // ตรวจสอบความสัมพันธ์ระหว่างตาราง
      const campsiteImagesRelation = await checkTableRelationship(
        supabase,
        "campsites",
        "campsite_images",
        "campsite_id",
      )

      const equipmentImagesRelation = await checkTableRelationship(
        supabase,
        "equipment",
        "equipment_images",
        "equipment_id",
      )

      // รวบรวมผลลัพธ์
      setResults({
        connection: connectionResult,
        tables: {
          campsites: campsitesData,
          equipment: equipmentData,
        },
        relationships: {
          campsiteImages: campsiteImagesRelation,
          equipmentImages: equipmentImagesRelation,
        },
      })
    } catch (err) {
      console.error("Error running diagnostics:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">หน้าตรวจสอบและแก้ไขปัญหา</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>เครื่องมือวินิจฉัย</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? "กำลังตรวจสอบ..." : "เริ่มการตรวจสอบ"}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
              <p className="font-semibold">เกิดข้อผิดพลาด:</p>
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <>
          <h2 className="text-xl font-semibold mb-4">ผลการตรวจสอบ</h2>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>การเชื่อมต่อ Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${results.connection.success ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <p>{results.connection.success ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อล้มเหลว"}</p>
              </div>
              {results.connection.latency && (
                <p className="mt-2 text-sm text-gray-600">ความเร็วในการตอบสนอง: {results.connection.latency} ms</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลตาราง Campsites</CardTitle>
              </CardHeader>
              <CardContent>
                {results.tables.campsites.success ? (
                  <>
                    <p>จำนวนข้อมูล: {results.tables.campsites.count || "ไม่ทราบ"}</p>
                    {results.tables.campsites.count === 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                        ไม่พบข้อมูลในตาราง campsites ซึ่งอาจเป็นสาเหตุที่ทำให้ไม่แสดงผลในหน้าหลัก
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-red-500">ไม่สามารถดึงข้อมูลได้: {results.tables.campsites.error?.message}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลตาราง Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                {results.tables.equipment.success ? (
                  <p>จำนวนข้อมูล: {results.tables.equipment.count || "ไม่ทราบ"}</p>
                ) : (
                  <p className="text-red-500">ไม่สามารถดึงข้อมูลได้: {results.tables.equipment.error?.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ความสัมพันธ์ Campsites - Images</CardTitle>
              </CardHeader>
              <CardContent>
                {results.relationships.campsiteImages.success ? (
                  <p>
                    {results.relationships.campsiteImages.hasRelatedData
                      ? "พบข้อมูลรูปภาพที่เชื่อมโยงกับ campsite"
                      : "ไม่พบข้อมูลรูปภาพที่เชื่อมโยงกับ campsite"}
                  </p>
                ) : (
                  <p className="text-red-500">
                    ไม่สามารถตรวจสอบความสัมพันธ์ได้: {results.relationships.campsiteImages.error?.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ความสัมพันธ์ Equipment - Images</CardTitle>
              </CardHeader>
              <CardContent>
                {results.relationships.equipmentImages.success ? (
                  <p>
                    {results.relationships.equipmentImages.hasRelatedData
                      ? "พบข้อมูลรูปภาพที่เชื่อมโยงกับ equipment"
                      : "ไม่พบข้อมูลรูปภาพที่เชื่อมโยงกับ equipment"}
                  </p>
                ) : (
                  <p className="text-red-500">
                    ไม่สามารถตรวจสอบความสัมพันธ์ได้: {results.relationships.equipmentImages.error?.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
