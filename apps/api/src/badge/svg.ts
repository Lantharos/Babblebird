const CHAR_WIDTH = 6.6
const PADDING = 8

const escaped = (text: string) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`)

const ICON = 14

export function badgeSvg(label: string, value: string, color: string, icon: string | null = null) {
  const shift = icon ? ICON + 4 : 0
  const left = Math.round(label.length * CHAR_WIDTH + PADDING * 2 + shift)
  const right = Math.round(value.length * CHAR_WIDTH + PADDING * 2)
  const width = left + right
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escaped(label)}: ${escaped(value)}"><title>${escaped(label)}: ${escaped(value)}</title><clipPath id="r"><rect width="${width}" height="20" rx="4"/></clipPath><g clip-path="url(#r)"><rect width="${left}" height="20" fill="#1d1b17"/><rect x="${left}" width="${right}" height="20" fill="${color}"/></g>${icon ? `<image x="${PADDING - 2}" y="3" width="${ICON}" height="${ICON}" href="${icon}"/>` : ""}<g font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${(left + shift) / 2}" y="14" fill="#ece9e3">${escaped(label)}</text><text x="${left + right / 2}" y="14" fill="#ffffff">${escaped(value)}</text></g></svg>`
}

export function colorFor(percent: number) {
  if (percent >= 90) return "#3f7d4e"
  if (percent >= 60) return "#8a5a00"
  return "#a8402b"
}
