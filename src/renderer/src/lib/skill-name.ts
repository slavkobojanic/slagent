// A skill folder name: kebab-case, no dots or slashes, so the path stays inside the skills directory.
export function isValidSkillName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(name)
}
