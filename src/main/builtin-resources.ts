import { join } from "node:path"

export function builtinSkillPath(appPath: string): string {
  return join(appPath, "builtins", "skills")
}

export function builtinPromptPath(appPath: string): string {
  return join(appPath, "builtins", "prompts")
}
