import { isObservable, reaction, toJS, type IReactionDisposer, type IReactionOptions, type IReactionPublic } from "mobx"

export type Level = "debug" | "info" | "warn" | "error"
export type LogData = Record<string, unknown>
export type Sink = Pick<Console, Level>
export type Clock = {
  now: () => number
  measure: (name: string, options: { start: number; end: number }) => unknown
}

export type LogControls = {
  enable: (spec: string) => void
  disable: () => void
  spec: () => string
}

declare global {
  interface Window {
    __log?: LogControls
  }
}

const STORAGE_KEY = "debug"

// One per app. Children share it, so the enabled namespaces and the "+Nms since the last line" delta are global.
class LogCore {
  private include: RegExp[] = []
  private exclude: RegExp[] = []
  private current = ""
  private last: number | null = null

  constructor(
    readonly sink: Sink,
    readonly clock: Clock,
    // false in production: debug and info are dropped and no performance marks are written.
    readonly verbose: boolean,
  ) {}

  get spec(): string {
    return this.current
  }

  enable(spec: string) {
    this.current = spec
    this.include = []
    this.exclude = []
    for (const part of spec.split(/[\s,]+/)) {
      if (part === "") {
        continue
      }
      if (part.startsWith("-")) {
        this.exclude.push(pattern(part.slice(1)))
        continue
      }
      this.include.push(pattern(part))
    }
  }

  enabled(namespace: string): boolean {
    if (!this.verbose || this.exclude.some((re) => re.test(namespace))) {
      return false
    }
    return this.include.some((re) => re.test(namespace))
  }

  emit(level: Level, namespace: string, event: string, data: unknown) {
    const now = this.clock.now()
    const delta = this.last === null ? 0 : Math.round(now - this.last)
    this.last = now
    const shown = namespace === "" ? "app" : namespace
    const line = `%c${shown} %c${event} %c+${delta}ms`
    const styles = [`color: ${colour(shown)}; font-weight: 600`, "color: inherit", "color: gray"]
    if (data === undefined) {
      this.sink[level](line, ...styles)
      return
    }
    this.sink[level](line, ...styles, snapshot(data))
  }
}

export class Log {
  private constructor(
    readonly namespace: string,
    private readonly core: LogCore,
  ) {}

  static create({ sink, clock, verbose, spec = "" }: { sink: Sink; clock: Clock; verbose: boolean; spec?: string }): Log {
    const core = new LogCore(sink, clock, verbose)
    core.enable(spec)
    return new Log("", core)
  }

  child(name: string): Log {
    return new Log(this.namespace === "" ? name : `${this.namespace}:${name}`, this.core)
  }

  enabled(suffix?: string): boolean {
    return this.core.enabled(this.at(suffix))
  }

  debug(event: string, data?: unknown) {
    this.write("debug", undefined, event, data)
  }

  info(event: string, data?: unknown) {
    this.write("info", undefined, event, data)
  }

  // warn and error ignore the namespace filter and print in production too.
  warn(event: string, data?: unknown) {
    this.core.emit("warn", this.namespace, event, data)
  }

  error(event: string, data?: unknown) {
    this.core.emit("error", this.namespace, event, data)
  }

  // A user intent (a click, a shortcut, a submit), filed under <namespace>:action.
  action(event: string, data?: unknown) {
    this.write("debug", "action", event, data)
  }

  // Starts a timer. The returned function logs the duration under <namespace>:time and writes a
  // performance measure, so the span also shows in the DevTools Performance panel.
  time(event: string, data?: LogData): (more?: LogData) => void {
    if (!this.core.verbose) {
      return () => {}
    }
    const name = `${this.at()}:${event}`
    const start = this.core.clock.now()
    return (more) => {
      const end = this.core.clock.now()
      this.measure(name, start, end)
      this.write("debug", "time", `${event} ${formatMs(end - start)}`, { ...data, ...more })
    }
  }

  async span<T>(event: string, run: () => Promise<T> | T, data?: LogData): Promise<T> {
    const end = this.time(event, data)
    try {
      const result = await run()
      end({ ok: true })
      return result
    } catch (error) {
      end({ ok: false, error })
      throw error
    }
  }

  // MobX reaction that logs each run with its new and previous value under <namespace>:reaction.
  reaction<T, FireImmediately extends boolean = false>(
    name: string,
    expression: (r: IReactionPublic) => T,
    effect: (value: T, previous: FireImmediately extends true ? T | undefined : T, r: IReactionPublic) => void,
    options?: IReactionOptions<T, FireImmediately>,
  ): IReactionDisposer {
    return reaction(
      expression,
      (value, previous, r) => {
        this.write("debug", "reaction", name, { value, previous })
        effect(value, previous, r)
      },
      options,
    )
  }

  controls(storage: Storage | null): LogControls {
    return {
      enable: (spec) => {
        this.core.enable(spec)
        persist(storage, spec)
      },
      disable: () => {
        this.core.enable("")
        persist(storage, "")
      },
      spec: () => this.core.spec,
    }
  }

  private write(level: Level, suffix: string | undefined, event: string, data: unknown) {
    const namespace = this.at(suffix)
    if (!this.core.enabled(namespace)) {
      return
    }
    this.core.emit(level, namespace, event, data)
  }

  private at(suffix?: string): string {
    if (suffix === undefined) {
      return this.namespace
    }
    return this.namespace === "" ? suffix : `${this.namespace}:${suffix}`
  }

  private measure(name: string, start: number, end: number) {
    try {
      this.core.clock.measure(name, { start, end })
    } catch {
      // A clock without user timing (jsdom, an old engine) still gets the console line.
    }
  }
}

// Dev builds read the namespaces from localStorage.debug and expose window.__log to change them live.
export function createLog({ window, dev }: { window: Window; dev: boolean }): Log {
  const storage = dev ? readStorage(window) : null
  const log = Log.create({
    sink: window.console,
    clock: window.performance,
    verbose: dev,
    spec: dev ? (read(storage) ?? "") : "",
  })
  if (dev) {
    window.__log = log.controls(storage)
  }
  return log
}

// Prints nothing at any level. For tests and for code paths that have no logger to hand.
export function nullLog(): Log {
  const silent = () => {}
  return Log.create({
    sink: { debug: silent, info: silent, warn: silent, error: silent },
    clock: { now: () => 0, measure: silent },
    verbose: false,
  })
}

function pattern(glob: string): RegExp {
  const source = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  return new RegExp(`^${source}$`)
}

function colour(namespace: string): string {
  let hash = 0
  for (let i = 0; i < namespace.length; i += 1) {
    hash = (hash * 31 + namespace.charCodeAt(i)) | 0
  }
  return `hsl(${Math.abs(hash) % 360} 65% 50%)`
}

function formatMs(ms: number): string {
  return ms < 10 ? `${ms.toFixed(1)}ms` : `${Math.round(ms)}ms`
}

// Observables are proxies that the console reads lazily, which would show the value at expand time.
// Copy them now so a line shows what was true when it was written.
function snapshot(data: unknown): unknown {
  if (data === null || typeof data !== "object" || isObservable(data) || Object.getPrototypeOf(data) !== Object.prototype) {
    return toJS(data)
  }
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toJS(value)]))
}

function readStorage(window: Window): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function read(storage: Storage | null): string | null {
  try {
    return storage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function persist(storage: Storage | null, spec: string) {
  try {
    if (spec === "") {
      storage?.removeItem(STORAGE_KEY)
      return
    }
    storage?.setItem(STORAGE_KEY, spec)
  } catch {
    // Storage can be unavailable; the live setting still applies.
  }
}
