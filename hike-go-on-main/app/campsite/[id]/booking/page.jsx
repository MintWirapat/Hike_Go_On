"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, differenceInDays, addDays, isBefore } from "date-fns"
import { th } from "date-fns/locale"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Search, Users, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { checkZoneAvailability, createBooking } from "@/utils/supabase/actions"
import { cn } from "@/lib/utils"

export default function BookingPage({ params }) {
  const router = useRouter()
  const [campsite, setCampsite] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [existingBookings, setExistingBookings] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityResult, setAvailabilityResult] = useState(null)
  const [zoneBookings, setZoneBookings] = useState({}) // เก็บข้อมูลการจองแยกตามโซน
  const [userId, setUserId] = useState(null) // เก็บ user ID

  const [bookingData, setBookingData] = useState({
    checkInDate: null,
    checkOutDate: null,
    guests: 1,
    zoneId: null,
    totalPrice: 0,
    notes: "",
  })

  // ดึงข้อมูลสถานที่แคมป์และการจองที่มีอยู่แล้ว
  useEffect(() => {
    const fetchCampsiteData = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = await createClient()

        // ตรวจสอบว่าผู้ใช้เข้าสู่ระบบแล้วหรือไม่
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push(`/login?redirect=/campsite/${params.id}/booking`)
          return
        }

        // เก็บ user ID
        setUserId(session.user.id)

        // ดึงข้อมูลสถานที่แคมป์
        const { data: campsiteData, error: campsiteError } = await supabase
          .from("campsites")
          .select("*")
          .eq("id", params.id)
          .single()

        if (campsiteError) {
          throw new Error("ไม่พบข้อมูลสถานที่แคมป์")
        }

        setCampsite(campsiteData)

        // ดึงข้อมูลโซนของแคมป์
        const { data: zonesData, error: zonesError } = await supabase
          .from("campsite_zones")
          .select("*")
          .eq("campsite_id", params.id)

        if (zonesError) {
          throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลโซน")
        }

        // ดึงรูปภาพของแต่ละโซน
        const zonesWithImages = await Promise.all(
          zonesData.map(async (zone) => {
            const { data: zoneImages, error: zoneImagesError } = await supabase
              .from("campsite_zone_images")
              .select("*")
              .eq("zone_id", zone.id)

            if (zoneImagesError) {
              console.error(`Error fetching images for zone ${zone.id}:`, zoneImagesError)
              return { ...zone, images: [] }
            }

            return { ...zone, images: zoneImages || [] }
          }),
        )

        setZones(zonesWithImages || [])

        // ดึงข้อมูลการจองที่มีอยู่แล้ว
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("check_in_date, check_out_date, notes, status")
          .eq("campsite_id", params.id)
          .gte("check_out_date", new Date().toISOString().split("T")[0])
          .neq("status", "cancelled") // ไม่รวมการจองที่ถูกยกเลิกแล้ว

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError)
        } else {
          setExistingBookings(bookingsData || [])

          // จัดกลุ่มการจองตามโซน
          const bookingsByZone = {}

          bookingsData.forEach((booking) => {
            // ดึงข้อมูลโซนจาก notes
            const zoneInfo = booking.notes || ""
            const zoneName = zoneInfo.match(/โซนที่จอง: (.+)/)
            const zoneNameValue = zoneName ? zoneName[1] : ""

            if (zoneNameValue) {
              if (!bookingsByZone[zoneNameValue]) {
                bookingsByZone[zoneNameValue] = []
              }
              bookingsByZone[zoneNameValue].push({
                checkIn: new Date(booking.check_in_date),
                checkOut: new Date(booking.check_out_date),
              })
            }
          })

          setZoneBookings(bookingsByZone)
        }
      } catch (error) {
        console.error("Error:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCampsiteData()
  }, [params.id, router])

  // คำนวณราคารวมเมื่อมีการเปลี่ยนแปลงวันที่หรือจำนวนคน
  useEffect(() => {
    if (campsite && bookingData.checkInDate && bookingData.checkOutDate) {
      const nights = differenceInDays(bookingData.checkOutDate, bookingData.checkInDate)
      if (nights > 0) {
        const selectedZone = getZoneById(bookingData.zoneId)
        const pricePerNight = selectedZone?.price_per_night || campsite.price
        const totalPrice = nights * pricePerNight * bookingData.guests
        setBookingData((prev) => ({ ...prev, totalPrice }))
      }
    }
  }, [bookingData.checkInDate, bookingData.checkOutDate, bookingData.guests, bookingData.zoneId, campsite])

  // เมื่อเลือกโซนใหม่ ให้รีเซ็ตจำนวนคนถ้าเกินความจุของโซน
  useEffect(() => {
    if (bookingData.zoneId) {
      const selectedZone = getZoneById(bookingData.zoneId)
      if (selectedZone && selectedZone.capacity && bookingData.guests > selectedZone.capacity) {
        setBookingData((prev) => ({ ...prev, guests: selectedZone.capacity }))
      }

      // รีเซ็ตผลการตรวจสอบความพร้อมเมื่อเปลี่ยนโซน
      setAvailabilityResult(null)
    }
  }, [bookingData.zoneId])

  // ตรวจสอบว่าวันที่เลือกมีการจองแล้วหรือไม่สำหรับโซนที่เลือก
  const isDateBooked = (date, zoneName) => {
    if (!zoneName || !zoneBookings[zoneName]) return false

    return zoneBookings[zoneName].some((booking) => {
      // เปรียบเทียบเฉพาะวันที่ (ไม่รวมเวลา)
      const bookingCheckIn = new Date(booking.checkIn)
      bookingCheckIn.setHours(0, 0, 0, 0)

      const bookingCheckOut = new Date(booking.checkOut)
      bookingCheckOut.setHours(0, 0, 0, 0)

      const compareDate = new Date(date)
      compareDate.setHours(0, 0, 0, 0)

      // วันที่เช็คเอาท์ไม่ถือว่าถูกจอง เพราะลูกค้าต้องออกก่อนเที่ยง
      return compareDate >= bookingCheckIn && compareDate < bookingCheckOut
    })
  }

  // ตรวจสอบว่าโซนว่างในช่วงวันที่เลือกหรือไม่
  const checkZoneAvailabilityHandler = async () => {
    setCheckingAvailability(true)
    setAvailabilityResult(null)
    setError(null)

    try {
      if (!bookingData.checkInDate || !bookingData.checkOutDate) {
        throw new Error("กรุณาเลือกวันที่เช็คอินและเช็คเอาท์")
      }

      if (!bookingData.zoneId) {
        throw new Error("กรุณาเลือกโซนที่ต้องการจอง")
      }

      const nights = differenceInDays(bookingData.checkOutDate, bookingData.checkInDate)
      if (nights < 1) {
        throw new Error("วันที่เช็คเอาท์ต้องมากกว่าวันที่เช็คอิน")
      }

      const selectedZone = getZoneById(bookingData.zoneId)

      // เรียกใช้ server action เพื่อตรวจสอบความพร้อมของโซน
      const result = await checkZoneAvailability(
        params.id,
        selectedZone.name,
        format(bookingData.checkInDate, "yyyy-MM-dd"),
        format(bookingData.checkOutDate, "yyyy-MM-dd"),
      )

      setAvailabilityResult({
        available: result.available,
        message: result.available
          ? `โซน ${selectedZone.name} ว่างในช่วงวันที่คุณเลือก สามารถจองได้!`
          : result.error || `โซน ${selectedZone.name} ไม่ว่างในช่วงวันที่คุณเลือก กรุณาเลือกวันที่อื่นหรือโซนอื่น`,
      })
    } catch (error) {
      console.error("Error checking availability:", error)
      setError(error.message)
    } finally {
      setCheckingAvailability(false)
    }
  }

  // ส่งข้อมูลการจอง
  const handleSubmit = async (e) => {
    e.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      if (!userId) {
        console.error("No user ID found")
        setError("กรุณาเข้าสู่ระบบก่อนจองสถานที่แคมป์")
        setSubmitting(false)
        router.push(`/login?redirect=/campsite/${params.id}/booking`)
        return
      }

      if (!bookingData.checkInDate) {
        setError("กรุณาเลือกวันที่เข้าพัก")
        setSubmitting(false)
        return
      }

      if (!bookingData.zoneId) {
        setError("กรุณาเลือกโซนที่ต้องการจอง")
        setSubmitting(false)
        return
      }

      if (!availabilityResult || !availabilityResult.available) {
        setError("กรุณาตรวจสอบความพร้อมของโซนก่อนจอง")
        setSubmitting(false)
        return
      }

      const nights = differenceInDays(bookingData.checkOutDate, bookingData.checkInDate)
      if (nights < 1) {
        setError("วันที่เช็คเอาท์ต้องมากกว่าวันที่เช็คอิน")
        setSubmitting(false)
        return
      }

      const selectedZone = getZoneById(bookingData.zoneId)

      const bookingPayload = {
        campsite_id: params.id,
        check_in_date: format(bookingData.checkInDate, "yyyy-MM-dd"),
        check_out_date: format(bookingData.checkOutDate, "yyyy-MM-dd"),
        guests: bookingData.guests,
        total_price: bookingData.totalPrice,
        status: "pending",
        notes: `โซนที่จอง: ${selectedZone?.name || "ไม่ระบุ"}${bookingData.notes ? `\n${bookingData.notes}` : ""}`,
        payment_status: "unpaid", // เพิ่มสถานะการชำระเงิน
        payment_method: null, // เพิ่มวิธีการชำระเงิน (จะกำหนดภายหลัง)
        user_id: userId, // ใช้ userId ที่เก็บไว้ตั้งแต่ตอนโหลดหน้า
      }

      console.log("Sending booking payload:", bookingPayload)

      // เรียกใช้ server action เพื่อสร้างการจอง
      const result = await createBooking(bookingPayload)

      if (result.success && result.booking) {
        setSuccess(true)
        // เปลี่ยนจากไปหน้ารายละเอียดการจองเป็นไปหน้าโปรไฟล์แท็บการจอง
        setTimeout(() => {
          router.push(`/profile?tab=bookings`)
        }, 1000)
      } else {
        console.error("Booking error:", result.error)
        setError(result.error || "เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง")
      }
    } catch (error) {
      console.error("Error creating booking:", error)
      setError(`เกิดข้อผิดพลาดในการจอง: ${error.message || "กรุณาลองใหม่อีกครั้ง"}`)
    } finally {
      setSubmitting(false)
    }
  }

  // หาโซนจากไอดี
  const getZoneById = (zoneId) => {
    return zones.find((zone) => zone.id === zoneId) || null
  }

  // สร้างตัวเลือกจำนวนคนตามความจุของโซน
  const getGuestOptions = () => {
    if (!bookingData.zoneId) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }

    const selectedZone = getZoneById(bookingData.zoneId)
    if (!selectedZone || !selectedZone.capacity) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }

    // สร้างอาร์เรย์ตั้งแต่ 1 ถึงความจุของโซน
    return Array.from({ length: selectedZone.capacity }, (_, i) => i + 1)
  }

  // ตรวจสอบว่าวันที่เลือกมีการจองแล้วหรือไม่สำหรับปฏิทิน
  const isDateDisabled = (date) => {
    if (!bookingData.zoneId) return false

    const selectedZone = getZoneById(bookingData.zoneId)
    if (!selectedZone) return false

    return isDateBooked(date, selectedZone.name)
  }

  // ฟังก์ชันสำหรับกำหนด CSS class ของวันที่ในปฏิทิน
  const getDayClassName = (date, baseClassName) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // วันที่ผ่านไปแล้ว
    if (isBefore(date, today)) {
      return cn(baseClassName, "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50")
    }

    // ถ้าเลือกโซนแล้ว ตรวจสอบว่าวันนั้นมีการจองแล้วหรือไม่
    if (bookingData.zoneId) {
      const selectedZone = getZoneById(bookingData.zoneId)
      if (selectedZone && isDateBooked(date, selectedZone.name)) {
        return cn(baseClassName, "bg-red-100 text-red-800 hover:bg-red-200")
      }
    }

    return baseClassName
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 md:py-10 px-4 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error && !campsite) {
    return (
      <div className="container mx-auto py-6 md:py-10 px-4">
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/search")} className="mt-4">
          กลับไปยังหน้าค้นหา
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 max-w-5xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/campsite/${params.id}`)}
          className="flex items-center text-green-700"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          กลับไปยังรายละเอียดสถานที่แคมป์
        </Button>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-2">จองสถานที่แคมป์</h1>
      <p className="text-gray-600 mb-6">
        {campsite?.name} - {campsite?.location}, {campsite?.province}
      </p>

      {error && (
        <Alert className="mb-4 bg-red-50 text-red-700 border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-700 border-green-200">
          <AlertDescription>จองสถานที่แคมป์สำเร็จ! กำลังนำคุณไปยังหน้าประวัติการจอง...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                ขั้นตอนที่ 1: เลือกโซนที่ต้องการจอง
              </CardTitle>
            </CardHeader>
            <CardContent>
              {zones.length > 0 ? (
                <RadioGroup
                  value={bookingData.zoneId}
                  onValueChange={(value) => {
                    setBookingData((prev) => ({ ...prev, zoneId: value }))
                    setAvailabilityResult(null)
                  }}
                  className="grid grid-cols-1 gap-4"
                >
                  {zones.map((zone) => {
                    const zoneImage = zone.images && zone.images.length > 0 ? zone.images[0].image_url : null
                    const zoneHasBookings = zoneBookings[zone.name] && zoneBookings[zone.name].length > 0

                    return (
                      <label
                        key={zone.id}
                        className={`flex items-start space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${
                          bookingData.zoneId === zone.id ? "border-green-500 bg-green-50" : "border-gray-200"
                        }`}
                      >
                        <RadioGroupItem value={zone.id} id={`zone-${zone.id}`} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-start">
                            {zoneImage && (
                              <div className="relative w-20 h-20 rounded overflow-hidden mr-3 flex-shrink-0">
                                <Image
                                  src={zoneImage || "/placeholder.svg"}
                                  alt={zone.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{zone.name}</div>
                                {zoneHasBookings && (
                                  <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                                    มีการจองบางวัน
                                  </Badge>
                                )}
                              </div>
                              {zone.width && zone.length && (
                                <div className="text-sm text-gray-600">
                                  ขนาด: {zone.width} x {zone.length} เมตร
                                </div>
                              )}
                              {zone.capacity && (
                                <div className="text-sm text-gray-600 flex items-center">
                                  <Users className="h-3.5 w-3.5 mr-1" />
                                  <strong>รองรับ: {zone.capacity} คน</strong>
                                </div>
                              )}
                              {zone.description && <div className="text-sm text-gray-600 mt-1">{zone.description}</div>}

                              {/* แสดงราคาต่อคืน */}
                              <div className="text-sm font-medium text-green-600 mt-1">
                                ราคา: {(zone.price_per_night || campsite.price).toLocaleString()} บาท/คืน
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </RadioGroup>
              ) : (
                <div className="text-amber-600 bg-amber-50 p-3 rounded-md">ไม่พบข้อมูลโซนสำหรับสถานที่แคมป์นี้</div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                ขั้นตอนที่ 2: เลือกวันที่เข้าพัก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkInDate">วันที่เช็คอิน</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingData.checkInDate ? (
                          format(bookingData.checkInDate, "PPP", { locale: th })
                        ) : (
                          <span>เลือกวันที่</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bookingData.checkInDate}
                        onSelect={(date) => {
                          if (date) {
                            setBookingData((prev) => ({
                              ...prev,
                              checkInDate: date,
                              // ถ้ามีวันที่เช็คเอาท์อยู่แล้วและวันที่เช็คอินใหม่มากกว่า ให้รีเซ็ตวันที่เช็คเอาท์
                              checkOutDate:
                                prev.checkOutDate && date >= prev.checkOutDate ? addDays(date, 1) : prev.checkOutDate,
                            }))
                            setAvailabilityResult(null)
                          }
                        }}
                        disabled={(date) => {
                          // ไม่สามารถเลือกวันในอดีตได้
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          // ถ้าเลือกโซนแล้ว ให้ตรวจสอบว่าวันนั้นมีการจองแล้วหรือไม่
                          if (bookingData.zoneId) {
                            const selectedZone = getZoneById(bookingData.zoneId)
                            if (selectedZone && isDateBooked(date, selectedZone.name)) {
                              return true
                            }
                          }

                          return date < today
                        }}
                        modifiers={{
                          booked: (date) => {
                            if (bookingData.zoneId) {
                              const selectedZone = getZoneById(bookingData.zoneId)
                              return selectedZone && isDateBooked(date, selectedZone.name)
                            }
                            return false
                          },
                          past: (date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return date < today
                          },
                        }}
                        modifiersClassNames={{
                          booked: "bg-red-100 text-red-800 hover:bg-red-200",
                          past: "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50",
                        }}
                        locale={th}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOutDate">วันที่เช็คเอาท์</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingData.checkOutDate ? (
                          format(bookingData.checkOutDate, "PPP", { locale: th })
                        ) : (
                          <span>เลือกวันที่</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bookingData.checkOutDate}
                        onSelect={(date) => {
                          if (date) {
                            setBookingData((prev) => ({ ...prev, checkOutDate: date }))
                            setAvailabilityResult(null)
                          }
                        }}
                        disabled={(date) => {
                          // ต้องมากกว่าวันเช็คอิน และไม่สามารถเลือกวันในอดีตได้
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (bookingData.checkInDate) {
                            // ถ้าเลือกโซนแล้ว ให้ตรวจสอบว่าวันนั้นมีการจองแล้วหรือไม่
                            if (bookingData.zoneId) {
                              const selectedZone = getZoneById(bookingData.zoneId)
                              if (selectedZone && isDateBooked(date, selectedZone.name)) {
                                return true
                              }
                            }

                            return date <= bookingData.checkInDate || date < today
                          }

                          return date < today
                        }}
                        modifiers={{
                          booked: (date) => {
                            if (bookingData.zoneId) {
                              const selectedZone = getZoneById(bookingData.zoneId)
                              return selectedZone && isDateBooked(date, selectedZone.name)
                            }
                            return false
                          },
                          past: (date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return date < today
                          },
                        }}
                        modifiersClassNames={{
                          booked: "bg-red-100 text-red-800 hover:bg-red-200",
                          past: "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50",
                        }}
                        locale={th}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {bookingData.checkInDate && bookingData.checkOutDate && (
                <div className="mt-4 p-3 bg-green-50 rounded-md text-green-700 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  <p>
                    คุณเลือกเข้าพัก{" "}
                    <strong>{differenceInDays(bookingData.checkOutDate, bookingData.checkInDate)} คืน</strong> ตั้งแต่วันที่{" "}
                    <strong>{format(bookingData.checkInDate, "PPP", { locale: th })}</strong> ถึง{" "}
                    <strong>{format(bookingData.checkOutDate, "PPP", { locale: th })}</strong>
                  </p>
                </div>
              )}

              {bookingData.zoneId && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">คำอธิบายสถานะการจอง:</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                      <span>วันที่ว่าง</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-100 rounded-full mr-1"></div>
                      <span>วันที่มีการจองแล้ว</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-400 rounded-full mr-1"></div>
                      <span>วันที่ผ่านไปแล้ว</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                ขั้นตอนที่ 3: ระบุจำนวนผู้เข้าพักและรายละเอียดเพิ่มเติม
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guests">จำนวนคน</Label>
                  <Select
                    value={bookingData.guests.toString()}
                    onValueChange={(value) => setBookingData((prev) => ({ ...prev, guests: Number.parseInt(value) }))}
                    disabled={!bookingData.zoneId}
                  >
                    <SelectTrigger id="guests">
                      <SelectValue placeholder="เลือกจำนวนคน" />
                    </SelectTrigger>
                    <SelectContent>
                      {getGuestOptions().map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} คน
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bookingData.zoneId && getZoneById(bookingData.zoneId)?.capacity && (
                    <p className="text-xs text-gray-500">
                      * โซนนี้รองรับได้สูงสุด {getZoneById(bookingData.zoneId).capacity} คน
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">หมายเหตุเพิ่มเติม (ถ้ามี)</Label>
                  <Textarea
                    id="notes"
                    placeholder="ระบุความต้องการพิเศษหรือข้อมูลเพิ่มเติม"
                    value={bookingData.notes}
                    onChange={(e) => setBookingData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                ขั้นตอนที่ 4: ตรวจสอบความพร้อมของโซน
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    onClick={checkZoneAvailabilityHandler}
                    disabled={
                      checkingAvailability ||
                      !bookingData.zoneId ||
                      !bookingData.checkInDate ||
                      !bookingData.checkOutDate
                    }
                    className="w-full md:w-auto bg-amber-500 hover:bg-amber-600"
                  >
                    {checkingAvailability ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังตรวจสอบ...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        ตรวจสอบความพร้อมของโซน
                      </>
                    )}
                  </Button>
                </div>

                {availabilityResult && (
                  <Alert
                    className={`${
                      availabilityResult.available
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    <div className="flex items-center">
                      {availabilityResult.available ? (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      <AlertDescription>{availabilityResult.message}</AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !bookingData.checkInDate ||
                  !bookingData.checkOutDate ||
                  !bookingData.zoneId ||
                  (availabilityResult && !availabilityResult.available) ||
                  !availabilityResult
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังดำเนินการ...
                  </>
                ) : (
                  "ยืนยันการจอง"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>สรุปการจอง</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{campsite?.name}</h3>
                <p className="text-sm text-gray-600">
                  {campsite?.location}, {campsite?.province}
                </p>
              </div>

              <Separator />

              {bookingData.zoneId && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">โซนที่เลือก:</span>
                      <span className="font-medium">{getZoneById(bookingData.zoneId)?.name}</span>
                    </div>
                    {getZoneById(bookingData.zoneId)?.capacity && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">รองรับสูงสุด:</span>
                        <span className="font-medium">{getZoneById(bookingData.zoneId)?.capacity} คน</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {bookingData.checkInDate && bookingData.checkOutDate && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">วันที่เช็คอิน:</span>
                    <span className="font-medium">{format(bookingData.checkInDate, "PPP", { locale: th })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">วันที่เช็คเอาท์:</span>
                    <span className="font-medium">{format(bookingData.checkOutDate, "PPP", { locale: th })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">จำนวนคืน:</span>
                    <span className="font-medium">
                      {differenceInDays(bookingData.checkOutDate, bookingData.checkInDate)} คืน
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">จำนวนผู้เข้าพัก:</span>
                    <span className="font-medium">{bookingData.guests} คน</span>
                  </div>
                </div>
              )}

              {bookingData.totalPrice > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">ราคาต่อคืน:</span>
                      <span className="font-medium">
                        {(getZoneById(bookingData.zoneId)?.price_per_night || campsite?.price).toLocaleString()} บาท
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg pt-2">
                      <span>ราคารวม:</span>
                      <span className="text-green-600">{bookingData.totalPrice.toLocaleString()} บาท</span>
                    </div>
                  </div>
                </>
              )}

              {availabilityResult && availabilityResult.available && (
                <div className="mt-4 bg-green-50 p-3 rounded-md text-green-700 text-sm flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>โซนนี้ว่างในช่วงวันที่คุณเลือก พร้อมสำหรับการจอง!</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
