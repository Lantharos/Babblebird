import { BRAND_ICON, LETTERING } from "./lettering.ts"

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

export type BrandBadge = keyof typeof LETTERING
export type BadgeTheme = "light" | "dark"

const THEMES = {
  light: { background: "#ffffff", edge: "#12161b24", lead: "#3c4550", name: "#12161b" },
  dark: { background: "#171b1f", edge: "#e9ecef1f", lead: "#b9c0c7", name: "#e9ecef" },
}

export function brandBadgeSvg(kind: BrandBadge, theme: BadgeTheme) {
  const lettering = LETTERING[kind]
  const colors = THEMES[theme]
  const width = lettering.end + PADDING
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${lettering.label}"><title>${lettering.label}</title><rect x=".5" y=".5" width="${width - 1}" height="19" rx="5.5" fill="${colors.background}" stroke="${colors.edge}"/>${BRAND_ICON}<path d="${lettering.lead}" fill="${colors.lead}"/><path d="${lettering.name}" fill="${colors.name}"/></svg>`
}
