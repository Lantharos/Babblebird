import type { Field, Part, Shape } from "./read.ts"

const pad = (size: number) => " ".repeat(size)

function protectEdges(line: string) {
  return line.replace(/^ +/, (spaces) => `{ "${spaces}" }`).replace(/ +$/, (spaces) => `{ "${spaces}" }`)
}

function protectStart(line: string) {
  return /^[[*.]/.test(line) ? `{ "${line[0]}" }${protectEdges(line.slice(1))}` : protectEdges(line)
}

const braceDepth = (line: string) => (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)

function text(value: string, indent: number) {
  const lines = value.split("\n")
  if (lines.length === 1) return value ? ` ${protectEdges(value)}` : ` { "" }`
  let depth = 0
  return lines
    .map((line) => {
      const inPlaceable = depth > 0
      depth += braceDepth(line)
      if (!line) return "\n"
      return `\n${pad(indent)}${inPlaceable ? line : protectStart(line)}`
    })
    .join("")
}

function part(value: Part, base: number) {
  if (value.kind === "text") return text(value.text, base + 4)
  const variants = value.variants.map(
    (variant) =>
      `\n${pad(base + (variant.default ? 3 : 4))}${variant.default ? "*" : ""}[${variant.key}]${text(variant.text, base + 8)}`,
  )
  return ` { ${value.selector} ->${variants.join("")}\n${pad(base)}}`
}

function attribute(field: Field) {
  return `\n    .${field.name} =${part(field.part, 4)}`
}

export function composeBody(shape: Shape) {
  const value = shape.fields.find((field) => field.name === null)
  const attributes = shape.fields.filter((field) => field.name !== null)
  return `=${value ? part(value.part, 0) : ""}${attributes.map(attribute).join("")}`
}
