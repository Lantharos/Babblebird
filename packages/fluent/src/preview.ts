import { FluentBundle, FluentResource, type FluentVariable } from "@fluent/bundle"
import { referencesOf } from "./checks/references.ts"
import { pluralCategories } from "./shape/plural.ts"
import { parseBody } from "./shape/read.ts"

export interface Preview {
  label: string | null
  attribute: string | null
  text: string
}

const NUMERIC = /count|number|num|total|amount|percent|size|minutes|hours|seconds|days|^n$/i
const TEMPORAL = /date|time|when|day$/i
const PERSON = /name|person|user|sender|author|contact/i

function sampleNumber(lang: string, category: string) {
  const rules = new Intl.PluralRules(lang)
  for (const candidate of [1, 2, 3, 5, 0, 11, 21, 22, 25, 101, 1.5])
    if (rules.select(candidate) === category) return candidate
  return 7
}

function sample(name: string): FluentVariable {
  if (NUMERIC.test(name)) return 3
  if (TEMPORAL.test(name)) return new Date()
  if (PERSON.test(name)) return "Ada"
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (first) => first.toUpperCase())
}

export function previews(body: string, lang: string): Preview[] {
  const entry = parseBody(body)
  if (!entry) return []
  const bundle = new FluentBundle(lang, { useIsolating: false })
  bundle.addResource(new FluentResource(`k ${body}`))
  const message = bundle.getMessage("k")
  if (!message) return []
  const variables = [...referencesOf(entry).variables]
  const counted = variables.find((name) => NUMERIC.test(name))
  const base = Object.fromEntries(variables.map((name) => [name, sample(name)]))
  const sets = counted
    ? pluralCategories(lang).map((category) => ({
        label: category,
        args: { ...base, [counted]: sampleNumber(lang, category) },
      }))
    : [{ label: null, args: base }]
  const patterns: [string | null, NonNullable<typeof message.value>][] = []
  if (message.value) patterns.push([null, message.value])
  for (const [name, pattern] of Object.entries(message.attributes)) patterns.push([name, pattern])
  const shown: Preview[] = []
  for (const [attribute, pattern] of patterns)
    for (const { label, args } of sets) {
      const text = bundle.formatPattern(pattern, args, [])
      if (!shown.some((other) => other.attribute === attribute && other.text === text))
        shown.push({ label, attribute, text })
    }
  return shown
}
