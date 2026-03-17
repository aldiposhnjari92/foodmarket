"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { indeterminate?: boolean }
>(({ className, indeterminate, ...props }, ref) => {
  const innerRef = React.useRef<HTMLInputElement>(null)

  React.useImperativeHandle(ref, () => innerRef.current!)

  React.useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = !!indeterminate
    }
  }, [indeterminate])

  return (
    <input
      type="checkbox"
      ref={innerRef}
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 rounded border border-input accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
