import { mkdirSync, writeFileSync } from "node:fs"
import { Resvg } from "@resvg/resvg-js"
import { BIRD_BOX, bird, icon, palette, type Scheme, svg } from "./art.ts"
import { badgeModule } from "./badge.ts"
import { mascot } from "./mascot.ts"
import { wordmark } from "./wordmark.ts"

const root = new URL("../../", import.meta.url).pathname
const web = `${root}apps/web/static/`
const brand = `${web}brand/`
const schemes: Scheme[] = ["light", "dark"]

const png = (source: string, width: number) =>
  new Resvg(source, { fitTo: { mode: "width", value: width } }).render().asPng()

function write(path: string, contents: string | Uint8Array) {
  writeFileSync(path, contents)
  console.log(path.slice(root.length))
}

mkdirSync(brand, { recursive: true })

const large = svg("0 0 64 64", icon.large())
const small = svg("0 0 64 64", icon.small())
write(`${web}favicon.svg`, small)
write(`${web}apple-touch-icon.png`, png(svg("0 0 64 64", icon.large("eye", 0)), 180))
write(`${web}mail/mark.png`, png(large, 64))

write(`${brand}babblebird-icon.svg`, large)
for (const size of [128, 256, 512, 1024]) write(`${brand}babblebird-icon-${size}.png`, png(large, size))
write(`${brand}babblebird-icon-small.svg`, small)
write(`${brand}babblebird-icon-small-32.png`, png(small, 32))

const birdBox = [BIRD_BOX.x, BIRD_BOX.y, BIRD_BOX.width, BIRD_BOX.height].join(" ")
for (const scheme of schemes) {
  const colors = palette[scheme]
  const mark = svg(birdBox, bird("eye", colors.bird, colors.beak))
  write(`${brand}babblebird-bird-${scheme}.svg`, mark)
  write(`${brand}babblebird-bird-${scheme}.png`, png(mark, 512))

  const words = wordmark(scheme)
  write(`${brand}babblebird-wordmark-${scheme}.svg`, words.svg)
  write(`${brand}babblebird-wordmark-${scheme}.png`, png(words.svg, 1200))

  const puff = mascot(scheme)
  write(`${brand}babblebird-mascot-${scheme}.svg`, puff)
  write(`${brand}babblebird-mascot-${scheme}.png`, png(puff, 1024))
}

write(`${root}apps/api/src/badge/lettering.ts`, badgeModule())
Bun.spawnSync(["bunx", "biome", "format", "--write", `${root}apps/api/src/badge/lettering.ts`])
