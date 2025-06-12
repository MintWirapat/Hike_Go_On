import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { AnimatedButton } from "@/components/ui/animated-button"
import { FadeIn } from "@/components/animations/fade-in"
import { ScrollReveal, ScrollRevealStagger, ScrollRevealItem } from "@/components/animations/scroll-reveal"
import { HoverCard } from "@/components/animations/hover-card"
import { PulseIcon } from "@/components/animations/pulse-icon"
import { CheckCircle, Shield, SearchIcon } from "lucide-react"
import ClientSearchForm from "@/components/client-search-form"

export const dynamic = "force-dynamic"

// ฟังก์ชันสำหรับดึงข้อมูลสถานที่แคมป์
async function getTopCampsites() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("campsites")
    .select(`
      *,
      images:campsite_images(*)
    `)
    .order("created_at", { ascending: false })
    .limit(3)

  if (error) {
    console.error("Error fetching campsites:", error)
    return []
  }

  return data || []
}

// ฟังก์ชันสำหรับดึงข้อมูลอุปกรณ์แคมป์ปิ้ง
async function getTopEquipment() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from("equipment")
    .select(`
      *,
      images:equipment_images(*)
    `)
    .order("created_at", { ascending: false })
    .limit(3)

  if (error) {
    console.error("Error fetching equipment:", error)
    return []
  }

  return data || []
}

// ฟังก์ชันสำหรับหาภาพหลักของสถานที่แคมป์หรืออุปกรณ์
function getMainImage(images, defaultImage) {
  if (!images || !Array.isArray(images) || images.length === 0) return defaultImage
  const mainImage = images.find((img) => img.is_main) || images[0]
  return mainImage?.image_url || defaultImage
}

