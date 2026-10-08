import * as React from "react"

import { cn } from "@/lib/utils"

// shadcn/ui Skeleton, in the app's translucent tone (it sits on the glass
// surfaces), pulsing only when the reader allows motion.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md bg-black/10 dark:bg-white/10 motion-safe:animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
