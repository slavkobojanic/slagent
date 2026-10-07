import { type Mock, vi } from "vitest"

// The return type claims the whole interface, but names that were not listed are undefined
// at runtime, so list every method the test touches.
export function createMockInstance<T extends object>(
  names: ReadonlyArray<keyof T & string>,
): MockInstance<T> {
  const mocks: Partial<Record<keyof T, Mock>> = {}
  for (const name of names) {
    mocks[name] = vi.fn()
  }
  return mocks as MockInstance<T>
}

export type MockInstance<T> = { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? Mock & T[K] : T[K] }
