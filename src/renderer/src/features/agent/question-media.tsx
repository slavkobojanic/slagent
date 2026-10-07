import { MessageResponse } from "@/components/ai-elements/message"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { frameDocument } from "@/features/agent/frame-document"

export type Theme = "light" | "dark"

// A frame is this tall until its own height report arrives.
export const FRAME_HEIGHT = 160

export type QuestionMediaProps = {
  image?: string
  html?: string
  preview?: string
  title: string
  frameKey: string
  theme: Theme
  frameHeights: Record<string, number>
  brokenImages: Record<string, boolean>
  zoomed: boolean
  onImageError: (src: string) => void
  onZoomChange: (open: boolean) => void
}

// What a question or an option shows besides its text: an image that opens larger, a mockup in a
// sandboxed frame, and a markdown preview.
export function Media({
  image,
  html,
  preview,
  title,
  frameKey,
  theme,
  frameHeights,
  brokenImages,
  zoomed,
  onImageError,
  onZoomChange,
}: QuestionMediaProps) {
  if (!image && !html && !preview) {
    return null
  }
  return (
    <div className="space-y-2">
      {image ? (
        <ImageView
          src={image}
          alt={title}
          broken={brokenImages[image] === true}
          zoomed={zoomed}
          onError={onImageError}
          onZoomChange={onZoomChange}
        />
      ) : null}
      {html ? <HtmlFrame html={html} title={title} frameKey={frameKey} theme={theme} frameHeights={frameHeights} /> : null}
      {preview ? <MessageResponse>{preview}</MessageResponse> : null}
    </div>
  )
}

export type HtmlFrameProps = {
  html: string
  title: string
  frameKey: string
  theme: Theme
  frameHeights: Record<string, number>
}

// Scripts run in the frame, but in an opaque origin: the snippet cannot reach the app, its storage,
// or the page around it. The frame reports its height, which the presenter stores under frameKey.
export function HtmlFrame({ html, title, frameKey, theme, frameHeights }: HtmlFrameProps) {
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={frameDocument(html, theme, frameKey)}
      className="block w-full rounded border-0 bg-transparent"
      style={{ height: frameHeights[frameKey] ?? FRAME_HEIGHT }}
    />
  )
}

type ImageViewProps = {
  src: string
  alt: string
  broken: boolean
  zoomed: boolean
  onError: (src: string) => void
  onZoomChange: (open: boolean) => void
}

function ImageView({ src, alt, broken, zoomed, onError, onZoomChange }: ImageViewProps) {
  if (broken) {
    return <p className="text-xs text-muted-foreground">The image didn't load.</p>
  }
  return (
    <>
      <button type="button" className="block max-w-full cursor-zoom-in" title="View larger" onClick={() => onZoomChange(true)}>
        <img src={src} alt={alt} className="max-h-64 max-w-full rounded" onError={() => onError(src)} />
      </button>
      <Dialog open={zoomed} onOpenChange={onZoomChange}>
        <DialogContent className="p-2">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-screen w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
