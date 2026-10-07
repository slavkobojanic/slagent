import type { ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { AnsweredQuestion, Question, QuestionAnswer, QuestionMedia, QuestionReply, QuestionRequest } from "../../shared/types"

// Asks the user and waits. The tool call stays open until the card in the
// transcript is answered, so the model gets the answer as the tool result and
// carries on in the same turn.

export const ASK_USER = "ask_user"

const media = {
  preview: Type.Optional(Type.String({ description: "Markdown: a code sketch, a diff, a table." })),
  image: Type.Optional(
    Type.String({ description: "An image to show: an https URL, a data URI, or a path to an image file in the project." }),
  ),
  html: Type.Optional(
    Type.String({
      description:
        "An HTML snippet or page rendered in a sandboxed frame, for UI mockups. Inline styles and scripts work. It sits on a dark background unless it sets its own.",
    }),
  ),
}

const params = Type.Object({
  questions: Type.Array(
    Type.Object({
      question: Type.String({ description: "The whole question, ending with a question mark." }),
      ...media,
      header: Type.Optional(Type.String({ description: "A short tag for the question, at most 12 characters." })),
      multiSelect: Type.Optional(Type.Boolean({ description: "True when more than one option can be picked." })),
      options: Type.Array(
        Type.Object({
          label: Type.String({ description: "The choice in 1 to 5 words." }),
          description: Type.Optional(Type.String({ description: "What picking it means, and its trade-off." })),
          ...media,
          recommended: Type.Optional(Type.Boolean({ description: "True for the one option you would pick." })),
        }),
        {
          minItems: 2,
          maxItems: 6,
          description:
            "2 to 6 distinct choices, or at most 3 when options have an image or html, so they can be shown large. The user can always write their own.",
        },
      ),
    }),
    { minItems: 1, maxItems: 4 },
  ),
})

type RawMedia = { preview?: unknown; image?: unknown; html?: unknown }

type Input = {
  questions?: (RawMedia & {
    question?: unknown
    header?: unknown
    multiSelect?: unknown
    options?: (RawMedia & { label?: unknown; description?: unknown; recommended?: unknown })[]
  })[]
}

export type AskUserDetails = { answers: AnsweredQuestion[] }

export type AskUserHooks = {
  // Turns an image reference into a URL the renderer can load.
  resolveImage: (image: string) => Promise<string>
  onAsk: (request: QuestionRequest) => void
  onDone: (id: string) => void
}

export type AskUserControl = {
  extension: ExtensionFactory
  pending: () => QuestionRequest | null
  answer: (id: string, reply: QuestionReply) => boolean
  cancel: () => void
}

export function askUser(hooks: AskUserHooks): AskUserControl {
  let current: { request: QuestionRequest; resolve: (reply: QuestionReply | null) => void } | null = null

  function settle(reply: QuestionReply | null) {
    const open = current
    if (!open) return
    current = null
    hooks.onDone(open.request.id)
    open.resolve(reply)
  }

  const extension: ExtensionFactory = (pi) => {
    pi.registerTool({
      name: ASK_USER,
      label: "Ask user",
      description:
        "Ask the user one to four multiple-choice questions and wait for the answers. The user can also write their own answer, add a note, or skip.",
      promptSnippet: "Ask the user a multiple-choice question and wait for the answer",
      promptGuidelines: [
        "Use ask_user only for decisions that are the user's to make and that change what you do next. Pick sensible defaults yourself.",
        "Mark the option you would choose as recommended.",
        "When options are visual, show them: html for UI mockups, image for screenshots or diagrams, preview for code. Visual options are shown as three large cards side by side, so offer at most 3 and pick the strongest. Put shared context, such as a screenshot of the current state, on the question itself.",
        "Keep html self-contained, with inline styles, and size it for a panel about 400px wide. An image must be a URL or an image file on disk, so save a screenshot to a file before passing its path.",
        "Ask all related questions in one call instead of one at a time.",
      ],
      parameters: params,
      executionMode: "sequential",
      async execute(id, input, signal) {
        const questions = parseQuestions(input as Input)
        if (questions.length === 0) {
          return { content: [{ type: "text", text: "Send at least one question with two options." }], details: { answers: [] }, isError: true }
        }
        const crowded = questions.find((question) => visualOptions(question) && question.options.length > VISUAL_LIMIT)
        if (crowded) {
          return {
            content: [
              {
                type: "text",
                text: `"${crowded.question}" has ${crowded.options.length} options with images or html. Visual options are shown as large cards, at most ${VISUAL_LIMIT}. Ask again with your best ${VISUAL_LIMIT}.`,
              },
            ],
            details: { answers: [] },
            isError: true,
          }
        }
        const problems = await resolveImages(questions, hooks.resolveImage)
        if (signal?.aborted) {
          return { content: [{ type: "text", text: "The question was cancelled." }], details: { answers: [] }, isError: true }
        }
        if (current) settle(null)
        const request: QuestionRequest = { id, questions }
        const reply = await new Promise<QuestionReply | null>((resolve) => {
          current = { request, resolve }
          hooks.onAsk(request)
          signal?.addEventListener("abort", () => settle(null), { once: true })
        })
        if (!reply) {
          return {
            content: [{ type: "text", text: "The question was cancelled before the user answered." }],
            details: { answers: answered(questions, null) } satisfies AskUserDetails,
            isError: true,
          }
        }
        const answers = answered(questions, reply)
        let result = replyText(answers, reply)
        if (problems.length > 0) result += `\n\nThese images could not be shown:\n${problems.join("\n")}`
        return {
          content: [{ type: "text", text: result }],
          details: { answers } satisfies AskUserDetails,
        }
      },
    })
  }

  return {
    extension,
    pending: () => current?.request ?? null,
    answer(id, reply) {
      if (!current || current.request.id !== id) return false
      settle(reply)
      return true
    },
    cancel: () => settle(null),
  }
}

// Replies come over IPC, so they are rebuilt from known fields only.
export function parseReply(value: unknown): QuestionReply {
  if (typeof value !== "object" || value === null) throw new Error("Unknown answer.")
  const raw = value as { skipped?: unknown; message?: unknown; answers?: unknown }
  if (raw.skipped === true) return { skipped: true, message: text(raw.message) || undefined }
  if (!Array.isArray(raw.answers)) throw new Error("Unknown answer.")
  const answers: QuestionAnswer[] = []
  for (const item of raw.answers as { questionId?: unknown; selected?: unknown; other?: unknown; note?: unknown }[]) {
    if (typeof item !== "object" || item === null || typeof item.questionId !== "string") continue
    const selected = Array.isArray(item.selected) ? item.selected.filter((label): label is string => typeof label === "string") : []
    answers.push({
      questionId: item.questionId,
      selected,
      other: text(item.other) || undefined,
      note: text(item.note) || undefined,
    })
  }
  return { skipped: false, answers }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function parseQuestions(input: Input): Question[] {
  const questions: Question[] = []
  for (const [index, raw] of (input.questions ?? []).slice(0, 4).entries()) {
    const question = text(raw.question)
    if (!question) continue
    const options: Question["options"] = []
    let recommended = false
    for (const option of raw.options ?? []) {
      const label = text(option.label)
      if (!label || options.some((item) => item.label === label)) continue
      // One recommendation per question keeps the hint meaningful.
      const isRecommended = option.recommended === true && !recommended
      if (isRecommended) recommended = true
      options.push({
        label,
        description: text(option.description) || undefined,
        recommended: isRecommended || undefined,
        ...parseMedia(option),
      })
    }
    if (options.length < 2) continue
    questions.push({
      id: `q${index}`,
      question,
      header: text(raw.header).slice(0, 24) || undefined,
      multiSelect: raw.multiSelect === true,
      options: options.slice(0, 6),
      ...parseMedia(raw),
    })
  }
  return questions
}

const VISUAL_LIMIT = 3

function visualOptions(question: Question): boolean {
  return question.options.some((option) => option.image || option.html)
}

function parseMedia(raw: RawMedia): QuestionMedia {
  return {
    preview: text(raw.preview) || undefined,
    image: text(raw.image) || undefined,
    html: text(raw.html) || undefined,
  }
}

// Replaces image references with loadable URLs in place. An image that can't
// be loaded is dropped, and the reason goes back to the model.
async function resolveImages(questions: Question[], resolve: (image: string) => Promise<string>): Promise<string[]> {
  const problems: string[] = []
  const items: QuestionMedia[] = questions.flatMap((question) => [question, ...question.options])
  await Promise.all(
    items.map(async (item) => {
      const image = item.image
      if (!image) return
      try {
        item.image = await resolve(image)
      } catch (error) {
        item.image = undefined
        problems.push(`- ${image}: ${error instanceof Error ? error.message : "unreadable"}`)
      }
    }),
  )
  return problems
}

export function answered(questions: Question[], reply: QuestionReply | null): AnsweredQuestion[] {
  return questions.map((question, index) => {
    // A reply typed in the composer shows as the answer to the first question.
    if (reply?.skipped && reply.message) {
      return {
        question: question.question,
        header: question.header,
        selected: [],
        other: index === 0 ? reply.message : undefined,
        skipped: index > 0,
      }
    }
    const answer = reply && !reply.skipped ? reply.answers.find((item) => item.questionId === question.id) : undefined
    const selected = answer?.selected ?? []
    const images = selected
      .map((label) => question.options.find((option) => option.label === label)?.image)
      .filter((image): image is string => Boolean(image))
    return {
      question: question.question,
      header: question.header,
      selected,
      images: images.length ? images : undefined,
      other: answer?.other || undefined,
      note: answer?.note || undefined,
      skipped: !answer,
    }
  })
}

function replyText(answers: AnsweredQuestion[], reply: QuestionReply): string {
  if (reply.skipped) {
    if (reply.message) return `The user didn't pick an option and wrote this instead:\n\n${reply.message}`
    return "The user skipped the questions. Use your best judgment, say which choice you made and why, and carry on."
  }
  const lines = ["The user answered:"]
  for (const answer of answers) {
    lines.push("", `Q: ${answer.question}`)
    if (answer.skipped) {
      lines.push("A: (skipped, use your best judgment)")
      continue
    }
    const picks = [...answer.selected]
    if (answer.other) picks.push(`Other: ${answer.other}`)
    lines.push(`A: ${picks.join("; ") || "(no choice)"}`)
    if (answer.note) lines.push(`Note: ${answer.note}`)
  }
  return lines.join("\n")
}
