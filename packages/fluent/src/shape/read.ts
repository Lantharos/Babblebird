import {
  FluentParser,
  Message,
  type Pattern,
  Placeable,
  SelectExpression,
  serializeExpression,
  serializeVariantKey,
  Term,
  TextElement,
} from "@fluent/syntax"

export interface Variant {
  key: string
  default: boolean
  text: string
}

export type Part = { kind: "text"; text: string } | { kind: "select"; selector: string; variants: Variant[] }

export interface Field {
  name: string | null
  part: Part
}

export interface Shape {
  fields: Field[]
}

const parser = new FluentParser({ withSpans: false })

export function parseBody(body: string) {
  const entry = parser.parseEntry(`k ${body}`)
  return entry instanceof Message || entry instanceof Term ? entry : null
}

function placeableText(placeable: Placeable): string {
  const expression = placeable.expression
  if (expression instanceof Placeable) return `{${placeableText(expression)}}`
  if (expression instanceof SelectExpression) return `{ ${serializeExpression(expression)}}`
  return `{ ${serializeExpression(expression)} }`
}

export function patternSource(pattern: Pattern) {
  return pattern.elements
    .map((element) => (element instanceof TextElement ? element.value : placeableText(element)))
    .join("")
}

function hasNestedSelect(pattern: Pattern) {
  return pattern.elements.some(
    (element) => element instanceof Placeable && element.expression instanceof SelectExpression,
  )
}

function partOf(pattern: Pattern): Part {
  const [only] = pattern.elements
  if (
    pattern.elements.length === 1 &&
    only instanceof Placeable &&
    only.expression instanceof SelectExpression
  ) {
    const select = only.expression
    if (select.variants.every((variant) => !hasNestedSelect(variant.value)))
      return {
        kind: "select",
        selector: serializeExpression(select.selector),
        variants: select.variants.map((variant) => ({
          key: serializeVariantKey(variant.key),
          default: variant.default,
          text: patternSource(variant.value),
        })),
      }
  }
  return { kind: "text", text: patternSource(pattern) }
}

export function shapeOf(body: string): Shape | null {
  const entry = parseBody(body)
  if (!entry) return null
  const fields: Field[] = []
  if (entry.value) fields.push({ name: null, part: partOf(entry.value) })
  for (const attribute of entry.attributes)
    fields.push({ name: attribute.id.name, part: partOf(attribute.value) })
  return { fields }
}
