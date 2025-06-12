"use client"

import { useState, useEffect, useRef } from "react"

export function LazyLoadWrapper({ children, placeholder, threshold = 0.1 }) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true)
          setHasLoaded(true)
          // หยุดการสังเกตหลังจากที่โหลดแล้ว
          if (ref.current) {
            observer.unobserve(ref.current)
          }
        }
      },
      {
        threshold,
        rootMargin: "100px", // เริ่มโหลดก่อนที่จะเห็นคอมโพเนนต์
      },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [hasLoaded, threshold])

  return (
    <div ref={ref} className="w-full">
      {isVisible ? children : placeholder || <div className="animate-pulse bg-gray-200 h-40 rounded-md"></div>}
    </div>
  )
}
