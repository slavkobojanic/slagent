import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { App } from "@/App"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useResolvedTheme } from "@/lib/theme"
import "./index.css"

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
