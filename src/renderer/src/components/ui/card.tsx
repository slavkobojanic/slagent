import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type CardProps = ComponentProps<"div">

export const Card = ({ className, ...props }: CardProps) => (
  <div className={cn("rounded-md bg-white/5 px-3 py-2.5", className)} {...props} />
)
