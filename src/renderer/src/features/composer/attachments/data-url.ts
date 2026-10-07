export function base64FromDataUrl(url: string | null): string | null {
  if (!url) {
    return null
  }
  const marker = "base64,"
  const index = url.indexOf(marker)
  if (index < 0) {
    return null
  }
  return url.slice(index + marker.length)
}
