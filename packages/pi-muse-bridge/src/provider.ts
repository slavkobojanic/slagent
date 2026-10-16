import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"
import { spawnMspConnection, type SpawnedMspConnection } from "@muse-code/sdk"
import type { ApiKeyAuth, Model, Provider, TranscriptContext, SimpleStreamOptions } from "@earendil-works/pi-ai"
import type { ModelCatalogEntry } from "@muse-code/sdk/dist/src/msp.js"
import { catalogModel, MUSE_COST, museBridgeModelDefaults, type MuseApi, type MuseBridgeModel } from "./models"
import { runMuseTurn } from "./stream"
import { MUSE_CLIENT } from "./stream"

export const MUSE_PROVIDER_ID = "muse-bridge"

// Muse Code keeps its own login; the bridge only checks the launcher is there.
// Without it the provider reads as unconfigured and pi hides it from /model.
export const museAuth: ApiKeyAuth = {
  name: "Muse Code login",
  resolve: async () => {
    if (!findMuse()) return undefined
    return { auth: { apiKey: "muse-code" }, source: "Muse Code login" }
  },
}

export function museProvider(): Provider<MuseApi> {
  let models: MuseBridgeModel[] = [museBridgeModelDefaults()]
  return {
    id: MUSE_PROVIDER_ID,
    name: "Muse (Muse Code)",
    auth: { apiKey: museAuth },
    getModels: () => models,
    async refreshModels(context) {
      // The catalog is provider-owned in-memory state; nothing persists.
      if (!context.allowNetwork) return
      const found = await museCatalog()
      if (found.length === 0) return
      models = found
      await context.publish({
        update: () => {
          models = found
        },
      })
    },
    streamSimple: (model: Model<MuseApi>, context: TranscriptContext, options?: SimpleStreamOptions) =>
      runMuseTurn({ model: model as MuseBridgeModel, context, options, museBin: findMuse() ?? "muse" }),
    stream(model, context, options) {
      // The bridge only ships the simple form; stream() maps one-to-one onto it.
      return this.streamSimple!(model, context, options as SimpleStreamOptions | undefined)
    },
  }
}

// The real catalog, read from a short-lived host. Empty when Muse Code is
// missing or has never signed in, so pi keeps the previous list.
export async function museCatalog(): Promise<MuseBridgeModel[]> {
  const muse = findMuse()
  if (!muse) return []
  let connection: SpawnedMspConnection | null = null
  try {
    connection = await spawnMspConnection({
      command: muse,
      args: ["serve"],
      cwd: homedir(),
      env: museEnv(),
      onStderr: () => {},
    }).initialize({ clientInfo: MUSE_CLIENT })
    const result = await connection.connection.command("model/list", {})
    const entries = (result.models ?? []) as ModelCatalogEntry[]
    return entries.map(catalogModel)
  } catch {
    return []
  } finally {
    await connection?.close().catch(() => undefined)
  }
}

// Apps opened from the Dock get a bare PATH, so the user's own install is
// looked for in the usual places. The installer targets ~/.local/bin.
export function findMuse(): string | null {
  const home = homedir()
  const dirs = [
    ...(process.env.PATH ?? "").split(delimiter).filter(Boolean),
    join(home, ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
  ]
  for (const dir of dirs) {
    const file = join(dir, "muse")
    if (existsSync(file)) return file
  }
  return null
}

function museEnv(): Record<string, string | undefined> {
  const parts = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  for (const extra of [join(homedir(), ".local", "bin"), "/opt/homebrew/bin", "/usr/local/bin"]) {
    if (!parts.includes(extra)) parts.push(extra)
  }
  return { ...process.env, PATH: parts.join(delimiter) }
}

// Re-exported so the catalog's zero-cost shape has one home.
export { MUSE_COST }
