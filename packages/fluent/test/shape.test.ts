import { expect, test } from "bun:test"
import { FluentSerializer } from "@fluent/syntax"
import { composeBody, fitShape, parseBody, shapeOf } from "../src/index.ts"

const serializer = new FluentSerializer()
const normal = (body: string) => serializer.serializeEntry(parseBody(body)!)

const BODIES = [
  "= Copied { $name } to { $folder }",
  "= { $count ->\n    [one] Close window\n   *[other] Close all { $count } windows\n}",
  "=\n    First line\n    second line",
  "= Show on the desktop\n    .description = Rain and snow land on windows",
  "=\n    .label = Volume\n    .tooltip = { $percent }%",
  "= { $count ->\n    [0] Nothing\n    [one] One file\n   *[other] { $count } files\n}\n    .title = Files",
  '= { "[" }not a key',
  '= { DATETIME($when, dateStyle: "long") }',
]

test("composing a shape gives back the same message", () => {
  for (const body of BODIES) expect(normal(composeBody(shapeOf(body)!))).toBe(normal(body))
})

test("a translation gets the plural forms of its language", () => {
  const source = shapeOf(BODIES[1]!)!
  const russian = fitShape(source, null, "ru")
  const part = russian.fields[0]!.part
  expect(part.kind === "select" && part.variants.map((variant) => variant.key)).toEqual([
    "one",
    "few",
    "many",
    "other",
  ])
  const exact = fitShape(shapeOf(BODIES[5]!)!, null, "de").fields[0]!.part
  expect(exact.kind === "select" && exact.variants.map((variant) => variant.key)).toEqual([
    "0",
    "one",
    "other",
  ])
})
