// Generates resources/menubar.png, the menu bar (tray) template icon the daemon
// shows while it serves the phone: a speech bubble, black on transparent, so
// macOS can recolor it for light and dark menu bars.
import { deflateSync } from "node:zlib"
import { writeFile } from "node:fs/promises"

const SIZE = 18
const CENTER = SIZE / 2
const RADIUS = 6.5

// Alpha 255 inside the bubble circle, plus a little tail at the bottom left.
function alpha(x, y) {
  const dx = x - CENTER
  const dy = y - CENTER
  if (dx * dx + dy * dy <= RADIUS * RADIUS) return 255
  // Tail: a small triangle from the circle's lower left.
  if (x >= 2 && x <= 7 && y >= 12 && y <= x + 6) return 255
  return 0
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y += 1) {
  const row = y * (SIZE * 4 + 1)
  raw[row] = 0
  for (let x = 0; x < SIZE; x += 1) {
    const offset = row + 1 + x * 4
    raw[offset] = 0
    raw[offset + 1] = 0
    raw[offset + 2] = 0
    raw[offset + 3] = alpha(x, y)
  }
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

const table = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = table[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8
ihdr[9] = 6

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
])

await writeFile(new URL("../resources/menubar.png", import.meta.url), png)
console.log("wrote resources/menubar.png")
