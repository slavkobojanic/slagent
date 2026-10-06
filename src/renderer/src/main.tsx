import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"
import { App } from "@/App"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

createRoot(root).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
    <Toaster
      theme="dark"
      toastOptions={{
        style: {
          background: "#000",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.14)",
        },
      }}
    />
  </StrictMode>,
)
