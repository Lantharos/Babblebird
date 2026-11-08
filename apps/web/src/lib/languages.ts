const NATIVE: Record<string, string> = {
  bg: "Български",
  bs: "Bosanski",
  ca: "Català",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  et: "Eesti",
  fi: "Suomi",
  fr: "Français",
  ga: "Gaeilge",
  hr: "Hrvatski",
  hu: "Magyar",
  is: "Íslenska",
  it: "Italiano",
  lt: "Lietuvių",
  lv: "Latviešu",
  mk: "Македонски",
  mt: "Malti",
  nb: "Norsk bokmål",
  nl: "Nederlands",
  nn: "Norsk nynorsk",
  pl: "Polski",
  pt: "Português",
  "pt-BR": "Português (Brasil)",
  ro: "Română",
  ru: "Русский",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sq: "Shqip",
  sr: "Српски",
  "sr-Latn": "Srpski (latinica)",
  sv: "Svenska",
  tr: "Türkçe",
  uk: "Українська",
}

const names = new Map<string, Intl.DisplayNames>()

function displayNames(locale: string) {
  let found = names.get(locale)
  if (!found) {
    found = new Intl.DisplayNames([locale], { type: "language" })
    names.set(locale, found)
  }
  return found
}

export const englishName = (tag: string) => displayNames("en").of(tag) ?? tag

export function nativeName(tag: string) {
  const known = NATIVE[tag]
  if (known) return known
  const name = displayNames(tag).of(tag) ?? tag
  return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1)
}

export const percent = (part: number, whole: number) => (whole ? Math.floor((part / whole) * 100) : 0)
