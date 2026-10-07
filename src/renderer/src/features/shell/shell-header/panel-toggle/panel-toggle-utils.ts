export function panelToggleTitle(open: boolean, mod: string): string {
  return `${open ? "Hide" : "Show"} panel (${mod}⇧D)`
}
