const LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ђ: "đ",
  е: "e",
  ж: "ž",
  з: "z",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ћ: "ć",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "č",
  џ: "dž",
  ш: "š",
}

const TITLE_DIGRAPHS: Record<string, string> = { Љ: "Lj", Њ: "Nj", Џ: "Dž" }
const CYRILLIC_CAPITAL = /[Ѐ-Я]/

export function serbianLatin(text: string) {
  return text.replace(/[Ѐ-ӿ]/g, (letter, offset: number) => {
    const lower = letter.toLowerCase()
    const latin = LATIN[lower]
    if (!latin) return letter
    if (letter === lower) return latin
    const shouting =
      CYRILLIC_CAPITAL.test(text[offset + 1] ?? "") || CYRILLIC_CAPITAL.test(text[offset - 1] ?? "")
    return shouting ? latin.toUpperCase() : (TITLE_DIGRAPHS[letter] ?? latin.toUpperCase())
  })
}
