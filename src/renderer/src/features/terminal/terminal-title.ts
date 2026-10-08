// zsh titles the window "user@host: path" by default, which would leave the tab
// showing who you are instead of where you are. Keep what follows the host.
const USER_AT_HOST = /^[^@\s]+@[^:\s]+:\s*(.+)$/

export function terminalTitle(title: string): string {
  const trimmed = title.trim()
  const match = USER_AT_HOST.exec(trimmed)
  if (match === null) {
    return trimmed
  }
  return match[1].trim() || trimmed
}
