import { BIRD_BOX, bird, palette, type Scheme, svg } from "./art.ts"
import { letter, weights } from "./lettering.ts"

const EM = 100
const TRACKING = -0.035
const font = weights.semibold
const lineTop = ((font.ascent - font.descent) / font.unitsPerEm - 1) / 2
const BASELINE = (font.ascent / font.unitsPerEm - lineTop) * EM

function lettering() {
  const runs = []
  let x = 0
  for (const text of ["babbleb", "ı", "rd"]) {
    const run = letter({ text, font, size: EM, x, baseline: BASELINE, tracking: TRACKING })
    runs.push({ text, start: x, ...run })
    x = run.end
  }
  return runs
}

export function wordmark(scheme: Scheme) {
  const runs = lettering()
  const dotless = runs[1]!
  const box = { left: dotless.start - 0.07 * EM, top: -0.08 * EM, width: 0.4 * EM, height: 0.34 * EM }
  const scale = Math.min(box.width / 44, box.height / 36)
  const birdX = box.left - 12 * scale
  const birdY = box.top + (box.height - 36 * scale) / 2 - 16 * scale

  const left = Math.min(...runs.map((run) => run.box.left), birdX + BIRD_BOX.x * scale)
  const right = Math.max(...runs.map((run) => run.box.right), birdX + (BIRD_BOX.x + BIRD_BOX.width) * scale)
  const top = Math.min(...runs.map((run) => run.box.top), birdY + BIRD_BOX.y * scale)
  const bottom = Math.max(...runs.map((run) => run.box.bottom))

  const colors = palette[scheme]
  const round = (value: number) => Math.round(value * 100) / 100
  const viewBox = [left, top, right - left, bottom - top].map(round).join(" ")
  const body =
    `<path d="${runs.map((run) => run.d).join("")}" fill="${colors.ink}"/>` +
    bird(
      "eye",
      colors.bird,
      colors.beak,
      `matrix(${scale.toFixed(4)} 0 0 ${scale.toFixed(4)} ${round(birdX)} ${round(birdY)})`,
    )
  return { svg: svg(viewBox, body), aspect: (right - left) / (bottom - top) }
}
