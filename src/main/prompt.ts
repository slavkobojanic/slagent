import { randomUUID } from "node:crypto"
import type { ImageContent } from "@earendil-works/pi-ai"
import type { DiffComment, PromptFile, PromptMention, PromptRequest, ReplyComment, UserAttachment } from "../shared/types"
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
  const comments = parseComments(record.comments)
  const replies = parseReplies(record.replies)
  if (!text.trim() && mentions.length === 0 && files.length === 0 && comments.length === 0 && replies.length === 0) {
    throw new Error("Write a message first.")
  }
  return { text, mentions, files, comments, replies }
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
    text: withCommand(withReplies(withComments(request.text.trim(), request.comments ?? []), request.replies ?? []), references),
    images,
    attachments,
  }
}

export function queueDetail(request: PromptRequest): string {
  const names = request.mentions.map((mention) => mention.name)
  for (const file of request.files) names.push(file.name)
  const comments = request.comments?.length ?? 0
  if (comments === 1) names.push("1 diff comment")
  if (comments > 1) names.push(`${comments} diff comments`)
  const replies = request.replies?.length ?? 0
  if (replies === 1) names.push("1 reply comment")
  if (replies > 1) names.push(`${replies} reply comments`)
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

// Comments left on lines of the diff panel, quoted so the agent knows which
// line each one is about.
function withComments(text: string, comments: DiffComment[]): string {
  if (comments.length === 0) return text
  const lines = ["Comments on the diff:"]
  for (const comment of comments) {
    let where = `${comment.path}:${comment.line}`
    if (comment.side === "old") where = `${where} (removed line)`
    lines.push(`- ${where}`)
    const code = comment.code.trim()
    if (code) lines.push(`  > ${code.slice(0, 300)}`)
    lines.push(`  ${comment.text.trim().replace(/\n/g, "\n  ")}`)
  }
  if (!text) return lines.join("\n")
  return `${text}\n\n${lines.join("\n")}`
}

// Comments on blocks of earlier responses, quoted ahead of the message like
// an email reply.
function withReplies(text: string, replies: ReplyComment[]): string {
  if (replies.length === 0) return text
  const lines = ["Comments on parts of your earlier responses:"]
  for (const reply of replies) {
    lines.push("")
    for (const line of reply.block.trim().slice(0, 1500).split("\n")) lines.push(`> ${line}`.trimEnd())
    lines.push("")
    const quote = reply.quote.trim()
    if (quote === reply.block.trim()) lines.push(reply.text.trim())
    else lines.push(`On "${quote.slice(0, 500)}": ${reply.text.trim()}`)
  }
  if (!text) return lines.join("\n")
  // A slash command only runs from the start of the prompt.
  if (/^\/[^\s/]/.test(text)) return `${text}\n\n${lines.join("\n")}`
  return `${lines.join("\n")}\n\n${text}`
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

function parseComments(value: unknown): DiffComment[] {
  if (!Array.isArray(value)) return []
  const comments: DiffComment[] = []
  for (const item of value.slice(0, 50)) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    if (typeof record.path !== "string" || typeof record.text !== "string" || !record.text.trim()) continue
    const line = Number(record.line)
    if (!Number.isFinite(line)) continue
    comments.push({
      id: typeof record.id === "string" ? record.id : randomUUID(),
      path: record.path,
      line,
      side: record.side === "old" ? "old" : "new",
      code: typeof record.code === "string" ? record.code.slice(0, 500) : "",
      text: record.text.slice(0, 4000),
    })
  }
  return comments
}

function parseReplies(value: unknown): ReplyComment[] {
  if (!Array.isArray(value)) return []
  const replies: ReplyComment[] = []
  for (const item of value.slice(0, 50)) {
    if (typeof item !== "object" || item === null) continue
    const record = item as Record<string, unknown>
    if (typeof record.quote !== "string" || typeof record.text !== "string" || !record.text.trim()) continue
    const quote = record.quote.slice(0, 4000)
    replies.push({
      id: typeof record.id === "string" ? record.id : randomUUID(),
      messageId: typeof record.messageId === "string" ? record.messageId : "",
      block: typeof record.block === "string" ? record.block.slice(0, 4000) : quote,
      quote,
      text: record.text.slice(0, 4000),
    })
  }
  return replies
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
