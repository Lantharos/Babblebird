import { type Font, openSync } from "fontkit"

const fonts = new URL("../../apps/web/static/fonts/", import.meta.url).pathname

export const weights = {
  medium: openSync(`${fonts}OpenRunde-Medium.woff2`) as Font,
  semibold: openSync(`${fonts}OpenRunde-Semibold.woff2`) as Font,
}

const rounded = (d: string) => d.replace(/-?\d*\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100))

export type Run = { text: string; font: Font; size: number; x: number; baseline: number; tracking?: number }

export function letter(run: Run) {
  const scale = run.size / run.font.unitsPerEm
  const layout = run.font.layout(run.text)
  let x = run.x
  let d = ""
  let top = run.baseline
  let bottom = run.baseline
  let left = Number.POSITIVE_INFINITY
  let right = run.x
  layout.glyphs.forEach((glyph, index) => {
    const position = layout.positions[index]!
    const baseline = run.baseline - position.yOffset * scale
    const origin = x + position.xOffset * scale
    d += glyph.path.scale(scale, -scale).translate(origin, baseline).toSVG()
    left = Math.min(left, origin + glyph.bbox.minX * scale)
    right = Math.max(right, origin + glyph.bbox.maxX * scale)
    top = Math.min(top, baseline - glyph.bbox.maxY * scale)
    bottom = Math.max(bottom, baseline - glyph.bbox.minY * scale)
    x += position.xAdvance * scale + (run.tracking ?? 0) * run.size
  })
  return { d: rounded(d), end: x, box: { left, right, top, bottom } }
}
