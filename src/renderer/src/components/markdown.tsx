import type { ComponentProps } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function MarkdownLink({ href, children }: ComponentProps<"a">) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (!href) return
        event.preventDefault()
        void window.slagent.openExternal(href)
      }}
    >
      {children}
    </a>
  )
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

export { Markdown }
