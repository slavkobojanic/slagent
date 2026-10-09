import {
  BookIcon,
  BrainIcon,
  CameraIcon,
  CodeIcon,
  CpuIcon,
  DatabaseIcon,
  FlaskConicalIcon,
  FolderIcon,
  Gamepad2Icon,
  GlobeIcon,
  LayersIcon,
  MusicIcon,
  PackageIcon,
  RocketIcon,
  ServerIcon,
  TerminalIcon,
} from "lucide-react"
import type { CSSProperties, ComponentType } from "react"
import { PROJECT_ICONS, projectColorValue } from "@shared/project-appearance"
import type { ProjectSummary } from "@shared/types"

// Maps the shared catalog's icon ids to lucide components. The shared module
// stays pure data, so the main process can validate against it.

export type ProjectIconComponent = ComponentType<{ className?: string; style?: CSSProperties }>

const ICON_COMPONENTS: Record<string, ProjectIconComponent> = {
  folder: FolderIcon,
  code: CodeIcon,
  terminal: TerminalIcon,
  server: ServerIcon,
  database: DatabaseIcon,
  globe: GlobeIcon,
  package: PackageIcon,
  rocket: RocketIcon,
  flask: FlaskConicalIcon,
  book: BookIcon,
  layers: LayersIcon,
  cpu: CpuIcon,
  brain: BrainIcon,
  game: Gamepad2Icon,
  music: MusicIcon,
  camera: CameraIcon,
}

export { PROJECT_ICONS, projectColorValue }

// The component for a stored icon id, or null when the project has no icon.
export function projectIcon(iconId: string | undefined): ProjectIconComponent | null {
  if (iconId === undefined) return null
  return ICON_COMPONENTS[iconId] ?? null
}

// A project's accent colour as hex, or null when the user picked none.
export function projectColor(project: ProjectSummary): string | null {
  return projectColorValue(project.color)
}
