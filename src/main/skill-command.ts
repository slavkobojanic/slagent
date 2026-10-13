const commandName = /^\/([^\s/]+)/

export function skillCommandInsert(name: string, reservedNames: ReadonlySet<string>): string {
  return reservedNames.has(name) ? `/skill:${name}` : `/${name}`
}

export function expandSkillAlias(text: string, skillNames: ReadonlySet<string>, reservedNames: ReadonlySet<string>): string {
  const match = commandName.exec(text)
  const name = match?.[1]
  if (!match || !name || name.startsWith("skill:") || !skillNames.has(name) || reservedNames.has(name)) return text
  return `/skill:${name}${text.slice(match[0].length)}`
}
