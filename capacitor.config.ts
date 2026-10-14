import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.slagent.mobile",
  appName: "slagent",
  webDir: "out/mobile",
  android: {
    // The page is served from https://localhost and reaches the Mac over plain
    // ws:// and http:// at its Tailscale IP, which the WebView blocks as mixed
    // content unless it is allowed. This is the same permission iOS grants in
    // Info.plist with NSAllowsArbitraryLoads; AndroidManifest.xml opens the
    // socket half of it with usesCleartextTraffic.
    allowMixedContent: true,
  },
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
