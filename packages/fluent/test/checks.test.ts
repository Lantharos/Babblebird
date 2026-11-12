import { expect, test } from "bun:test"
import { glossaryHints, runChecks } from "../src/index.ts"

const codes = (source: string, translation: string, lang = "de", glossary = []) =>
  runChecks(source, translation, lang, glossary).map((problem) => problem.code)

test("variables the source doesn't have are errors", () => {
  expect(codes("= Copied { $name }", "= { $file } kopiert")).toContain("unknown-variable")
  expect(codes("= Copied { $name }", "= { $name } kopiert")).toEqual([])
})

test("broken syntax and missing forms are caught", () => {
  expect(codes("= Hello", "= { $x ->")).toEqual(["syntax"])
  const plural = "= { $count ->\n    [one] One file\n   *[other] { $count } files\n}"
  expect(
    codes(plural, "= { $count ->\n    [one] Один файл\n   *[other] { $count } файлов\n}", "ru"),
  ).toContain("missing-plural")
})

test("product names stay as they are, case endings allowed", () => {
  const glossary = [{ term: "Luft", translation: null, note: null }]
  expect(codes("= Welcome to Luft", "= Willkommen bei luft", "de", glossary as never)).toContain("kept-term")
  expect(codes("= Welcome to Luft", "= Willkommen bei Luft", "de", glossary as never)).toEqual([])
  expect(codes("= Welcome to Luft", "= Tere tulemast Lufti", "et", glossary as never)).toEqual([])
  const keys = [{ term: "Keys", translation: null, note: null }]
  expect(codes("= Press the keys", "= Vajuta klahve", "et", keys as never)).toEqual([])
})

test("forms the language doesn't have are flagged", () => {
  const plural = "= { $count ->\n    [one] { $count } file\n   *[other] { $count } files\n}"
  expect(
    codes(
      plural,
      "= { $count ->\n    [one] { $count } fail\n    [few] { $count } faili\n   *[other] { $count } faili\n}",
      "et",
    ),
  ).toEqual(["extra-plural"])
})

test("markup keeps the source's tags", () => {
  const source = '= See <a href="{ $docs }">the docs</a>.'
  expect(codes(source, "= Siehe die Doku { $docs }.")).toContain("markup")
  expect(codes(source, '= Siehe <a href="{ $docs }">die Doku</a>.')).toEqual([])
  expect(codes("= <unknown>", "= <unbekannt>")).toEqual([])
})

test("endings and spacing follow the source", () => {
  expect(codes("= Print…", "= Drucken")).toContain("punctuation")
  expect(codes("= Delete it?", "= Löschen?")).toEqual([])
  expect(codes("= Delete it?", "= Διαγραφή;", "el")).toEqual([])
})

test("glossary terms are hints, not problems", () => {
  const glossary = [{ term: "open", translation: "avama", note: null }]
  expect(codes("= Open the file", "= Ava fail", "et", glossary as never)).toEqual([])
  expect(glossaryHints("= Open the file", "= Käivita fail", glossary)).toEqual(["“open” is usually “avama”"])
})

test("a copy of the source is only flagged when there are words to translate", () => {
  expect(codes("= { $width } × { $height }", "= { $width } × { $height }")).toEqual([])
  const glossary = [{ term: "Start", translation: "Start", note: null }]
  expect(codes("= Start", "= Start", "et", glossary as never)).toEqual([])
  expect(codes("= Printer", "= Printer", "et")).toEqual(["unchanged"])
})
