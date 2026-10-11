import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type ModelNameProps = {
  name: string
}

export function ModelName({ name }: ModelNameProps) {
  const content = <span className="block truncate">{name}</span>
  if (name.length <= 18) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-64 break-all">{name}</TooltipContent>
    </Tooltip>
  )
}
