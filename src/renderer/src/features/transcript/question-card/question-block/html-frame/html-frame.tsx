import { frameDocument } from "@/features/transcript/question-card/frame-document"

export type HtmlFrameProps = {
  html: string
  title: string
  frameKey: string
  theme: "light" | "dark"
  height: number
}

// Scripts run in the frame, but in an opaque origin: the snippet cannot reach the app, its storage,
// or the page around it. The frame reports its height, which the presenter stores under frameKey.
export function HtmlFrame({ html, title, frameKey, theme, height }: HtmlFrameProps) {
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={frameDocument(html, theme, frameKey)}
      className="block w-full rounded border-0 bg-transparent"
      style={{ height }}
    />
  )
}
