import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export type ToolOutputProps = {
  images: string[]
  output: string
  isError: boolean
}

// What a tool printed and the images it returned. The output folds away behind a trigger.
export function ToolOutput({ images, output, isError }: ToolOutputProps) {
  if (!output && images.length === 0) {
    return null
  }
  return (
    <div className="space-y-2">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <img key={url} src={url} alt="" className="max-h-48 max-w-full rounded-md" />
          ))}
        </div>
      ) : null}
      {output ? (
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">Output</CollapsibleTrigger>
          <CollapsibleContent>
            <pre
              className={cn(
                "mt-2 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground",
                isError && "text-destructive",
              )}
            >
              {output}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}
