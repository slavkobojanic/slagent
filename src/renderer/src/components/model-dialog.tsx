import { useMemo, useState } from "react"
import { toast } from "sonner"
import type { ModelOption } from "@shared/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { errorText, formatContext } from "@/lib/format"
import { cn } from "@/lib/utils"

function ModelDialog({
  open,
  onOpenChange,
  models,
  modelId,
  disabled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  models: ModelOption[]
  modelId: string | null
  disabled: boolean
}) {
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let next = models
    if (needle) {
      next = models.filter((model) => {
        const haystack = `${model.name} ${model.id}`.toLowerCase()
        return haystack.includes(needle)
      })
      return next
    }
    const selected = next.filter((model) => model.id === modelId)
    const rest = next.filter((model) => model.id !== modelId)
    return [...selected, ...rest]
  }, [models, query, modelId])

  const visible = filtered.slice(0, 40)

  async function select(id: string) {
    if (disabled) return
    setPendingId(id)
    try {
      const change = await window.slagent.setModel(id)
      if (!change.applied) toast.message("This chat keeps its model until the run finishes.")
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="w-[min(100%-2rem,36rem)]">
        <DialogHeader>
          <DialogTitle>Model</DialogTitle>
          <DialogDescription>OpenRouter models from Pi&apos;s catalog.</DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          autoFocus
          placeholder="Search models"
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="mt-2 text-xs text-white/40">{models.length} models</p>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-white/15">
          {visible.length === 0 ? <p className="px-3 py-6 text-sm text-white/50">No matching models</p> : null}
          {visible.map((model) => (
            <button
              key={model.id}
              type="button"
              disabled={disabled || pendingId !== null}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b border-white/10 px-3 py-2 text-left last:border-b-0 hover:bg-white/10 disabled:opacity-40",
                model.id === modelId && "bg-white text-black hover:bg-white",
              )}
              onClick={() => void select(model.id)}
            >
              <span className="text-sm">{model.name}</span>
              <span className={cn("font-mono text-xs text-white/45", model.id === modelId && "text-black/60")}>
                {model.id}
                {" · "}
                {formatContext(model.contextWindow)}
              </span>
            </button>
          ))}
        </div>
        {filtered.length > visible.length ? (
          <p className="mt-2 text-xs text-white/40">Showing {visible.length}. Refine the search to see more.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { ModelDialog }
