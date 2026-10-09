// The readable text colour over a background: white or black, by luminance.

// Relativised luminance per WCAG, from an #rrggbb colour.
function luminance(hex: string): number {
  const value = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return 0
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255)
  const [red, green, blue] = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastText(hex: string): string {
  return luminance(hex) > 0.35 ? "#000000" : "#ffffff"
}

// The fallback accent for terminals that belong to no project.
export const NEUTRAL_ACCENT = "#9ca3af"
