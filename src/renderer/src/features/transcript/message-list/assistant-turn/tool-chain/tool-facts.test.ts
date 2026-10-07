import { describe, expect, it } from "vitest"
import type { ToolMessage } from "@shared/types"
import { FileTextIcon, TerminalIcon } from "lucide-react"
import { bashCommand, toolIcon, toolLabel, toolOutputKind, toolPath, toolStepOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-facts"

function tool(overrides: Partial<ToolMessage> = {}): ToolMessage {
  return {
    id: "t1",
    role: "tool",
    name: "bash",
    label: "bash  npm test",
    args: "{}",
    output: "",
    images: [],
    running: false,
    isError: false,
    ...overrides,
  }
}

describe("bashCommand", () => {
  it("can read the command from the arguments", () => {
    expect(bashCommand(tool({ args: JSON.stringify({ command: "npm run build" }) }))).toBe("npm run build")
  })

  it("can fall back to the label when the arguments are truncated", () => {
    expect(bashCommand(tool({ args: '{"command": "npm' }))).toBe("npm test")
  })

  it("can strip the tool name from a label with no arguments", () => {
    expect(bashCommand(tool({ args: "{}", label: "bash  ls -la" }))).toBe("ls -la")
  })
})

describe("toolPath", () => {
  it("can read the path a read tool works on", () => {
    expect(toolPath(tool({ name: "read", args: JSON.stringify({ path: "src/app.ts" }) }))).toBe("src/app.ts")
  })

  it("can read file_path when path is absent", () => {
    expect(toolPath(tool({ name: "edit", args: JSON.stringify({ file_path: "a.ts" }) }))).toBe("a.ts")
  })

  it("can add the offset when the read starts past the first line", () => {
    expect(toolPath(tool({ name: "read", args: JSON.stringify({ path: "a.ts", offset: 40 }) }))).toBe("a.ts:40")
  })

  it("can ignore an offset of zero", () => {
    expect(toolPath(tool({ name: "read", args: JSON.stringify({ path: "a.ts", offset: 0 }) }))).toBe("a.ts")
  })

  it("can find no path for a tool that does not work on files", () => {
    expect(toolPath(tool({ name: "grep", args: JSON.stringify({ path: "a.ts" }) }))).toBeNull()
  })

  it("can find no path when the arguments do not parse", () => {
    expect(toolPath(tool({ name: "read", args: "{" }))).toBeNull()
  })
})

describe("toolLabel", () => {
  it("can describe a running command", () => {
    expect(toolLabel(tool({ running: true }))).toEqual({ kind: "text", text: "Running command" })
  })

  it("can describe a failed command", () => {
    expect(toolLabel(tool({ isError: true }))).toEqual({ kind: "text", text: "Command failed" })
  })

  it("can describe a question that is still waiting", () => {
    expect(toolLabel(tool({ name: "ask_user", running: true }))).toEqual({ kind: "text", text: "Waiting for your answer" })
  })

  it("can describe a question with one answer", () => {
    const answers = [{ question: "Which?", selected: ["A"], skipped: false }]

    expect(toolLabel(tool({ name: "ask_user", answers }))).toEqual({ kind: "text", text: "Asked a question" })
  })

  it("can describe a question that was cancelled", () => {
    expect(toolLabel(tool({ name: "ask_user", isError: true }))).toEqual({ kind: "text", text: "Question cancelled" })
  })

  it("can link a file tool to its file", () => {
    expect(toolLabel(tool({ name: "write", args: JSON.stringify({ path: "a.md" }) }))).toEqual({ kind: "file", name: "write", path: "a.md" })
  })

  it("can show the tool's own label for anything else", () => {
    expect(toolLabel(tool({ name: "grep", label: "grep foo" }))).toEqual({ kind: "text", text: "grep foo" })
  })
})

describe("toolOutputKind", () => {
  it("can show a bash run as a terminal", () => {
    expect(toolOutputKind(tool())).toBe("bash")
  })

  it("can show the answers of a question that was answered", () => {
    const answers = [{ question: "Which?", selected: ["A"], skipped: false }]

    expect(toolOutputKind(tool({ name: "ask_user", answers }))).toBe("answers")
  })

  it("can show the plain output for a question with no answers yet", () => {
    expect(toolOutputKind(tool({ name: "ask_user" }))).toBe("output")
  })
})

describe("toolStepOutput", () => {
  it("can give a bash run its command and output", () => {
    const step = toolStepOutput(tool({ args: JSON.stringify({ command: "npm test" }), output: "ok", running: true }))

    expect(step).toEqual({ kind: "bash", command: "npm test", output: "ok", running: true, isError: false })
  })

  it("can give an answered question its answers", () => {
    const answers = [{ question: "Which?", selected: ["A"], skipped: false }]

    expect(toolStepOutput(tool({ name: "ask_user", answers }))).toEqual({ kind: "answers", answers })
  })

  it("can give any other tool its images and output", () => {
    const step = toolStepOutput(tool({ name: "read", images: ["data:a"], output: "text", isError: true }))

    expect(step).toEqual({ kind: "output", images: ["data:a"], output: "text", isError: true })
  })
})

describe("toolIcon", () => {
  it("can use the terminal icon for bash", () => {
    expect(toolIcon("bash")).toBe(TerminalIcon)
  })

  it("can use the file icon for a tool it does not know", () => {
    expect(toolIcon("unknown")).toBe(FileTextIcon)
  })
})
