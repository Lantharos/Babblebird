import { patternText } from "../plain.ts"
import { isPlural, isPluralCategory, pluralCategories } from "../shape/plural.ts"
import { type Field, parseBody, type Shape, shapeOf } from "../shape/read.ts"
import { type GlossaryTerm, keepsTerm, termPattern, termsIn, usesTranslation } from "./glossary.ts"
import { sameTags, tagsIn } from "./markup.ts"
import { edgeSpaces, endingOf } from "./punctuation.ts"
import { referencesOf } from "./references.ts"

export type { GlossaryTerm } from "./glossary.ts"

export type ProblemCode =
  | "syntax"
  | "unknown-variable"
  | "missing-variable"
  | "unknown-term"
  | "missing-attribute"
  | "extra-attribute"
  | "empty"
  | "missing-plural"
  | "extra-plural"
  | "markup"
  | "punctuation"
  | "spaces"
  | "kept-term"
  | "unchanged"

export interface Problem {
  code: ProblemCode
  severity: "error" | "warning"
  field: string | null
  text: string
}

export const PROBLEM_BITS: Record<ProblemCode, number> = {
  syntax: 1,
  "unknown-variable": 2,
  "missing-variable": 4,
  "unknown-term": 8,
  "missing-attribute": 16,
  "extra-attribute": 32,
  empty: 64,
  "missing-plural": 128,
  punctuation: 256,
  spaces: 512,
  "kept-term": 1024,
  unchanged: 4096,
  "extra-plural": 8192,
  markup: 16384,
}

export const problemFlags = (problems: Problem[]) =>
  problems.reduce((flags, problem) => flags | PROBLEM_BITS[problem.code], 0)

const fieldLabel = (field: string | null) => (field === null ? "The text" : `.${field}`)

function texts(field: Field) {
  return field.part.kind === "text"
    ? [{ key: null, text: field.part.text }]
    : field.part.variants.map((variant) => ({ key: variant.key, text: variant.text }))
}

function primaryText(field: Field) {
  if (field.part.kind === "text") return field.part.text
  return (field.part.variants.find((variant) => variant.default) ?? field.part.variants[0])?.text ?? ""
}

function compareFields(source: Shape, translation: Shape, lang: string, problems: Problem[]) {
  for (const field of source.fields) {
    const other = translation.fields.find((candidate) => candidate.name === field.name)
    if (!other) {
      problems.push({
        code: "missing-attribute",
        severity: "error",
        field: field.name,
        text: `${fieldLabel(field.name)} is missing`,
      })
      continue
    }
    if (isPlural(field.part) && other.part.kind === "select") {
      const keys = new Set(other.part.variants.map((variant) => variant.key))
      const categories = pluralCategories(lang)
      const missing = categories.filter((category) => !keys.has(category))
      if (missing.length)
        problems.push({
          code: "missing-plural",
          severity: "warning",
          field: field.name,
          text: `No form for ${missing.join(", ")}`,
        })
      const unused = [...keys].filter((key) => isPluralCategory(key) && !categories.includes(key))
      if (unused.length)
        problems.push({
          code: "extra-plural",
          severity: "warning",
          field: field.name,
          text: `This language never uses ${unused.map((key) => `[${key}]`).join(", ")}`,
        })
    }
    if (!sameTags(tagsIn(texts(field)), tagsIn(texts(other))))
      problems.push({
        code: "markup",
        severity: "error",
        field: field.name,
        text: `${fieldLabel(field.name)} needs the same tags as the source`,
      })
    const sourceText = primaryText(field)
    const sourceEnding = endingOf(sourceText)
    const sourceEdges = edgeSpaces(sourceText)
    for (const { key, text } of texts(other)) {
      const where = key ? `[${key}]` : fieldLabel(field.name)
      if (!text.trim()) {
        problems.push({ code: "empty", severity: "warning", field: field.name, text: `${where} is empty` })
        continue
      }
      const ending = endingOf(text)
      if (ending !== sourceEnding)
        problems.push({
          code: "punctuation",
          severity: "warning",
          field: field.name,
          text: sourceEnding
            ? `${where} should end like the source`
            : `${where} ends with punctuation the source doesn't have`,
        })
      const edges = edgeSpaces(text)
      if (
        edges.leading !== sourceEdges.leading ||
        edges.trailing !== sourceEdges.trailing ||
        /\S {2,}\S/.test(text) !== /\S {2,}\S/.test(sourceText)
      )
        problems.push({
          code: "spaces",
          severity: "warning",
          field: field.name,
          text: `${where} has different spacing`,
        })
    }
  }
  for (const field of translation.fields)
    if (!source.fields.some((candidate) => candidate.name === field.name))
      problems.push({
        code: "extra-attribute",
        severity: "error",
        field: field.name,
        text: `${fieldLabel(field.name)} isn't in the source`,
      })
}

function compareReferences(sourceBody: string, translationBody: string, problems: Problem[]) {
  const source = referencesOf(parseBody(sourceBody)!)
  const translation = referencesOf(parseBody(translationBody)!)
  for (const name of translation.variables)
    if (!source.variables.has(name))
      problems.push({
        code: "unknown-variable",
        severity: "error",
        field: null,
        text: `{ $${name} } isn't in the source`,
      })
  for (const name of source.variables)
    if (!translation.variables.has(name))
      problems.push({
        code: "missing-variable",
        severity: "warning",
        field: null,
        text: `{ $${name} } is missing`,
      })
  for (const name of translation.terms)
    if (!source.terms.has(name))
      problems.push({
        code: "unknown-term",
        severity: "error",
        field: null,
        text: `{ -${name} } isn't in the source`,
      })
}

function compareKeptTerms(
  sourcePlain: string,
  translationPlain: string,
  glossary: GlossaryTerm[],
  problems: Problem[],
) {
  for (const entry of termsIn(sourcePlain, glossary))
    if (entry.translation === null && !keepsTerm(translationPlain, entry.term))
      problems.push({
        code: "kept-term",
        severity: "warning",
        field: null,
        text: `Keep “${entry.term}” as it is`,
      })
}

function plainOfBody(body: string) {
  const entry = parseBody(body)!
  return [entry.value, ...entry.attributes.map((attribute) => attribute.value)]
    .filter((pattern) => pattern !== null)
    .map((pattern) => patternText(pattern))
    .join(" ")
}

export function runChecks(
  sourceBody: string,
  translationBody: string,
  lang: string,
  glossary: GlossaryTerm[] = [],
) {
  const problems: Problem[] = []
  const translation = shapeOf(translationBody)
  const entry = parseBody(translationBody)
  if (!translation || !entry || (!entry.value && !entry.attributes.length)) {
    problems.push({ code: "syntax", severity: "error", field: null, text: "This isn't valid Fluent" })
    return problems
  }
  const source = shapeOf(sourceBody)!
  compareFields(source, translation, lang, problems)
  compareReferences(sourceBody, translationBody, problems)
  const sourcePlain = plainOfBody(sourceBody)
  const translationPlain = plainOfBody(translationBody)
  compareKeptTerms(sourcePlain, translationPlain, glossary, problems)
  const kept = termsIn(sourcePlain, glossary).filter(
    (entry) => entry.translation === null || entry.translation === entry.term,
  )
  const translatable = kept
    .reduce((text, entry) => text.replace(termPattern(entry.term, true), ""), sourcePlain)
    .replace(/\{[^}]*\}/g, "")
  if (translationPlain === sourcePlain && /\p{L}{3}/u.test(translatable))
    problems.push({
      code: "unchanged",
      severity: "warning",
      field: null,
      text: "It's the same as the source",
    })
  return problems
}

export function glossaryHints(sourceBody: string, translationBody: string, glossary: GlossaryTerm[]) {
  if (!parseBody(translationBody)) return []
  const translationPlain = plainOfBody(translationBody)
  return termsIn(plainOfBody(sourceBody), glossary)
    .filter((entry) => entry.translation !== null && !usesTranslation(translationPlain, entry.translation))
    .map((entry) => `“${entry.term}” is usually “${entry.translation}”`)
}
