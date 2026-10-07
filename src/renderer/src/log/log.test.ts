import { observable, runInAction } from "mobx"
import { describe, expect, it, vi } from "vitest"
import { createLog, Log, nullLog, type Clock, type Sink } from "@/log/log"

function setup({ spec = "*", verbose = true }: { spec?: string; verbose?: boolean } = {}) {
  const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Sink
  let now = 0
  const clock = { now: () => now, measure: vi.fn() } satisfies Clock
  const log = Log.create({ sink, clock, verbose, spec })
  const advance = (ms: number) => {
    now += ms
  }
  return { sink, clock, log, advance }
}

function line(mock: { mock: { calls: unknown[][] } }, index = 0): string {
  return String(mock.mock.calls[index][0])
}

describe("Log", () => {
  describe("child", () => {
    it("can join namespaces with a colon when nested", () => {
      const { log } = setup()

      expect(log.child("composer").child("suggestions").namespace).toBe("composer:suggestions")
    })
  })

  describe("debug", () => {
    it("can print when the namespace is enabled", () => {
      const { sink, log } = setup({ spec: "composer" })

      log.child("composer").debug("send", { chars: 3 })

      expect(line(sink.debug)).toContain("composer %csend")
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ chars: 3 })
    })

    it("can stay silent when the namespace is not enabled", () => {
      const { sink, log } = setup({ spec: "nav" })

      log.child("composer").debug("send")

      expect(sink.debug).not.toHaveBeenCalled()
    })

    it("can stay silent when an exclusion matches", () => {
      const { sink, log } = setup({ spec: "*,-composer:*" })

      log.child("composer").action("send")

      expect(sink.debug).not.toHaveBeenCalled()
    })

    it("can stay silent when the build is not verbose", () => {
      const { sink, log } = setup({ verbose: false })

      log.child("composer").debug("send")

      expect(sink.debug).not.toHaveBeenCalled()
    })

    it("can show the time since the previous line", () => {
      const { sink, log, advance } = setup()

      log.debug("a")
      advance(12)
      log.debug("b")

      expect(line(sink.debug, 1)).toContain("+12ms")
    })

    it("can snapshot observables when the line is written", () => {
      const { sink, log } = setup()
      const state = observable({ count: 1 })

      log.debug("tick", { state })
      runInAction(() => {
        state.count = 2
      })

      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ state: { count: 1 } })
    })
  })

  describe("action", () => {
    it("can file under the action namespace when called", () => {
      const { sink, log } = setup({ spec: "*:action" })

      log.child("composer").action("send")

      expect(line(sink.debug)).toContain("composer:action")
    })
  })

  describe("warn", () => {
    it("can print when the namespace is not enabled", () => {
      const { sink, log } = setup({ spec: "", verbose: false })

      log.child("composer").warn("dropped")

      expect(sink.warn).toHaveBeenCalledOnce()
    })
  })

  describe("time", () => {
    it("can log the duration and a performance measure when ended", () => {
      const { sink, clock, log, advance } = setup({ spec: "*:time" })

      const end = log.child("ipc").time("prompt", { a: 1 })
      advance(40)
      end({ b: 2 })

      expect(line(sink.debug)).toContain("ipc:time %cprompt 40ms")
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ a: 1, b: 2 })
      expect(clock.measure).toHaveBeenCalledWith("ipc:prompt", { start: 0, end: 40 })
    })

    it("can skip the measure when the build is not verbose", () => {
      const { clock, log } = setup({ verbose: false })

      log.time("prompt")()

      expect(clock.measure).not.toHaveBeenCalled()
    })
  })

  describe("span", () => {
    it("can return the result when the work succeeds", async () => {
      const { sink, log } = setup()

      const result = await log.span("load", async () => 7)

      expect(result).toBe(7)
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ ok: true })
    })

    it("can rethrow when the work throws", async () => {
      const { sink, log } = setup()
      const error = new Error("boom")

      await expect(log.span("load", () => Promise.reject(error))).rejects.toBe(error)
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ ok: false, error })
    })
  })

  describe("reaction", () => {
    it("can log the new and previous value when the expression changes", () => {
      const { sink, log } = setup({ spec: "*:reaction" })
      const state = observable({ tab: "changes" })
      const effect = vi.fn()

      const dispose = log.child("panel").reaction("tab", () => state.tab, effect)
      runInAction(() => {
        state.tab = "file"
      })
      dispose()

      expect(effect).toHaveBeenCalledWith("file", "changes", expect.anything())
      expect(line(sink.debug)).toContain("panel:reaction %ctab")
      expect(sink.debug.mock.calls[0].at(-1)).toEqual({ value: "file", previous: "changes" })
    })
  })

  describe("controls", () => {
    it("can enable namespaces and persist them when enable is called", () => {
      const { sink, log } = setup({ spec: "" })
      const storage = window.localStorage

      log.controls(storage).enable("nav")
      log.child("nav").debug("open")

      expect(sink.debug).toHaveBeenCalledOnce()
      expect(storage.getItem("debug")).toBe("nav")
      log.controls(storage).disable()
      expect(storage.getItem("debug")).toBe("")
    })
  })
})

describe("createLog", () => {
  it("can read the namespaces and expose controls when in dev", () => {
    window.localStorage.setItem("debug", "nav")
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {})

    const log = createLog({ window, dev: true })
    log.child("nav").debug("open")

    expect(debug).toHaveBeenCalledOnce()
    expect(window.__log?.spec()).toBe("nav")
    window.__log?.disable()
    debug.mockRestore()
    delete window.__log
  })

  it("can enable every namespace when in dev and nothing is stored", () => {
    window.localStorage.removeItem("debug")
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {})

    createLog({ window, dev: true }).child("composer").action("send")

    expect(debug).toHaveBeenCalledOnce()
    expect(window.__log?.spec()).toBe("*")
    debug.mockRestore()
    delete window.__log
  })

  it("can drop debug lines when in production", () => {
    window.localStorage.setItem("debug", "*")
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {})

    createLog({ window, dev: false }).child("nav").debug("open")

    expect(debug).not.toHaveBeenCalled()
    expect(window.__log).toBeUndefined()
    debug.mockRestore()
    window.localStorage.removeItem("debug")
  })
})

describe("nullLog", () => {
  it("can stay silent when warning", () => {
    const warn = vi.spyOn(console, "warn")

    nullLog().warn("x")

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
