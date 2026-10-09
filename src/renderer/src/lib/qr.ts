import QRCode from "qrcode"

// A QR code as one SVG path of unit squares, so a view can draw it at any size.
export type QrShape = {
  size: number
  path: string
}

export function qrShape(text: string): QrShape {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" })
  const parts: string[] = []
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (modules.get(row, column)) parts.push(`M${column} ${row}h1v1h-1z`)
    }
  }
  return { size: modules.size, path: parts.join("") }
}
