import { expect, test } from "bun:test"
import { runChecks } from "../src/index.ts"

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

test("product names stay as they are", () => {
  const glossary = [{ term: "Luft", translation: null, note: null }]
  expect(codes("= Welcome to Luft", "= Willkommen bei Luftt", "de", glossary as never)).toContain("kept-term")
  expect(codes("= Welcome to Luft", "= Willkommen bei Luft", "de", glossary as never)).toEqual([])
})

test("endings and spacing follow the source", () => {
  expect(codes("= Print…", "= Drucken")).toContain("punctuation")
  expect(codes("= Delete it?", "= Löschen?")).toEqual([])
  expect(codes("= Delete it?", "= Διαγραφή;", "el")).toEqual([])
})
