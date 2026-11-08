import { icon } from "./art.ts"
import { letter, weights } from "./lettering.ts"

const SIZE = 12
const BASELINE = 14
const TEXT_START = 22

const phrases = {
  translated: "Translated on ",
  help: "Help translate on ",
  compact: "",
}

function lettering(lead: string) {
  const leading = letter({ text: lead, font: weights.medium, size: SIZE, x: TEXT_START, baseline: BASELINE })
  const name = letter({
    text: "Babblebird",
    font: weights.semibold,
    size: SIZE,
    x: leading.end,
    baseline: BASELINE,
  })
  return { label: `${lead}Babblebird`, lead: leading.d, name: name.d, end: Math.ceil(name.box.right) }
}

export function badgeModule() {
  const entries = Object.entries(phrases).map(([kind, lead]) => {
    const fields = Object.entries(lettering(lead)).map(
      ([key, value]) => `    ${key}: ${JSON.stringify(value)},`,
    )
    return `  ${kind}: {\n${fields.join("\n")}\n  },`
  })
  return `export const BRAND_ICON = '<svg x="3" y="3" width="14" height="14" viewBox="0 0 64 64">${icon.small("badge-eye")}</svg>'

export const LETTERING = {
${entries.join("\n")}
}
`
}
