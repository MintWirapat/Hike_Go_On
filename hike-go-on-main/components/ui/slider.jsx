import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, style, ...props }, ref) => {
  const trackBg = style?.["--slider-track-background"] || "hsl(var(--secondary))"
  const rangeBg = style?.["--slider-range-background"] || "hsl(var(--primary))"
  const thumbBg = style?.["--slider-thumb-background"] || "hsl(var(--background))"
  const thumbBorder = style?.["--slider-thumb-border"] || "2px solid hsl(var(--primary))"

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track
        className="relative h-2 w-full grow overflow-hidden rounded-full"
        style={{ backgroundColor: trackBg }}
      >
        <SliderPrimitive.Range className="absolute h-full" style={{ backgroundColor: rangeBg }} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-5 w-5 rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{
          backgroundColor: thumbBg,
          border: thumbBorder,
        }}
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
