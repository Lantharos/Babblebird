import { expect, test } from "bun:test"
import { applyTransform } from "../src/index.ts"

const latin = (text: string) => applyTransform("serbian-cyrillic-to-latin", text)

test("digraph capitals read Lj, Nj and Dž in words and LJ, NJ and DŽ in capitals", () => {
  expect(latin("Љубичаста Његова Џеп")).toBe("Ljubičasta Njegova Džep")
  expect(latin("ЉУБАВ ЊИВА ЏЕП ОЏ")).toBe("LJUBAV NJIVA DŽEP ODŽ")
  expect(latin("Њ")).toBe("Nj")
  expect(latin("ЉWi‑Fi")).toBe("LjWi‑Fi")
})

test("only Serbian Cyrillic letters change in a Fluent file", () => {
  const source = [
    "# Ознака дугмета, види https://luft.computer/sr",
    "files-count = { $count ->",
    "    [one] { $count } датотека у { -brand-name }",
    "   *[other] { $count } датотека",
    "}",
    "wifi-open = Отвори Wi‑Fi",
    "    .title = Ђурђевдан, ћуп, чаша, шах, жаба",
    "russian = Ёлка ы",
    "",
  ].join("\n")
  expect(latin(source)).toBe(
    [
      "# Oznaka dugmeta, vidi https://luft.computer/sr",
      "files-count = { $count ->",
      "    [one] { $count } datoteka u { -brand-name }",
      "   *[other] { $count } datoteka",
      "}",
      "wifi-open = Otvori Wi‑Fi",
      "    .title = Đurđevdan, ćup, čaša, šah, žaba",
      "russian = Ёlka ы",
      "",
    ].join("\n"),
  )
})
