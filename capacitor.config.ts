import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.slagent.mobile",
  appName: "slagent",
  webDir: "out/mobile",
  ios: {
    contentInset: "never",
    // The Mac is reached by its Tailscale IP over plain ws:// and http://.
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    Keyboard: {
      resize: "native",
    },
  },
}

export default config
