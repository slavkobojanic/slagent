import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve("src/renderer/src"),
      "@shared": resolve("src/shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/renderer/src/**/*.test.{ts,tsx}", "src/main/**/*.test.{ts,tsx}"],
    setupFiles: ["src/renderer/src/test/setup.ts"],
  },
})
