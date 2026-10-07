import type { ComponentType } from "react"
import { MessageResponse } from "@/components/ai-elements/message"

export type QuestionMediaProps = {
  image?: string
  html?: string
  preview?: string
  title: string
  frameKey: string
  Image: ComponentType<{ src: string; alt: string }>
  HtmlFrame: ComponentType<{ html: string; title: string; frameKey: string }>
}

export function QuestionMedia({ image, html, preview, title, frameKey, Image, HtmlFrame }: QuestionMediaProps) {
  if (!image && !html && !preview) {
    return null
  }
  return (
    <div className="space-y-2">
      {image ? <Image src={image} alt={title} /> : null}
      {html ? <HtmlFrame html={html} title={title} frameKey={frameKey} /> : null}
      {preview ? <MessageResponse>{preview}</MessageResponse> : null}
    </div>
  )
}
