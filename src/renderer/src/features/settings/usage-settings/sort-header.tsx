export type SortHeaderProps = {
  label: string
  active: boolean
  dir: "asc" | "desc"
  onSort: () => void
}

export function SortHeader({ label, active, dir, onSort }: SortHeaderProps) {
  return (
    <button type="button" className={active ? "text-white" : "hover:text-white"} onClick={onSort}>
      {label}
      {active ? (dir === "asc" ? " ↑" : " ↓") : null}
    </button>
  )
}
