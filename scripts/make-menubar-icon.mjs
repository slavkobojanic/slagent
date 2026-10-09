// Generates resources/menubar.png and menubar@2x.png, the menu bar (tray) icon
// the daemon shows while it serves the phone: the app icon's ringed planet as a
// white silhouette on transparent. Only alpha matters to a template image, so
// macOS still recolors it for light and dark menu bars.
// Pass a size to also write a large preview: node scripts/make-menubar-icon.mjs 512
import { deflateSync } from "node:zlib"
import { writeFile } from "node:fs/promises"

// Geometry on a unit canvas, matching the icon: the ring dips to the lower left.
const PLANET = 0.23
const RING_A = 0.44
const RING_B = 0.11
const RING_WIDTH = 0.075
const TILT = (-18 * Math.PI) / 180
// Transparent moat that separates the ring from the planet where they cross.
const GAP = 0.045
const SAMPLES = 8

function inside(x, y) {
  const px = x - 0.5
  const py = y - 0.5
  const planet = Math.hypot(px, py) - PLANET

  // Into the ring's frame; v > 0 is the half that passes in front.
  const u = px * Math.cos(TILT) + py * Math.sin(TILT)
  const v = -px * Math.sin(TILT) + py * Math.cos(TILT)
  const front = v > 0
  // The ring is the band between two ellipses, grown by `pad` on each side.
  const band = (pad) => {
    const outer = RING_WIDTH / 2 + pad
    const inside = (a, b) => (u / a) ** 2 + (v / b) ** 2 <= 1
    return inside(RING_A + outer, RING_B + outer) && !inside(RING_A - outer, RING_B - outer)
  }

  if (band(0)) return front || planet > GAP || planet <= 0
  if (planet <= 0) return !(front && band(GAP))
  return false
}

function render(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    for (let x = 0; x < size; x += 1) {
      let hits = 0
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          if (inside((x + (sx + 0.5) / SAMPLES) / size, (y + (sy + 0.5) / SAMPLES) / size)) hits += 1
        }
      }
      const offset = row + 1 + x * 4
      raw[offset] = 255
      raw[offset + 1] = 255
      raw[offset + 2] = 255
      raw[offset + 3] = Math.round((hits / SAMPLES ** 2) * 255)
    }
  }
  return encode(size, raw)
}

function encode(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
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

// Electron picks up the @2x file next to menubar.png on Retina displays.
for (const [name, size] of [
  ["menubar.png", 18],
  ["menubar@2x.png", 36],
]) {
  await writeFile(new URL(`../resources/${name}`, import.meta.url), render(size))
  console.log(`wrote resources/${name}`)
}

const preview = Number(process.argv[2])
if (preview) {
  await writeFile(new URL(`../resources/menubar-${preview}.png`, import.meta.url), render(preview))
  console.log(`wrote resources/menubar-${preview}.png`)
}
