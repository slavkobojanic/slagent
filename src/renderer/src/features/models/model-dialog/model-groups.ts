import type { ModelOption, ModelProvider } from "@shared/types"
import { formatContext } from "@/lib/format"

// The dialog lists at most this many OpenRouter models. A search can narrow them further.
export const OPENROUTER_LIMIT = 40

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

export type ModelRow = {
  id: string
  name: string
  provider: ModelProvider
  detail: string
  selected: boolean
}

export type ModelSection = {
  provider: ModelProvider
  label: string
  summary: string
  rows: ModelRow[]
}

export type ModelGroups = {
  sections: ModelSection[]
  overflowNotice: string | null
}

// A main process from before providers existed sends models without one.
export function providerOf(model: { provider?: ModelProvider }): ModelProvider {
  if (model.provider === "claude-code") {
    return "claude-code"
  }
  return "openrouter"
}

// Groups the models the way the dialog lists them: Claude Code first, then OpenRouter.
export function groupModels(models: ModelOption[], modelId: string | null, query: string): ModelGroups {
  const visible = filterModels(models, modelId, query)
  const claude = visible.filter((model) => providerOf(model) === "claude-code")
  const openRouter = visible.filter((model) => providerOf(model) === "openrouter")
  const openRouterShown = openRouter.slice(0, OPENROUTER_LIMIT)
  const openRouterTotal = models.filter((model) => providerOf(model) === "openrouter").length

  const sections = [
    toSection("claude-code", claude, modelId, ""),
    toSection("openrouter", openRouterShown, modelId, `${openRouterTotal} models.`),
  ].filter((section): section is ModelSection => section !== null)

  return { sections, overflowNotice: overflowNoticeFor(openRouter.length, openRouterShown.length) }
}

// A search matches the name, the id, or the provider label, ignoring case. Without one, the
// current model comes first.
function filterModels(models: ModelOption[], modelId: string | null, query: string): ModelOption[] {
  const needle = query.trim().toLowerCase()
  if (needle !== "") {
    return models.filter((model) => {
      const haystack = `${model.name} ${model.id} ${PROVIDERS[providerOf(model)].label}`.toLowerCase()
      return haystack.includes(needle)
    })
  }
  const selected = models.filter((model) => model.id === modelId)
  const rest = models.filter((model) => model.id !== modelId)
  return [...selected, ...rest]
}

function toSection(provider: ModelProvider, models: ModelOption[], modelId: string | null, count: string): ModelSection | null {
  if (models.length === 0) {
    return null
  }
  const { label, hint } = PROVIDERS[provider]
  return {
    provider,
    label,
    summary: count === "" ? hint : `${hint} ${count}`,
    rows: models.map((model) => toRow(model, modelId)),
  }
}

function toRow(model: ModelOption, modelId: string | null): ModelRow {
  return {
    id: model.id,
    name: model.name,
    provider: providerOf(model),
    detail: `${model.id} · ${formatContext(model.contextWindow)}`,
    selected: model.id === modelId,
  }
}

function overflowNoticeFor(matched: number, shown: number): string | null {
  if (matched <= shown) {
    return null
  }
  return `Showing ${shown} OpenRouter models. Refine the search to see more.`
}
