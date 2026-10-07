import { type Mock, vi } from "vitest"

// Presenter tests build their collaborators here. Pass the names of the methods the
// presenter calls; each one gets a vi.fn(). The return type claims the whole
// interface so the mock can go wherever the service is expected. Names that were not
// listed are undefined at runtime, so list every method the test touches.
//
//   const settings = createMockInstance<SettingsService>(["setModel"])
//   settings.setModel.mockResolvedValue({ applied: true })
export function createMockInstance<T extends object>(
  names: ReadonlyArray<keyof T & string>,
): { [K in keyof T]: Mock } {
  const mocks: Partial<Record<keyof T, Mock>> = {}
  for (const name of names) {
    mocks[name] = vi.fn()
  }
  return mocks as { [K in keyof T]: Mock }
}
