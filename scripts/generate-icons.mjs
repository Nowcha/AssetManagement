/**
 * PWAアイコン生成スクリプト
 * jimp（pure JS）でPNGを生成して public/icons/ に出力
 * 実行: node scripts/generate-icons.mjs
 */
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Jimp, rgbaToInt } = await import('jimp')

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const ACCENT_COLOR = rgbaToInt(255, 161, 108, 255) // #FFA16C
const BG_COLOR     = rgbaToInt(9,   9,   9,  255)  // #090909
const BLACK        = rgbaToInt(0,   0,   0,  255)

async function drawIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG_COLOR })

  const pad    = Math.round(size * 0.12)
  const inner  = size - pad * 2
  const radius = Math.round(inner * 0.22)

  // Fill rounded-rect with accent color
  for (let y = pad; y < pad + inner; y++) {
    for (let x = pad; x < pad + inner; x++) {
      const dx = x - pad
      const dy = y - pad
      let inside = true

      if (dx < radius && dy < radius) {
        inside = Math.hypot(dx - radius, dy - radius) <= radius
      } else if (dx >= inner - radius && dy < radius) {
        inside = Math.hypot(dx - (inner - radius - 1), dy - radius) <= radius
      } else if (dx < radius && dy >= inner - radius) {
        inside = Math.hypot(dx - radius, dy - (inner - radius - 1)) <= radius
      } else if (dx >= inner - radius && dy >= inner - radius) {
        inside = Math.hypot(dx - (inner - radius - 1), dy - (inner - radius - 1)) <= radius
      }

      if (inside) img.setPixelColor(ACCENT_COLOR, x, y)
    }
  }

  // Simple "A" glyph using thick lines
  const glyph = Math.round(inner * 0.55)
  const cx  = Math.round(size / 2)
  const cy  = Math.round(size / 2)
  const hw  = Math.round(glyph * 0.38)
  const hh  = Math.round(glyph * 0.48)
  const sw  = Math.max(2, Math.round(glyph * 0.13))  // stroke width

  function setStroke(x0, y0) {
    for (let sx = 0; sx < sw; sx++) {
      for (let sy = 0; sy < sw; sy++) {
        const px = x0 + sx, py = y0 + sy
        if (px >= pad && px < pad + inner && py >= pad && py < pad + inner) {
          img.setPixelColor(BLACK, px, py)
        }
      }
    }
  }

  const steps = hh * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps  // 0 = top, 1 = bottom
    const lx = Math.round(cx - hw * t)
    const rx = Math.round(cx + hw * t)
    const y  = Math.round(cy - hh + i)
    setStroke(lx - Math.round(sw / 2), y)
    setStroke(rx - Math.round(sw / 2), y)
  }

  // Crossbar at ~35% down from top
  const crossY = Math.round(cy - hh + steps * 0.38)
  const crossL = Math.round(cx - hw * 0.38)
  const crossR = Math.round(cx + hw * 0.38)
  for (let x = crossL; x <= crossR; x++) {
    setStroke(x, crossY)
  }

  return img
}

for (const size of [192, 512]) {
  const img = await drawIcon(size)
  const outPath = join(outDir, `icon-${size}.png`)
  await img.write(outPath)
  console.log(`Generated: ${outPath}`)
}
console.log('Done.')
