import { randomUUID } from "node:crypto"
import type { ImageContent } from "@earendil-works/pi-ai"
import type { PromptFile, PromptMention, PromptRequest, UserAttachment } from "../shared/types"
import { attachmentKind, mimeForName, pdfText, readBytes } from "./files"

export type PreparedPrompt = {
  text: string
  images: ImageContent[]
  attachments: UserAttachment[]
}

type SavedFile = {
  url: string
  path: string
}

type Reference = {
  path: string
  body?: string
}

export function parsePrompt(input: unknown): PromptRequest {
  if (typeof input !== "object" || input === null) throw new Error("Missing message.")
  const record = input as Record<string, unknown>
  const text = typeof record.text === "string" ? record.text : ""
  const mentions = parseMentions(record.mentions)
  const files = parseFiles(record.files)
  if (!text.trim() && mentions.length === 0 && files.length === 0) {
    throw new Error("Write a message first.")
  }
  return { text, mentions, files }
}

export async function preparePrompt(
  request: PromptRequest,
  save: (name: string, mimeType: string, bytes: Buffer) => Promise<SavedFile>,
): Promise<PreparedPrompt> {
  const attachments: UserAttachment[] = []
  const images: ImageContent[] = []
  const references: Reference[] = []
  const seen = new Set<string>()

  for (const mention of request.mentions) {
    if (seen.has(mention.path)) continue
    seen.add(mention.path)
    references.push({ path: mention.path })
  }

  for (const file of request.files) {
    const mimeType = mimeForName(file.name, file.mimeType)
    const kind = attachmentKind(file.name, mimeType)
    if (kind === "image") {
      const bytes = await bytesOf(file)
      const saved = await save(file.name, mimeType, bytes)
      images.push({ type: "image", data: bytes.toString("base64"), mimeType })
      attachments.push({
        id: randomUUID(),
        name: file.name,
        kind,
        path: saved.path,
        url: saved.url,
      })
      continue
    }
    if (kind === "pdf") {
      const bytes = await bytesOf(file)
      const body = await pdfText(new Uint8Array(bytes))
      const label = file.path || file.name
      references.push({ path: label, body })
      attachments.push({ id: randomUUID(), name: file.name, kind, path: file.path })
      continue
    }
    if (file.path) {
      pushReference(seen, references, attachments, file.path, file.name, kind)
      continue
    }
    const bytes = await bytesOf(file)
    const saved = await save(file.name, mimeType, bytes)
    pushReference(seen, references, attachments, saved.path, file.name, kind)
  }

  return {
    text: withCommand(request.text.trim(), references),
    images,
    attachments,
  }
}

export function queueDetail(request: PromptRequest): string {
  const names = request.mentions.map((mention) => mention.name)
  for (const file of request.files) names.push(file.name)
  return names.join(", ")
}

function pushReference(
  seen: Set<string>,
  references: Reference[],
  attachments: UserAttachment[],
  path: string,
  name: string,
  kind: UserAttachment["kind"],
): void {
  if (seen.has(path)) return
  seen.add(path)
  references.push({ path })
  attachments.push({ id: randomUUID(), name, kind, path })
}

// Pi only expands /skill:name, prompt templates and extension commands when the
// prompt starts with them, so file references go after the command.
function withCommand(text: string, references: Reference[]): string {
  const match = /^\/[^\s/][^\s]*/.exec(text)
  if (!match) return compose(text, references)
  const command = match[0]
  const rest = text.slice(command.length).trim()
  if (!rest && references.length === 0) return command
  return `${command} ${compose(rest, references)}`
}

function compose(text: string, references: Reference[]): string {
  if (references.length === 0) {
    if (text) return text
    return "See the attached images."
  }
  const lines = ["Referenced files:"]
  for (const reference of references) lines.push(`- ${reference.path}`)
  for (const reference of references) {
    if (!reference.body) continue
    lines.push("")
    lines.push(`--- ${reference.path} ---`)
    lines.push(reference.body)
    lines.push("--- end ---")
  }
  if (text) {
    lines.push("")
    lines.push(text)
  }
  return lines.join("\n")
}

async function bytesOf(file: PromptFile): Promise<Buffer> {
  if (file.path) return readBytes(file.path)
  if (!file.dataBase64) throw new Error("That attachment is empty.")
  return Buffer.from(file.dataBase64, "base64")
}

function parseMentions(value: unknown): PromptMention[] {
  if (!Array.isArray(value)) return []
  const mentions: PromptMention[] = []
  for (const item of value) {
    if (mentions.length >= 20) break
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    if (typeof record.path !== "string" || typeof record.name !== "string") continue
    if (!record.path) continue
    mentions.push({ path: record.path, name: record.name })
  }
  return mentions
}

function parseFiles(value: unknown): PromptFile[] {
  if (!Array.isArray(value)) return []
  const files: PromptFile[] = []
  for (const item of value) {
    if (files.length >= 12) break
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    const name = typeof record.name === "string" && record.name ? record.name : "file"
    const mimeType = typeof record.mimeType === "string" ? record.mimeType : ""
    const file: PromptFile = { name, mimeType }
    if (typeof record.path === "string" && record.path) file.path = record.path
    if (typeof record.dataBase64 === "string" && record.dataBase64) {
      if (record.dataBase64.length > 28_000_000) throw new Error("That file is larger than 20MB.")
      file.dataBase64 = record.dataBase64
    }
    if (!file.path && !file.dataBase64) continue
    files.push(file)
  }
  return files
}
