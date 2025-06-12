"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronUp, Phone, Heart, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingActionButton({ phone, onFavoriteClick, isFavorite, onShareClick }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // แสดงปุ่มเมื่อเลื่อนลงมาแล้ว
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
        setIsExpanded(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <div className="flex flex-col items-end space-y-2">
        {isExpanded && (
          <>
            {phone && (
              <Button
                size="icon"
                className="bg-green-600 hover:bg-green-700 rounded-full shadow-lg h-12 w-12"
                onClick={() => (window.location.href = `tel:${phone}`)}
              >
                <Phone className="h-5 w-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="outline"
              className={cn(
                "rounded-full shadow-lg h-12 w-12",
                isFavorite ? "bg-red-50 text-red-500 border-red-200" : "bg-white",
              )}
              onClick={onFavoriteClick}
            >
              <Heart className={cn("h-5 w-5", isFavorite ? "fill-current" : "")} />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full shadow-lg h-12 w-12 bg-white"
              onClick={onShareClick}
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </>
        )}
        <Button
          size="icon"
          className={cn(
            "rounded-full shadow-lg h-14 w-14 transition-all",
            isExpanded ? "bg-gray-700" : "bg-green-600 hover:bg-green-700",
          )}
          onClick={toggleExpand}
        >
          <ChevronUp className={cn("h-6 w-6 transition-transform", isExpanded ? "rotate-180" : "")} />
        </Button>
      </div>
    </div>
  )
}
