import { useMemo, useState } from "react"
import { toast } from "sonner"
import type { ModelOption, ModelProvider } from "@shared/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ProviderLogo } from "@/components/provider-logo"
import { errorText, formatContext } from "@/lib/format"
import { cn } from "@/lib/utils"

const OPENROUTER_LIMIT = 40

const PROVIDERS: Record<ModelProvider, { label: string; hint: string }> = {
  "claude-code": {
    label: "Claude Code",
    hint: "Runs your Claude Code install with its login, such as a Claude subscription.",
  },
  openrouter: {
    label: "OpenRouter",
    hint: "Billed per token to your OpenRouter key.",
  },
}

// A main process from before providers existed sends models without one.
function providerOf(model: ModelOption): ModelProvider {
  return model.provider === "claude-code" ? "claude-code" : "openrouter"
}

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
    if (needle) {
      return models.filter((model) => {
        const haystack = `${model.name} ${model.id} ${PROVIDERS[providerOf(model)].label}`.toLowerCase()
        return haystack.includes(needle)
      })
    }
    const selected = models.filter((model) => model.id === modelId)
    const rest = models.filter((model) => model.id !== modelId)
    return [...selected, ...rest]
  }, [models, query, modelId])

  const claude = filtered.filter((model) => providerOf(model) === "claude-code")
  const openRouter = filtered.filter((model) => providerOf(model) === "openrouter")
  const openRouterVisible = openRouter.slice(0, OPENROUTER_LIMIT)
  const openRouterTotal = models.filter((model) => providerOf(model) === "openrouter").length

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

  function row(model: ModelOption) {
    const selected = model.id === modelId
    return (
      <button
        key={model.id}
        type="button"
        disabled={disabled || pendingId !== null}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 border-b border-white/10 px-3 py-2 text-left last:border-b-0 hover:bg-white/10 disabled:opacity-40",
          selected && "bg-white text-black hover:bg-white",
        )}
        onClick={() => void select(model.id)}
      >
        <span className="flex w-full items-center gap-2 text-sm">
          <ProviderLogo provider={providerOf(model)} className={cn(selected && providerOf(model) === "openrouter" && "text-black")} />
          <span className="truncate">{model.name}</span>
        </span>
        <span className={cn("pl-5.5 font-mono text-xs text-white/45", selected && "text-black/60")}>
          {model.id}
          {" · "}
          {formatContext(model.contextWindow)}
        </span>
      </button>
    )
  }

  function section(provider: ModelProvider, items: ModelOption[], count: string) {
    if (items.length === 0) return null
    return (
      <div>
        <div className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-white/10 bg-black px-3 py-1.5">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-white/70">
            <ProviderLogo provider={provider} className="size-3" />
            {PROVIDERS[provider].label}
          </span>
          <span className="truncate text-[11px] text-white/40">
            {PROVIDERS[provider].hint} {count}
          </span>
        </div>
        {items.map(row)}
      </div>
    )
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
          <DialogDescription>
            Claude Code models use your Claude Code login. The rest come from OpenRouter. A chat stays on one, so
            switching between them starts a new chat.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          autoFocus
          placeholder="Search models"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-white/15">
          {filtered.length === 0 ? <p className="px-3 py-6 text-sm text-white/50">No matching models</p> : null}
          {section("claude-code", claude, "")}
          {section("openrouter", openRouterVisible, `${openRouterTotal} models.`)}
        </div>
        {openRouter.length > openRouterVisible.length ? (
          <p className="mt-2 text-xs text-white/40">
            Showing {openRouterVisible.length} OpenRouter models. Refine the search to see more.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export { ModelDialog }
