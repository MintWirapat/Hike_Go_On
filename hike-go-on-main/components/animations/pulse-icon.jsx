"use client"

import { motion } from "framer-motion"

export function PulseIcon({ children, className = "", pulseScale = 1.2, duration = 1.5 }) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, pulseScale, 1],
      }}
      transition={{
        duration: duration,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "loop",
      }}
    >
      {children}
    </motion.div>
  )
}
