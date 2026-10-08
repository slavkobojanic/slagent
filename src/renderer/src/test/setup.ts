import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// globals is off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
})

// jsdom has no ResizeObserver, and components that measure their content need one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
