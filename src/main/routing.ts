import type { ModelRouting } from "../shared/types"
import type { AgentModel } from "./chat-runtime"

// OpenRouter sorts the providers that serve a model. "throughput" favours fast
// output, "price" the cheapest. Balance leaves the sort off, so OpenRouter's
// own default balancing applies.
const SORTS: Record<Exclude<ModelRouting, "balance">, string> = {
  speed: "throughput",
  cost: "price",
}

// A copy carries the routing preference, so the shared catalog model is left
// alone and switching back to balance clears the sort.
export function routeModel(model: AgentModel, routing: ModelRouting): AgentModel {
  if (routing === "balance") return model
  const compat = (model.compat ?? {}) as Record<string, unknown>
  const current = compat.openRouterRouting as Record<string, unknown> | undefined
  return {
    ...model,
    compat: { ...compat, openRouterRouting: { ...current, sort: SORTS[routing] } },
  } as AgentModel
}
