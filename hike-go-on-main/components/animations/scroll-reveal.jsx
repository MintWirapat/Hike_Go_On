"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"

export const ScrollReveal = ({ children, threshold = 0.1, className = "", delay = 0, direction = "up" }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, threshold })
  const controls = useAnimation()

  const getInitial = () => {
    switch (direction) {
      case "up":
        return { opacity: 0, y: 50 }
      case "down":
        return { opacity: 0, y: -50 }
      case "left":
        return { opacity: 0, x: 50 }
      case "right":
        return { opacity: 0, x: -50 }
      case "scale":
        return { opacity: 0, scale: 0.9 }
      default:
        return { opacity: 0, y: 50 }
    }
  }

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        transition: {
          duration: 0.6,
          delay,
          ease: "easeOut",
        },
      })
    }
  }, [isInView, controls, delay])

  return (
    <motion.div ref={ref} initial={getInitial()} animate={controls} className={className}>
      {children}
    </motion.div>
  )
}

export const ScrollRevealStagger = ({ children, className = "", threshold = 0.1, delay = 0, staggerDelay = 0.1 }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, threshold })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [isInView, controls])

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={controls}
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

export const ScrollRevealItem = ({ children, className = "", direction = "up" }) => {
  const getVariants = () => {
    switch (direction) {
      case "up":
        return {
          hidden: { opacity: 0, y: 50 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
      case "down":
        return {
          hidden: { opacity: 0, y: -50 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
      case "left":
        return {
          hidden: { opacity: 0, x: 50 },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
      case "right":
        return {
          hidden: { opacity: 0, x: -50 },
          visible: {
            opacity: 1,
            x: 0,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
      case "scale":
        return {
          hidden: { opacity: 0, scale: 0.9 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
      default:
        return {
          hidden: { opacity: 0, y: 50 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
              ease: "easeOut",
            },
          },
        }
    }
  }

  return (
    <motion.div className={className} variants={getVariants()}>
      {children}
    </motion.div>
  )
}
