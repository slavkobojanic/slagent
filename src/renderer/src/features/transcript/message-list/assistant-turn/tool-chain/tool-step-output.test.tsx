import { describe, expect, it } from "vitest"
import { ToolStepOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-step-output"
import { viewMarkup } from "@/test/view-markup"

describe("ToolStepOutput", () => {
  it("shows a bash run as a terminal with its command", () => {
    const markup = viewMarkup(<ToolStepOutput output={{ kind: "bash", command: "ls", output: "a.txt", running: false, isError: false }} />)

    expect(markup).toContain("$ ")
    expect(markup).toContain("ls")
    expect(markup).toContain("a.txt")
  })

  it("shows the answers to a question", () => {
    const markup = viewMarkup(
      <ToolStepOutput output={{ kind: "answers", answers: [{ question: "Which one?", selected: ["Blue"], skipped: false }] }} />,
    )

    expect(markup).toContain("Which one?")
    expect(markup).toContain("Blue")
  })

  it("shows the plain output behind a trigger", () => {
    const markup = viewMarkup(<ToolStepOutput output={{ kind: "output", images: [], output: "done", isError: false }} />)

    expect(markup).toContain("Output")
  })
})
