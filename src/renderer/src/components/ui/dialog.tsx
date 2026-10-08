import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { cn } from "@/lib/utils"

function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

function DialogContent({
  className,
  children,
  hideClose,
  overlayClassName,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  hideClose?: boolean
  overlayClassName?: string
}) {
  let overlay = "fixed inset-0 z-50 bg-black/70"
  if (overlayClassName) overlay = overlayClassName
  let close: ReactNode = <DialogClose />
  if (hideClose) close = null

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          overlay,
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-200",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "dialog-scale",
          "fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-black p-5 text-white shadow-none",
          className,
        )}
        {...props}
      >
        {children}
        {close}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogClose() {
  return (
    <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white">
      <X className="size-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  )
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-4 space-y-1 pr-6", className)} {...props} />
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-base font-medium tracking-tight", className)} {...props} />
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-white/60", className)} {...props} />
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle }
