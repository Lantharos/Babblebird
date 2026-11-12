import type { Field, Part, Shape, Variant } from "./read.ts"

const CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const
const NUMBER = /^-?\d+(\.\d+)?$/

export function pluralCategories(lang: string): string[] {
  const found = new Set<string>(new Intl.PluralRules(lang).resolvedOptions().pluralCategories)
  return CATEGORIES.filter((category) => found.has(category))
}

export const isPluralCategory = (key: string) => (CATEGORIES as readonly string[]).includes(key)

export function isPlural(part: Part) {
  return (
    part.kind === "select" &&
    part.variants.some((variant) => isPluralCategory(variant.key)) &&
    part.variants.every((variant) => NUMBER.test(variant.key) || isPluralCategory(variant.key))
  )
}

function pluralVariants(source: Variant[], lang: string, existing: Variant[]) {
  const text = (key: string) => existing.find((variant) => variant.key === key)?.text ?? ""
  const keys = [
    ...source.filter((variant) => NUMBER.test(variant.key)).map((variant) => variant.key),
    ...pluralCategories(lang),
  ]
  for (const variant of existing) if (!keys.includes(variant.key)) keys.push(variant.key)
  return keys.map((key) => ({ key, default: key === "other", text: text(key) }))
}

function fitPart(source: Part, existing: Part | undefined, lang: string): Part {
  if (source.kind === "text") return existing ?? { kind: "text", text: "" }
  const variants = existing?.kind === "select" ? existing.variants : []
  if (isPlural(source))
    return {
      kind: "select",
      selector: source.selector,
      variants: pluralVariants(source.variants, lang, variants),
    }
  return {
    kind: "select",
    selector: source.selector,
    variants: source.variants.map((variant) => ({
      ...variant,
      text: variants.find((other) => other.key === variant.key)?.text ?? "",
    })),
  }
}

export function fitShape(source: Shape, translation: Shape | null, lang: string): Shape {
  const fields: Field[] = source.fields.map((field) => ({
    name: field.name,
    part: fitPart(field.part, translation?.fields.find((other) => other.name === field.name)?.part, lang),
  }))
  return { fields }
}

export function isEmpty(shape: Shape) {
  return shape.fields.every((field) =>
    field.part.kind === "text"
      ? !field.part.text.trim()
      : field.part.variants.every((variant) => !variant.text.trim()),
  )
}
