import type { ChatStatus } from "ai"
import { CornerDownLeftIcon, SquareIcon, XIcon } from "lucide-react"
import type { ComponentProps, HTMLAttributes, MouseEvent } from "react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// Presentational parts of the prompt box. Nothing here holds state: the text, the attachments, and
// the submit logic all come in as props, so the feature that owns the box decides what they mean.

export function PromptInput({ className, children, ...props }: HTMLAttributes<HTMLFormElement>) {
  return (
    <form className={cn("w-full", className)} {...props}>
      <InputGroup className="overflow-hidden rounded-2xl border-0 bg-input/40 shadow-none dark:bg-input/30 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        {children}
      </InputGroup>
    </form>
  )
}

export function PromptInputBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("contents", className)} {...props} />
}

export function PromptInputTextarea({ className, placeholder = "What would you like to know?", ...props }: ComponentProps<typeof InputGroupTextarea>) {
  return <InputGroupTextarea className={cn("field-sizing-content max-h-48 min-h-16", className)} name="message" placeholder={placeholder} {...props} />
}

export function PromptInputHeader({ className, ...props }: ComponentProps<typeof InputGroupAddon>) {
  return <InputGroupAddon align="block-end" className={cn("order-first flex-wrap gap-2", className)} {...props} />
}

export function PromptInputFooter({ className, ...props }: ComponentProps<typeof InputGroupAddon>) {
  return <InputGroupAddon align="block-end" className={cn("justify-between gap-4", className)} {...props} />
}

export function PromptInputTools({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 items-center gap-1", className)} {...props} />
}

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus
  onStop?: () => void
}

// While a run is generating, the button stops it instead of submitting.
export function PromptInputSubmit({ className, variant = "default", size = "icon-sm", status, onStop, onClick, children, ...props }: PromptInputSubmitProps) {
  const isGenerating = status === "submitted" || status === "streaming"

  let icon = <CornerDownLeftIcon className="size-4" />
  if (status === "submitted") {
    icon = <Spinner />
  } else if (status === "streaming") {
    icon = <SquareIcon className="size-4" />
  } else if (status === "error") {
    icon = <XIcon className="size-4" />
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isGenerating && onStop) {
      event.preventDefault()
      onStop()
      return
    }
    onClick?.(event)
  }

  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      className={cn(className)}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ?? icon}
    </InputGroupButton>
  )
}
