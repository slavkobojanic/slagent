import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { App } from "@/App"
import { TooltipProvider } from "@/components/ui/tooltip"
import { preloadPierreHighlighter } from "@/lib/pierre"
import { useResolvedTheme } from "@/lib/theme"
import "./index.css"

// Warm Pierre's Shiki highlighter up with the app themes so the first file
// view renders instead of waiting on its async repaint.
void preloadPierreHighlighter()

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

function ThemedToaster() {
  const theme = useResolvedTheme()
  return (
    <Toaster
      theme={theme}
      toastOptions={{
        style: {
          background: "var(--background)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
        },
      }}
    />
  )
}

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
    <ThemedToaster />
  </StrictMode>,
)
