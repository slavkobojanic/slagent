import { EllipsisIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export type RowMenuProps = {
  label: string
  // Controlled only when something else opens the menu, such as a right-click.
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

// The reveal-on-hover CSS lives in library.css (.row-menu).
export function RowMenu({ label, open, onOpenChange, children }: RowMenuProps) {
  return (
    <div className="row-menu">
      <div>
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs" className="row-menu-button mr-1" aria-label={label}>
              <EllipsisIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{children}</DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
