"use client"

import { motion } from "framer-motion"

export const FadeIn = ({ children, delay = 0, direction = null, className = "", distance = 24 }) => {
  const getDirection = () => {
    switch (direction) {
      case "up":
        return { y: distance }
      case "down":
        return { y: -distance }
      case "left":
        return { x: distance }
      case "right":
        return { x: -distance }
      default:
        return { y: 0, x: 0 }
    }
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...getDirection(),
      }}
      animate={{
        opacity: 1,
        y: 0,
        x: 0,
      }}
      transition={{
        duration: 0.5,
        delay: delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const FadeInStagger = ({ children, className = "", delay = 0, staggerDelay = 0.1 }) => {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export const FadeInStaggerItem = ({ children, className = "" }) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: "easeOut",
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
