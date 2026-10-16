import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { museProvider } from "./provider"

// Registers Muse Code as a pi model provider: models come from the user's own
// `muse serve` catalog, and every request runs one muse turn over the Muse
// Session Protocol. The subscription pays; no API key is involved.
export default function museBridge(pi: ExtensionAPI) {
  pi.registerProvider(museProvider())
}
