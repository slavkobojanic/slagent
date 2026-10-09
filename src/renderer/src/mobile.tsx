import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createMobileApp } from "@/create-mobile"
import { Device } from "@/ipc/device"
import { parseServerAddress } from "@/lib/server-address"
import { preloadPierreHighlighter } from "@/lib/pierre"
import "./index.css"

void preloadPierreHighlighter()

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

// The saved Mac decides which root boots, so this entry reads it first. A cold
// launch from the desktop's QR code carries the address in its launch URL.
async function boot(): Promise<void> {
  const device = new Device(window)
  const launch = await device.launchUrl()
  const linked = launch === null ? null : parseServerAddress(launch)
  if (linked !== null) await device.saveAddress(linked)
  const saved = await device.loadConnection()
  const RootApp = createMobileApp({ window, device, saved })
  createRoot(root!).render(
    <StrictMode>
      <RootApp />
    </StrictMode>,
  )
}

void boot()
