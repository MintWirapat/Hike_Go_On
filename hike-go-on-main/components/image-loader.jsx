"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

export function OptimizedImage({ src, alt, fill = false, sizes, className, priority = false, quality = 80, ...props }) {
  const [imgSrc, setImgSrc] = useState(src || "/placeholder.svg")
  const [loading, setLoading] = useState(!priority)
  const [error, setError] = useState(false)

  useEffect(() => {
    // อัพเดท src เมื่อ prop เปลี่ยน
    if (src) {
      setImgSrc(src)
      setError(false)
    }
  }, [src])

  // ตรวจสอบว่า URL รูปภาพถูกต้องหรือไม่
  const isValidImageUrl = (url) => {
    if (!url) return false
    // ยอมรับ URL ที่เริ่มต้นด้วย http://, https://, / หรือ data:image
    return (
      url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") || url.startsWith("data:image")
    )
  }

  // ฟังก์ชันจัดการเมื่อรูปภาพโหลดไม่สำเร็จ
  const handleError = () => {
    console.log("Image failed to load:", imgSrc)
    setError(true)
    setImgSrc("/placeholder.svg")
  }

  // ฟังก์ชันจัดการเมื่อรูปภาพโหลดสำเร็จ
  const handleLoad = () => {
    setLoading(false)
  }

  return (
    <div className={`relative ${fill ? "h-full w-full" : ""} ${loading ? "bg-gray-100 animate-pulse" : ""}`}>
      <Image
        src={isValidImageUrl(imgSrc) ? imgSrc : "/placeholder.svg"}
        alt={alt || "รูปภาพ"}
        fill={fill}
        sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
        className={`${className || ""} ${error ? "opacity-70" : ""} transition-opacity duration-300 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
        priority={priority}
        quality={quality}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  )
}
