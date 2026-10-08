import type { ComponentType } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

export type SidebarProps = {
  searching: boolean
  SearchBox: ComponentType
  SearchResults: ComponentType
  // The folder prompt, shown only while no project is open.
  ChooseFolder: ComponentType
  // The unified project list: "No project", then every project alphabetically under Projects.
  OtherProjects: ComponentType
  ResizeHandle: ComponentType
}

// The sidebar is the aside itself, because the shell's slot styles `.sidebar-slot > aside`.
export function Sidebar({ searching, SearchBox, SearchResults, ChooseFolder, OtherProjects, ResizeHandle }: SidebarProps) {
  return (
    <aside className="relative flex h-full min-w-0 flex-col overflow-hidden border-r border-foreground/10">
      <div className="p-3">
        <SearchBox />
      </div>
      <ScrollArea className="min-h-0 w-full min-w-0 flex-1">
        <div className="w-full min-w-0 space-y-4 px-2 pb-4">
          {searching ? (
            <SearchResults />
          ) : (
            <>
              <ChooseFolder />
              <OtherProjects />
            </>
          )}
        </div>
      </ScrollArea>
      <ResizeHandle />
    </aside>
  )
}
