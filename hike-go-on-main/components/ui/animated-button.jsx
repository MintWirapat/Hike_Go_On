"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { forwardRef } from "react"

const AnimatedButton = forwardRef(({ children, className, variant, ...props }, ref) => {
  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
      <Button ref={ref} className={className} variant={variant} {...props}>
        {children}
      </Button>
    </motion.div>
  )
})

AnimatedButton.displayName = "AnimatedButton"

export { AnimatedButton }
