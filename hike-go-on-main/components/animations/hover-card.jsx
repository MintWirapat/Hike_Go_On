"use client"

import { useState } from "react"
import { motion } from "framer-motion"

export function HoverCard({ children, className = "", hoverScale = 1.05, duration = 0.3 }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? hoverScale : 1,
      }}
      transition={{
        duration: duration,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  )
}
