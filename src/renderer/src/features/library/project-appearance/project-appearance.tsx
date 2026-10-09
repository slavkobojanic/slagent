import type { ReactNode } from "react"
import { PROJECT_COLORS, PROJECT_ICONS } from "@shared/project-appearance"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { projectIcon } from "@/components/project-appearance"
import { cn } from "@/lib/utils"

export type ProjectAppearanceProps = {
  open: boolean
  projectName: string
  icon: string | null
  color: string | null
  busy: boolean
  error: string | null
  onIcon: (icon: string | null) => void
  onColor: (color: string | null) => void
  onCancel: () => void
  onConfirm: () => void
}

export function ProjectAppearance({ open, projectName, icon, color, busy, error, onIcon, onColor, onCancel, onConfirm }: ProjectAppearanceProps) {
  const PreviewIcon = projectIcon(icon ?? undefined)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customise {projectName}</DialogTitle>
          <DialogDescription>Pick an icon and a colour. The colour tints the project's terminals.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            {PreviewIcon === null ? (
              <span className="text-xs text-foreground/30">–</span>
            ) : (
              <PreviewIcon className="size-5" style={color === null ? undefined : { color }} />
            )}
          </span>
          <p className="text-xs text-muted-foreground">
            {icon === null ? "No icon" : PROJECT_ICONS.find((item) => item.id === icon)?.label ?? "Icon"} ·{" "}
            {color === null ? "default colour" : PROJECT_COLORS.find((item) => item.id === color)?.label}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/60">Icon</p>
          <div className="flex flex-wrap gap-1">
            <Swatch selected={icon === null} title="No icon" onClick={() => onIcon(null)}>
              <span className="text-xs text-foreground/30">–</span>
            </Swatch>
            {PROJECT_ICONS.map((item) => {
              const Icon = projectIcon(item.id)
              return (
                <Swatch key={item.id} selected={icon === item.id} title={item.label} onClick={() => onIcon(item.id)}>
                  {Icon === null ? null : <Icon className="size-4" style={color === null ? undefined : { color }} />}
                </Swatch>
              )
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground/60">Colour</p>
          <div className="flex flex-wrap gap-1">
            <Swatch selected={color === null} title="Default" onClick={() => onColor(null)}>
              <span className="text-xs text-foreground/30">–</span>
            </Swatch>
            {PROJECT_COLORS.map((item) => (
              <Swatch key={item.id} selected={color === item.id} title={item.label} onClick={() => onColor(item.id)}>
                <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: item.value }} />
              </Swatch>
            ))}
          </div>
        </div>
        {error !== null ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => onConfirm()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Swatch({ selected, title, onClick, children }: { selected: boolean; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={selected}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-foreground/70 hover:bg-accent",
        selected ? "border-foreground bg-accent" : "border-border",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