export default async function Home() {
  // ดึงข้อมูลสถานที่แคมป์และอุปกรณ์แคมป์ปิ้ง
  const [campsites, equipment] = await Promise.all([getTopCampsites(), getTopEquipment()])

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-green-700 text-white py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <FadeIn delay={0.2}>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-4">ค้นหาสถานที่แคมป์ปิ้งที่ดีที่สุด</h1>
          </FadeIn>
          <FadeIn delay={0.4}>
            <p className="text-base sm:text-lg md:text-xl mb-4 sm:mb-6 md:mb-8">
              ค้นหาและเปรียบเทียบสถานที่แคมป์มากกว่า 100 แห่งทั่วประเทศไทย
            </p>
          </FadeIn>

          <FadeIn delay={0.6}>
            <ClientSearchForm />
          </FadeIn>
        </div>
      </section>

      {/* Recommended Camping Spots */}
      <section className="py-6 sm:py-10 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-1 sm:mb-2">สถานที่แคมป์ล่าสุด</h2>
            <p className="text-center text-gray-600 mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base">
              สำรวจสถานที่แคมป์ล่าสุดที่เพิ่งเพิ่มเข้ามาในระบบ
            </p>
          </ScrollReveal>

          <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {campsites && Array.isArray(campsites) && campsites.length > 0 ? (
              campsites.map((campsite) => {
                const imageUrl = getMainImage(campsite.images, "/mountain-basecamp.png")

                return (
                  <ScrollRevealItem key={campsite.id}>
                    <Link href={`/campsite/${campsite.id}`} className="block h-full">
                      <HoverCard className="bg-white rounded-lg overflow-hidden shadow-md h-full">
                        <div className="relative h-48 sm:h-60">
                          <Image
                            src={imageUrl || "/placeholder.svg"}
                            alt={campsite.name || "Campsite"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4 md:p-6">
                          <h3 className="text-lg md:text-xl font-bold mb-2">{campsite.name || "Unnamed Campsite"}</h3>
                          <p className="text-sm text-gray-500 mb-2">{campsite.province || "ไม่ระบุสถานที่"}</p>
                          <p className="text-gray-700 text-sm md:text-base mb-4 line-clamp-2">
                            {campsite.description || "ไม่มีคำอธิบาย"}
                          </p>
                          <Button
                            variant="outline"
                            className="w-full border-green-500 text-green-500 hover:bg-green-50"
                          >
                            ดูรายละเอียด
                          </Button>
                        </div>
                      </HoverCard>
                    </Link>
                  </ScrollRevealItem>
                )
              })
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500 mb-4">ไม่พบข้อมูลสถานที่แคมป์</p>
                <Link href="/search">
                  <Button className="bg-green-600 hover:bg-green-700">ดูสถานที่แคมป์ทั้งหมด</Button>
                </Link>
              </div>
            )}
          </ScrollRevealStagger>

          <div className="text-center mt-8">
            <ScrollReveal delay={0.2}>
              <Link href="/search">
                <AnimatedButton variant="outline" className="border-green-500 text-green-500 hover:bg-green-50">
                  ดูเพิ่มเติม
                </AnimatedButton>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Latest Camping Equipment */}
      <section className="py-6 sm:py-10 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-1 sm:mb-2">อุปกรณ์แคมป์ปิ้งล่าสุด</h2>
            <p className="text-center text-gray-600 mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base">
              อุปกรณ์แคมป์ปิ้งล่าสุดที่เพิ่งเพิ่มเข้ามาในระบบ
            </p>
          </ScrollReveal>

          <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment && Array.isArray(equipment) && equipment.length > 0 ? (
              equipment.map((item) => {
                const imageUrl = getMainImage(item.images, "/lakeside-campout.png")

                return (
                  <ScrollRevealItem key={item.id}>
                    <Link href={`/equipment/${item.id}`} className="block h-full">
                      <HoverCard className="bg-white rounded-lg overflow-hidden shadow-md h-full">
                        <div className="relative h-48 sm:h-60">
                          <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                            {item.condition === "new" ? "มือ 1" : "มือ 2"}
                          </div>
                          <Image
                            src={imageUrl || "/placeholder.svg"}
                            alt={item.name || "Equipment"}
                            fill
                            className="object-contain p-4"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium mb-1 line-clamp-2">{item.name || "Unnamed Equipment"}</h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description || "ไม่มีคำอธิบาย"}</p>
                          <p className="text-green-600 font-bold mb-2">฿{(item.price || 0).toLocaleString()}</p>
                          <Button
                            variant="outline"
                            className="w-full border-green-500 text-green-500 hover:bg-green-50 text-sm"
                          >
                            ดูรายละเอียด
                          </Button>
                        </div>
                      </HoverCard>
                    </Link>
                  </ScrollRevealItem>
                )
              })
            ) : (
              <div className="col-span-3 text-center py-10">
                <p className="text-gray-500 mb-4">ไม่พบข้อมูลอุปกรณ์แคมป์ปิ้ง</p>
                <Link href="/equipment">
                  <Button className="bg-green-600 hover:bg-green-700">ดูอุปกรณ์แคมป์ปิ้งทั้งหมด</Button>
                </Link>
              </div>
            )}
          </ScrollRevealStagger>

          <div className="text-center mt-8">
            <ScrollReveal delay={0.2}>
              <Link href="/equipment">
                <AnimatedButton variant="outline" className="border-green-500 text-green-500 hover:bg-green-50">
                  ดูเพิ่มเติม
                </AnimatedButton>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-6 sm:py-10 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-4 sm:mb-8">ทำไมต้องเลือกเรา</h2>
            <p className="text-center text-gray-600 mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base">
              เราคือผู้นำด้านการค้นหาสถานที่แคมป์ปิ้งในประเทศไทย
            </p>
          </ScrollReveal>

          <ScrollRevealStagger className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Feature 1 */}
            <ScrollRevealItem>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border h-full">
                <div className="flex justify-center mb-3 sm:mb-4">
                  <PulseIcon className="bg-green-100 p-2 sm:p-3 rounded-full">
                    <SearchIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </PulseIcon>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-center mb-1 sm:mb-2">ค้นหาง่าย</h3>
                <p className="text-gray-600 text-center text-xs sm:text-sm">
                  ค้นหาสถานที่แคมป์ปิ้งได้อย่างรวดเร็วและง่ายดาย สามารถกรองตามสถานที่และราคาได้อย่างแม่นยำ
                </p>
              </div>
            </ScrollRevealItem>

            {/* Feature 2 */}
            <ScrollRevealItem>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border h-full">
                <div className="flex justify-center mb-3 sm:mb-4">
                  <PulseIcon className="bg-green-100 p-2 sm:p-3 rounded-full" delay={0.5}>
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </PulseIcon>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-center mb-1 sm:mb-2">คุณภาพเชื่อถือได้</h3>
                <p className="text-gray-600 text-center text-xs sm:text-sm">
                  เราคัดกรองสถานที่แคมป์และอุปกรณ์ทุกชิ้นอย่างพิถีพิถัน เพื่อให้คุณมั่นใจในคุณภาพ
                </p>
              </div>
            </ScrollRevealItem>

            {/* Feature 3 */}
            <ScrollRevealItem>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border h-full">
                <div className="flex justify-center mb-3 sm:mb-4">
                  <PulseIcon className="bg-green-100 p-2 sm:p-3 rounded-full" delay={1}>
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </PulseIcon>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-center mb-1 sm:mb-2">ปลอดภัยกว่า</h3>
                <p className="text-gray-600 text-center text-xs sm:text-sm">
                  เราดูแลเรื่องความปลอดภัยเป็นอันดับ 1 ผู้ใช้คุณสามารถไว้วางใจได้ในการทำธุรกรรมผ่านเรา
                </p>
              </div>
            </ScrollRevealItem>
          </ScrollRevealStagger>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-700 text-white py-6 sm:py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* For Campsite Owners */}
            <ScrollReveal direction="left">
              <div className="text-center md:text-left">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4">คุณเป็นเจ้าของลานแคมป์หรือไม่?</h3>
                <p className="mb-4 sm:mb-6 text-sm sm:text-base">
                  เพิ่มสถานที่แคมป์ปิ้งของคุณเข้าสู่แพลตฟอร์มของเรา เพื่อให้นักท่องเที่ยวสามารถค้นพบได้
                </p>
                <Link href="/post">
                  <AnimatedButton className="bg-white text-green-700 hover:bg-gray-100 text-sm sm:text-base">
                    ลงทะเบียนสถานที่
                  </AnimatedButton>
                </Link>
              </div>
            </ScrollReveal>

            {/* For More Information */}
            <ScrollReveal direction="right">
              <div className="text-center md:text-left mt-6 md:mt-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-4">คุณมีอุปกรณ์แคมป์ปิ้งลงขายหรือไม่?</h3>
                <p className="mb-4 sm:mb-6 text-sm sm:text-base">
                  ลงขายอุปกรณ์แคมป์ปิ้งของคุณเข้าสู่แพลตฟอร์มของเรา เพื่อให้ผู้คนสามารถค้นพบได้
                </p>
                <Link href="/equipment-post">
                  <AnimatedButton className="bg-white text-green-700 hover:bg-gray-100 text-sm sm:text-base">
                    ลงขายอุปกรณ์แคมป์ปิ้ง
                  </AnimatedButton>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  )
}
