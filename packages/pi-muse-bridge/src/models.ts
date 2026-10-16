import type { Model } from "@earendil-works/pi-ai"
import type { ModelCatalogEntry } from "@muse-code/sdk/dist/src/msp.js"

// The bridge's own API discriminator: requests never touch an HTTP endpoint,
// they run turns over the Muse Session Protocol.
export const MUSE_API = "muse-msp"

export type MuseBridgeModel = Model<MuseApi>

export type MuseApi = typeof MUSE_API

// Muse Code's context window when the catalog reports no limit; matches the
// catalog slagent probes from the same host.
export const MUSE_CONTEXT_WINDOW = 1_007_997

export const MUSE_MAX_TOKENS = 65_536

// The subscription pays, so the catalog carries zero rates everywhere.
export const MUSE_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export function catalogModel(entry: ModelCatalogEntry): MuseBridgeModel {
  return {
    id: entry.modelId,
    name: entry.displayLabel || entry.modelId,
    api: MUSE_API,
    provider: "muse-bridge",
    baseUrl: "",
    input: ["text", "image"],
    cost: MUSE_COST,
    reasoning: true,
    contextWindow: entry.contextLimit ?? MUSE_CONTEXT_WINDOW,
    maxTokens: entry.outputLimit ?? MUSE_MAX_TOKENS,
  }
}

export function museBridgeModelDefaults(): MuseBridgeModel {
  return {
    id: "muse-wonder-1.0",
    name: "Muse Wonder",
    api: MUSE_API,
    provider: "muse-bridge",
    baseUrl: "",
    input: ["text", "image"],
    cost: MUSE_COST,
    reasoning: true,
    contextWindow: MUSE_CONTEXT_WINDOW,
    maxTokens: MUSE_MAX_TOKENS,
  }
}
