import { readFileSync } from "node:fs"
import { palette, type Scheme, svg } from "./art.ts"

const source = readFileSync(new URL("../../apps/web/src/lib/landing/Puff.svelte", import.meta.url), "utf8")
const drawing = source.match(/<svg viewBox="0 0 200 200"[^>]*>([\s\S]*?)<\/svg>/)![1]!

function colors(scheme: Scheme) {
  const pick = (light: string, dark: string) => (scheme === "light" ? light : dark)
  const tokens: Record<string, string> = { beak: palette[scheme].beak }
  for (const [, name, light, dark, both] of source.matchAll(
    /--(puff[\w-]*): (?:light-dark\((#\w+), (#\w+)\)|(#\w+))/g,
  )) {
    tokens[name!] = both ?? pick(light!, dark!)
  }
  return tokens
}

export function mascot(scheme: Scheme) {
  const tokens = colors(scheme)
  const body = drawing
    .replace(/ (?:class|data-part)="[^"]*"/g, "")
    .replace(/var\(--([\w-]+)\)/g, (_, name: string) => tokens[name]!)
    .replace(/>\s+</g, "><")
    .trim()
  return svg("14 20 172 162", body)
}
