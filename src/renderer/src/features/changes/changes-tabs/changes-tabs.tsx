import { GitCompareIcon, ScrollTextIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tab } from "./tab/tab"

export type ChangesTabsProps = {
  showing: "changes" | "plan"
  hasPlan: boolean
  onTab: (tab: "changes" | "plan") => void
  onClose: () => void
}

export function ChangesTabs({ showing, hasPlan, onTab, onClose }: ChangesTabsProps) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2" role="tablist">
      <Tab active={showing === "changes"} onClick={() => onTab("changes")}>
        <GitCompareIcon className="size-3.5" />
        Changes
      </Tab>
      {hasPlan ? (
        <Tab active={showing === "plan"} onClick={() => onTab("plan")}>
          <ScrollTextIcon className="size-3.5" />
          Plan
        </Tab>
      ) : null}
      <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close side panel" onClick={onClose}>
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
