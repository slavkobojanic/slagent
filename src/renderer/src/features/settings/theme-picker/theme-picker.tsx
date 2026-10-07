// The three choices are the whole theme type, so the list defines it.
const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const

export type ThemeOption = (typeof THEMES)[number]["value"]

export type ThemePickerProps = {
  value: ThemeOption
  onChange: (value: ThemeOption) => void
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Theme</h2>
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-white/15 p-0.5">
        {THEMES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className="rounded px-3 py-1 text-sm text-white/60 transition-colors hover:text-white aria-checked:bg-white/10 aria-checked:text-white"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}
