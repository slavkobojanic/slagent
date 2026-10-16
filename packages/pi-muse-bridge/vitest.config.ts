import { defineConfig } from "vitest/config"

export default defineConfig({
  // Relative to the repo root, because vitest's root is the working directory.
  root: "packages/pi-muse-bridge",
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
})
