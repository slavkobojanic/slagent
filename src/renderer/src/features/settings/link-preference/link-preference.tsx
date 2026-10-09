import type { LinkPreference } from "@/state/link/link-store/link-store"

// Null means ask every time; the other two mirror LinkPreference.
const OPTIONS = [
  { value: null, label: "Ask every time" },
  { value: "browser", label: "Open in browser" },
  { value: "copy", label: "Copy to clipboard" },
] as const

export type LinkPreferenceOption = LinkPreference | null

export type LinkPreferencePickerProps = {
  value: LinkPreferenceOption
  onChange: (value: LinkPreferenceOption) => void
}

export function LinkPreferencePicker({ value, onChange }: LinkPreferencePickerProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Links</h2>
      <p className="text-sm text-white/60">What happens when a web link is clicked.</p>
      <div role="radiogroup" aria-label="Links" className="inline-flex rounded-md border border-white/15 p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.label}
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
