import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.slagent.mobile",
  appName: "slagent",
  webDir: "out/mobile",
  ios: {
    contentInset: "never",
    // The Mac is reached by its Tailscale IP over plain ws:// and http://.
    limitsNavigationsToAppBoundDomains: false,
    // The page never scrolls as a whole, so focusing the composer cannot nudge it up.
    scrollEnabled: false,
  },
  plugins: {
    Keyboard: {
      // The webview keeps its size; the screen rides the keyboard with a
      // compositor-only transform (mobile-keyboard-shift in mobile.css), so the
      // keyboard animation never reflows the page.
      resize: "none",
    },
  },
}

export default config
