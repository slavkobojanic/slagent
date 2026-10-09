import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Capacitor loads index.html; the page is mobile.html so it can sit beside the desktop's.
function mobileIndex(): Plugin {
  return {
    name: "mobile-index",
    enforce: "post",
    generateBundle(_options, bundle) {
      const page = bundle["mobile.html"]
      if (!page) return
      page.fileName = "index.html"
      bundle["index.html"] = page
      delete bundle["mobile.html"]
    },
  }
}

// The iOS app's web bundle: the renderer with the mobile entry, built for
// Capacitor to copy into the Xcode project (capacitor.config.ts webDir).
export default defineConfig({
  root: resolve("src/renderer"),
  base: "./",
  resolve: {
    alias: {
      "@": resolve("src/renderer/src"),
      "@shared": resolve("src/shared"),
    },
  },
  plugins: [react(), tailwindcss(), mobileIndex()],
  server: {
    port: 5180,
    host: true,
  },
  build: {
    outDir: resolve("out/mobile"),
    emptyOutDir: true,
    target: "safari16",
    rollupOptions: {
      input: { index: resolve("src/renderer/mobile.html") },
    },
  },
})
