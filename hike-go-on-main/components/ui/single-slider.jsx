"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const SingleSlider = React.forwardRef(({ className, ...props }, ref) => {
  // ตรวจสอบว่ามีการส่งค่า value มาหรือไม่ ถ้าไม่มีให้ใช้ค่าเริ่มต้น
  const value = props.value !== undefined ? props.value : props.defaultValue || 0

  // ปรับให้ value เป็น array เสมอเพื่อให้ทำงานกับ Radix UI Slider ได้
  const sliderValue = Array.isArray(value) ? value : [value]

  // สร้างฟังก์ชันสำหรับจัดการการเปลี่ยนแปลงค่า
  const handleValueChange = (newValue) => {
    if (props.onValueChange) {
      // ส่งค่าเดียวกลับไปถ้า props รับค่าเดียว หรือส่ง array กลับไปถ้า props รับ array
      props.onValueChange(Array.isArray(value) ? newValue : newValue[0])
    }
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
      value={sliderValue}
      onValueChange={handleValueChange}
      max={props.max || 100}
      step={props.step || 1}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full">
        <div className="absolute inset-0 w-full h-full bg-white"></div>
        <SliderPrimitive.Range className="absolute h-full bg-gray-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full bg-white border border-gray-300 shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})

SingleSlider.displayName = "SingleSlider"

export { SingleSlider }
