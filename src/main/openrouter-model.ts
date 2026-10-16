import type { ModelRuntime } from "@earendil-works/pi-coding-agent"
import type { AgentModel } from "./chat-runtime"

export function isOpenRouterModelId(modelId: string): boolean {
  return /^[^/\s:]+\/[^/\s]+$/.test(modelId)
}

export function resolveOpenRouterModel(runtime: ModelRuntime, modelId: string): AgentModel | undefined {
  if (modelId.includes(":batch")) return undefined
  const catalogModel = runtime.getModel("openrouter", modelId)
  if (catalogModel && !catalogModel.id.includes(":batch")) return catalogModel
  if (!isOpenRouterModelId(modelId)) return undefined

  const template = runtime.getModels("openrouter").find((model) => !model.id.includes(":batch"))
  if (!template) return undefined
  return { ...template, id: modelId, name: modelId }
}
