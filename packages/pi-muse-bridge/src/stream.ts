import { readSessionDurability, Session, spawnMspConnection, type SpawnedMspConnection } from "@muse-code/sdk"
import { createAssistantMessageEventStream, type AssistantMessage, type AssistantMessageEventStream, type SimpleStreamOptions, type TranscriptContext } from "@earendil-works/pi-ai"
import type { Item, ItemDeltaParams, TokenUsage, TurnInputPart, TurnCompletedParams } from "@muse-code/sdk/dist/src/msp.js"
import type { MuseBridgeModel } from "./models"
import { renderTranscript, turnPrompt } from "./transcript"
import { turnUsage } from "./usage"

export const MUSE_CLIENT = { name: "slagent_muse_bridge", version: "0.1.0" }

export type RunTurnInput = {
  model: MuseBridgeModel
  context: TranscriptContext
  options?: SimpleStreamOptions
  // The muse launcher found on PATH; callers throw before the stream opens
  // when it is missing.
  museBin: string
}

// Runs one muse turn and streams its answer back as pi provider events. A
// fresh session carries each call: pi sends the full transcript every time, so
// muse's own session history would only double it.
export function runMuseTurn(input: RunTurnInput): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream()
  void run(stream, input)
  return stream
}

async function run(stream: AssistantMessageEventStream, input: RunTurnInput): Promise<void> {
  const message: AssistantMessage = {
    role: "assistant",
    content: [],
    api: "muse-msp",
    provider: "muse-bridge",
    model: input.model.id,
    usage: turnUsage(undefined),
    stopReason: "pending",
    timestamp: Date.now(),
  }
  stream.push({ type: "start", partial: message })

  type TextEntry = { index: number; block: Extract<AssistantMessage["content"][number], { type: "text" }> }
  type ThinkingEntry = { index: number; block: Extract<AssistantMessage["content"][number], { type: "thinking" }> }
  let text: TextEntry | null = null
  let thinking: ThinkingEntry | null = null

  const openText = (): TextEntry => {
    if (!text) {
      const entry: TextEntry = { index: message.content.length, block: { type: "text", text: "" } }
      message.content.push(entry.block)
      stream.push({ type: "text_start", contentIndex: entry.index, partial: message })
      text = entry
    }
    return text
  }
  const appendText = (delta: string) => {
    const entry = openText()
    entry.block.text += delta
    stream.push({ type: "text_delta", contentIndex: entry.index, delta, partial: message })
  }
  const openThinking = (): ThinkingEntry => {
    if (!thinking) {
      const entry: ThinkingEntry = { index: message.content.length, block: { type: "thinking", thinking: "" } }
      message.content.push(entry.block)
      stream.push({ type: "thinking_start", contentIndex: entry.index, partial: message })
      thinking = entry
    }
    return thinking
  }
  const appendThinking = (delta: string) => {
    const entry = openThinking()
    entry.block.thinking += delta
    stream.push({ type: "thinking_delta", contentIndex: entry.index, delta, partial: message })
  }
  const closeText = () => {
    if (!text) return
    const entry = text
    stream.push({ type: "text_end", contentIndex: entry.index, content: entry.block.text, partial: message })
    text = null
  }
  const closeThinking = () => {
    if (!thinking) return
    const entry = thinking
    stream.push({ type: "thinking_end", contentIndex: entry.index, content: entry.block.thinking, partial: message })
    thinking = null
  }

  const finish = (stopReason: AssistantMessage["stopReason"], errorMessage?: string) => {
    closeText()
    closeThinking()
    message.stopReason = stopReason
    if (errorMessage) message.errorMessage = errorMessage
    stream.push(
      stopReason === "stop"
        ? { type: "done", reason: "stop", message }
        : { type: "error", reason: stopReason === "aborted" ? "aborted" : "error", error: message },
    )
  }

  let client: SpawnedMspConnection | null = null
  try {
    client = await spawnMspConnection({
      command: input.museBin,
      args: ["serve"],
      cwd: process.cwd(),
      env: museEnv(),
      onStderr: () => {},
    }).initialize({ clientInfo: MUSE_CLIENT })
    const durability = readSessionDurability(client.initializeResult)
    const started = await client.connection.command("session/start", {
      workspaceRoot: process.cwd(),
      modelId: input.model.id,
    })
    const sessionId = (started.session as { sessionId: string }).sessionId
    const session = new Session({ sessionId, durability, connection: client.connection })

    let usage: TokenUsage | undefined
    let outcome: TurnCompletedParams | null = null
    const onNotification = (notification: { method: string; params?: unknown }) => {
      void input.options?.onProviderStreamEvent?.(notification, input.model)
      const params = notification.params as Record<string, unknown> | undefined
      if (notification.method === "item/started") {
        const item = itemOf(params)
        if (item?.kind === "toolCall") appendText(toolLine(item))
      } else if (notification.method === "item/completed") {
        const item = itemOf(params)
        if (item?.kind === "toolCall" && item.status !== "completed") appendText(`${toolLine(item)} (${item.status})`)
        if (item?.kind === "agentMessage" && typeof item.text === "string") {
          // The completed item is authoritative over the accumulated deltas.
          const entry = text
          if (entry && entry.block.text !== item.text) {
            const correction = item.text.slice(entry.block.text.length)
            if (correction) appendText(correction)
          }
        }
      } else if (notification.method === "item/delta") {
        const delta = params as unknown as ItemDeltaParams
        const field = delta.field ?? "text"
        if (field === "text") appendText(delta.delta)
        else if (field.startsWith("summary")) appendThinking(delta.delta)
      } else if (notification.method === "session/tokenUsage") {
        usage = (params as { usage?: TokenUsage }).usage
      } else if (notification.method === "turn/completed") {
        outcome = params as unknown as TurnCompletedParams
      }
      session.apply(notification)
    }
    client.connection.onNotification(onNotification)

    const abort = () => {
      void client?.connection
        .command("turn/interrupt", { sessionId, turnId: session.fold.activeTurnId })
        .catch(() => undefined)
    }
    input.options?.signal?.addEventListener("abort", abort, { once: true })

    const ack = await session.sendUserTurn({
      input: turnInput(input.context),
      reasoningEffort: input.options?.reasoning,
    })
    await session.turn(ack.turnId).completed
    input.options?.signal?.removeEventListener("abort", abort)

    message.usage = turnUsage(usage ?? (outcome as TurnCompletedParams | null)?.usage)
    const terminal = (outcome as TurnCompletedParams | null)?.terminal
    if (terminal === "completed") finish("stop")
    else if (terminal === "cancelled") finish("aborted", "The Muse turn was cancelled.")
    else {
      const error = (outcome as TurnCompletedParams | null)?.error
      finish("error", authHint(error?.kind, error?.message ?? "Muse Code stopped with an error."))
    }
  } catch (error) {
    finish("error", errorMessage(error))
  } finally {
    await client?.close().catch(() => undefined)
  }
}

