import { Button } from "@/components/ui/button"

export function ChooseFolder({ onChooseFolder }: { onChooseFolder: () => void }) {
  return (
    <div className="space-y-2 px-2">
      <p className="text-sm text-foreground/50">Choose a folder to start a project.</p>
      <Button type="button" variant="outline" className="w-full" onClick={() => onChooseFolder()}>
        Choose folder
      </Button>
    </div>
  )
}
