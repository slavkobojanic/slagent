import type { ComponentType } from "react"
import "@/features/mobile/mobile.css"

export type ConnectPageProps = {
  Connect: ComponentType
}

// What a fresh install shows: how to reach the Mac over Tailscale, then the address form.
export function ConnectPage({ Connect }: ConnectPageProps) {
  return (
    <div className="mobile-safe-top mobile-safe-bottom mobile-safe-x h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Connect to your Mac</h1>
          <p className="text-sm text-foreground/60">slagent on your phone drives the chats running on your Mac. The two talk over Tailscale.</p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground/80">
          <li>Install Tailscale on your Mac and this phone, and sign in to the same tailnet on both.</li>
          <li>On your Mac, open slagent and go to Settings → Connect.</li>
          <li>Scan the QR code with this phone's camera, or copy the address and paste it below.</li>
        </ol>
        <Connect />
      </div>
    </div>
  )
}