function toolLine(item: Item): string {
  const label = item.displayLabel?.active ?? item.statusLine ?? item.tool ?? "tool"
  return `\n[using ${label}]`
}

function itemOf(params: unknown): Item | undefined {
  if (typeof params !== "object" || params === null || !("item" in params)) return undefined
  return (params as { item: Item }).item
}

function authHint(kind: string | undefined, message: string): string {
  if (kind === "authRequired") return "Muse Code isn't signed in. Run `muse` in a terminal and sign in, then try again."
  return message
}

function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/ENOENT|spawn/i.test(text))
    return "Muse Code isn't installed. Install it with `curl https://dev.meta.ai/install.sh | bash`, sign in with `muse`, then try again."
  return authHint(undefined, text)
}

function museEnv(): Record<string, string | undefined> {
  return { ...process.env }
}

// The turn's parts: the rendered transcript, plus the last user message's
// images as real image parts.
function turnInput(context: TranscriptContext): TurnInputPart[] {
  const parts: TurnInputPart[] = [{ type: "text", text: turnPrompt(renderTranscript(context.messages)) }]
  const images = lastUserImages(context.messages)
  for (const image of images) {
    parts.push({ type: "image", base64Data: image.data, mediaType: image.mimeType })
  }
  return parts
}

function lastUserImages(messages: TranscriptContext["messages"]): { data: string; mimeType: string }[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role !== "user") continue
    if (typeof message.content === "string") return []
    const images: { data: string; mimeType: string }[] = []
    for (const part of message.content) {
      if (part.type === "image" && part.data && part.mimeType) {
        images.push({ data: part.data, mimeType: part.mimeType })
      }
    }
    return images
  }
  return []
}
