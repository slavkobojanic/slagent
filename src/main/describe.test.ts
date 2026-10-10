import { describe, expect, it } from "vitest"
import { describeToolCalls, describeThinking, describeWorking, ToolDescriber, cleanLabel, type ToolCallSeed } from "./describe"
import type { ModelRuntime } from "@earendil-works/pi-coding-agent"

const runtime = {
  completeSimple: async () => ({ content: [{ type: "text", text: "" }] }),
} as unknown as ModelRuntime
const model = { id: "small" } as NonNullable<ReturnType<ModelRuntime["getModel"]>>

function reply(text: string): void {
  ;(runtime as { completeSimple: unknown }).completeSimple = async () => ({
    content: [{ type: "text", text }],
  })
}

describe("cleanLabel", () => {
  it("keeps a plain phrase", () => {
    expect(cleanLabel("Searching for files containing parse")).toBe("Searching for files containing parse")
  })

  it("takes the first non-empty line", () => {
    expect(cleanLabel("\nSplitting the parser\nAnother line")).toBe("Splitting the parser")
  })

  it("strips quotes and padding", () => {
    expect(cleanLabel('  "Testing the format module"  ')).toBe("Testing the format module")
  })

  it("drops a leading Label prefix", () => {
    expect(cleanLabel("Label: Committing the changes")).toBe("Committing the changes")
  })

  it("returns null for empty output", () => {
    expect(cleanLabel("  \n ")).toBeNull()
  })
})

describe("describeToolCalls", () => {
  it("maps each numbered line back to its call id", async () => {
    reply("1. Searching for files containing parse\n2. Committing the changes")
    const calls: ToolCallSeed[] = [
      { id: "a", name: "bash", args: JSON.stringify({ command: "rg -l parse --glob '*.ts'" }) },
      { id: "b", name: "bash", args: JSON.stringify({ command: "git commit -m fix" }) },
    ]
    const labels = await describeToolCalls(runtime, model, calls)
    expect(labels.get("a")).toBe("Searching for files containing parse")
    expect(labels.get("b")).toBe("Committing the changes")
  })

  it("leaves calls without a matching line out", async () => {
    reply("1. Reading src/main/format.ts")
    const labels = await describeToolCalls(runtime, model, [{ id: "a", name: "read", args: "{}" }, { id: "b", name: "ls", args: "{}" }])
    expect(labels.has("a")).toBe(true)
    expect(labels.has("b")).toBe(false)
  })

  it("ignores out-of-range numbers", async () => {
    reply("7. Random label")
    const labels = await describeToolCalls(runtime, model, [{ id: "a", name: "read", args: "{}" }])
    expect(labels.size).toBe(0)
  })
})

describe("describeThinking", () => {
  it("returns one cleaned label", async () => {
    reply("Splitting the parser into modules")
    expect(await describeThinking(runtime, model, "how to split the parser?")).toBe("Splitting the parser into modules")
  })
})

describe("describeWorking", () => {
  it("returns one cleaned label", async () => {
    reply("Looking into the docker container exit")
    expect(await describeWorking(runtime, model, "docker keeps exiting")).toBe("Looking into the docker container exit")
  })
})

describe("ToolDescriber", () => {
  function seeds(...ids: string[]): ToolCallSeed[] {
    return ids.map((id) => ({ id, name: "bash", args: "{}" }))
  }

  it("batches calls that start together into one request", async () => {
    const seen: ToolCallSeed[][] = []
    const describer = new ToolDescriber(
      (calls) => {
        seen.push(calls)
        const labels = new Map<string, string>()
        for (const call of calls) labels.set(call.id, "Label " + call.id)
        return Promise.resolve(labels)
      },
      () => {},
      10,
    )
    describer.add(seeds("a")[0]!)
    describer.add(seeds("b")[0]!)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(seen).toHaveLength(1)
    expect(seen[0]!.map((call) => call.id)).toEqual(["a", "b"])
    describer.stop()
  })

  it("applies labels to the right ids", async () => {
    const applied: [string, string][] = []
    const describer = new ToolDescriber(
      (calls) => {
        const labels = new Map<string, string>()
        for (const call of calls) labels.set(call.id, "Label " + call.id)
        return Promise.resolve(labels)
      },
      (id, label) => applied.push([id, label]),
      5,
    )
    describer.add({ id: "a", name: "bash", args: "{}" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(applied).toEqual([["a", "Label a"]])
    describer.stop()
  })

  it("flushes again after an inflight request", async () => {
    const seen: string[][] = []
    const describer = new ToolDescriber(
      (calls) => {
        seen.push(calls.map((call) => call.id))
        const labels = new Map<string, string>()
        for (const call of calls) labels.set(call.id, "x")
        return new Promise((resolve) => setTimeout(() => resolve(labels), 20))
      },
      () => {},
      5,
    )
    describer.add({ id: "a", name: "bash", args: "{}" })
    await new Promise((resolve) => setTimeout(resolve, 10))
    describer.add({ id: "b", name: "bash", args: "{}" })
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(seen).toHaveLength(2)
    expect(seen[0]).toEqual(["a"])
    expect(seen[1]).toEqual(["b"])
    describer.stop()
  })

  it("keeps the fallback when describe fails", async () => {
    const applied: [string, string][] = []
    const describer = new ToolDescriber(
      () => Promise.reject(new Error("down")),
      (id, label) => applied.push([id, label]),
      5,
    )
    describer.add({ id: "a", name: "bash", args: "{}" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(applied).toEqual([])
    describer.stop()
  })

  it("does nothing after stop", async () => {
    const seen: ToolCallSeed[][] = []
    const describer = new ToolDescriber(
      (calls) => {
        seen.push(calls)
        return Promise.resolve(new Map())
      },
      () => {},
      5,
    )
    describer.stop()
    describer.add({ id: "a", name: "bash", args: "{}" })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(seen).toEqual([])
  })
})
