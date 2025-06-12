"use client"

// ฟังก์ชันสำหรับติดตามประสิทธิภาพของเว็บไซต์

// เริ่มการวัดเวลา
export const startMeasure = (label) => {
  if (typeof window === "undefined" || !window.performance) return

  try {
    performance.mark(`${label}-start`)
  } catch (error) {
    console.error(`Error starting performance measure for ${label}:`, error)
  }
}

// จบการวัดเวลาและคำนวณผล
export const endMeasure = (label, shouldLog = true) => {
  if (typeof window === "undefined" || !window.performance) return

  try {
    performance.mark(`${label}-end`)
    performance.measure(label, `${label}-start`, `${label}-end`)

    const entries = performance.getEntriesByName(label)
    const duration = entries.length > 0 ? entries[0].duration : 0

    if (shouldLog) {
      console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`)
    }

    return duration
  } catch (error) {
    console.error(`Error ending performance measure for ${label}:`, error)
    return 0
  }
}

// ติดตามการโหลดหน้า
export const trackPageLoad = () => {
  if (typeof window === "undefined") return

  try {
    window.addEventListener("load", () => {
      // ใช้ Navigation Timing API
      if (performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType("navigation")
        if (navigationEntries.length > 0) {
          const timing = navigationEntries[0]

          console.log("Page Load Performance:", {
            dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
            tcpConnection: timing.connectEnd - timing.connectStart,
            serverResponse: timing.responseStart - timing.requestStart,
            domLoad: timing.domComplete - timing.domInteractive,
            totalPageLoad: timing.loadEventEnd - timing.startTime,
          })
        }
      }

      // ใช้ Paint Timing API
      if (performance.getEntriesByType) {
        const paintEntries = performance.getEntriesByType("paint")
        paintEntries.forEach((entry) => {
          console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`)
        })
      }
    })
  } catch (error) {
    console.error("Error tracking page load performance:", error)
  }
}

// ติดตามการใช้ทรัพยากร
export const trackResourceUsage = () => {
  if (typeof window === "undefined" || !performance.getEntriesByType) return

  try {
    const resourceEntries = performance.getEntriesByType("resource")

    // จัดกลุ่มทรัพยากรตามประเภท
    const resourcesByType = resourceEntries.reduce((acc, resource) => {
      const type = resource.initiatorType || "other"
      if (!acc[type]) acc[type] = []
      acc[type].push({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0,
      })
      return acc
    }, {})

    // คำนวณสถิติ
    Object.keys(resourcesByType).forEach((type) => {
      const resources = resourcesByType[type]
      const totalSize = resources.reduce((sum, r) => sum + r.size, 0)
      const totalTime = resources.reduce((sum, r) => sum + r.duration, 0)
      const avgTime = totalTime / resources.length

      console.log(`Resource Type: ${type}`, {
        count: resources.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        totalTime: `${totalTime.toFixed(2)}ms`,
        avgTime: `${avgTime.toFixed(2)}ms`,
      })
    })
  } catch (error) {
    console.error("Error tracking resource usage:", error)
  }
}
