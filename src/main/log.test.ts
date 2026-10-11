import { describe, expect, it, vi } from "vitest"
import { createProcessLog, formatLogLines, logPaths, timestampSlug, truncateLogFile, waitForFile } from "./log"

describe("createProcessLog", () => {
  it("writes each entry as JSON", () => {
    const writeLine = vi.fn()
    const log = createProcessLog({ logPath: "/tmp/app.log", writeLine, now: () => new Date("2026-02-19T12:00:00Z") })

    log.info("vscode-server", "editor-open", { port: 47_821 })

    expect(writeLine).toHaveBeenCalledWith('{"when":"2026-02-19T12:00:00.000Z","level":"info","scope":"vscode-server","event":"editor-open","data":{"port":47821}}')
  })

  it("appends to the injected sink and keeps the byte count", async () => {
    const appended: string[] = []
    const log = createProcessLog({
      logPath: "/tmp/app.log",
      writeLine: () => undefined,
      append: async (path, data) => {
        appended.push(`${path}: ${data}`)
      },
      statFile: async () => ({ size: 20 }),
      truncate: async () => undefined,
      now: () => new Date(0),
    })

    log.error("api", "listen-failed", { code: "EACCES" })
    log.warn("api", "retrying")
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(appended).toEqual([
      "/tmp/app.log: {\"when\":\"1970-01-01T00:00:00.000Z\",\"level\":\"error\",\"scope\":\"api\",\"event\":\"listen-failed\",\"data\":{\"code\":\"EACCES\"}}\n",
      "/tmp/app.log: {\"when\":\"1970-01-01T00:00:00.000Z\",\"level\":\"warn\",\"scope\":\"api\",\"event\":\"retrying\",\"data\":null}\n",
    ])
  })

  it("truncates once the tracked bytes pass the cap", async () => {
    const truncate = vi.fn()
    let size = 2 * 1024 * 1024
    const log = createProcessLog({
      logPath: "/tmp/app.log",
      writeLine: () => undefined,
      append: async () => undefined,
      statFile: async () => ({ size }),
      truncate: async () => {
        size = 0
        truncate()
      },
      now: () => new Date(0),
    })

    log.info("api", "big")
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(truncate).toHaveBeenCalled()
  })
})

describe("truncateLogFile", () => {
  it("keeps whole recent lines within the cap", async () => {
    const written: string[] = []
    const read = async () => "aaaa\nbbbb\ncccc\ndddd\n"
    const write = async (path: string, data: string) => {
      written.push(`${path}: ${data}`)
    }
    await truncateLogFile("/tmp/app.log", 10, { read, write })
    expect(written).toEqual(["/tmp/app.log: cccc\ndddd\n"])
  })

  it("keeps a single oversized line", async () => {
    const written: string[] = []
    const read = async () => "onelongline\n"
    const write = async (path: string, data: string) => {
      written.push(`${path}: ${data}`)
    }
    await truncateLogFile("/tmp/app.log", 4, { read, write })
    expect(written).toEqual(["/tmp/app.log: onelongline\n"])
  })
})

describe("formatLogLines", () => {
  it("flattens a JSON entry to one line", () => {
    const out = formatLogLines('{"when":"2026-02-19T12:00:00Z","level":"error","scope":"api","event":"boom","data":{"code":"EACCES"}}\n')
    expect(out).toBe("2026-02-19T12:00:00Z error api boom {\"code\":\"EACCES\"}")
  })

  it("keeps raw lines as they are", () => {
    expect(formatLogLines("Something went wrong\n")).toBe("Something went wrong")
  })

  it("skips empty lines", () => {
    expect(formatLogLines("\n\n")).toBe("")
  })

  it("omits empty data", () => {
    const out = formatLogLines('{"when":"t","level":"info","scope":"s","event":"e","data":{}}\n')
    expect(out).toBe("t info s e")
  })
})

describe("timestampSlug", () => {
  it("sorts before colons would", () => {
    expect(timestampSlug(new Date("2026-02-19T12:34:56"))).toBe("2026-02-19T12-34-56")
  })
})

describe("waitForFile", () => {
  it("returns true once the file exists", async () => {
    let calls = 0
    const found = await waitForFile({ logPath: "/tmp/app.log", exists: async () => (calls += 1) > 1, delay: async () => undefined, timeoutMs: 1000 })
    expect(found).toBe(true)
  })

  it("gives up after the timeout", async () => {
    const found = await waitForFile({ logPath: "/tmp/missing.log", exists: async () => false, delay: async () => undefined, timeoutMs: 0 })
    expect(found).toBe(false)
  })
})

describe("logPaths", () => {
  it("points at the app log next to the vscode-server folder", () => {
    const paths = logPaths("/Users/x/Library/Application Support/slagent")
    expect(paths.logPath).toBe("/Users/x/Library/Application Support/slagent/app.log")
    expect(paths.vscodeDir).toBe("/Users/x/Library/Application Support/slagent/vscode-server")
  })
})
