import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createApp } from "@/create"
import { preloadPierreHighlighter } from "@/lib/pierre"
import "./index.css"

// Warm Pierre's Shiki highlighter up with the app themes so the first file
// view renders instead of waiting on its async repaint.
void preloadPierreHighlighter()

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

const RootApp = createApp()

createRoot(root).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
