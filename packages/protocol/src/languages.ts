const KNOWN: Record<string, { native: string; english: string }> = {
  bg: { native: "Български", english: "Bulgarian" },
  bs: { native: "Bosanski", english: "Bosnian" },
  ca: { native: "Català", english: "Catalan" },
  cs: { native: "Čeština", english: "Czech" },
  da: { native: "Dansk", english: "Danish" },
  de: { native: "Deutsch", english: "German" },
  el: { native: "Ελληνικά", english: "Greek" },
  en: { native: "English", english: "English" },
  es: { native: "Español", english: "Spanish" },
  et: { native: "Eesti", english: "Estonian" },
  fi: { native: "Suomi", english: "Finnish" },
  fr: { native: "Français", english: "French" },
  ga: { native: "Gaeilge", english: "Irish" },
  hr: { native: "Hrvatski", english: "Croatian" },
  hu: { native: "Magyar", english: "Hungarian" },
  is: { native: "Íslenska", english: "Icelandic" },
  it: { native: "Italiano", english: "Italian" },
  lt: { native: "Lietuvių", english: "Lithuanian" },
  lv: { native: "Latviešu", english: "Latvian" },
  mk: { native: "Македонски", english: "Macedonian" },
  mt: { native: "Malti", english: "Maltese" },
  nb: { native: "Norsk bokmål", english: "Norwegian Bokmål" },
  nl: { native: "Nederlands", english: "Dutch" },
  nn: { native: "Norsk nynorsk", english: "Norwegian Nynorsk" },
  pl: { native: "Polski", english: "Polish" },
  pt: { native: "Português", english: "Portuguese" },
  "pt-BR": { native: "Português (Brasil)", english: "Brazilian Portuguese" },
  ro: { native: "Română", english: "Romanian" },
  ru: { native: "Русский", english: "Russian" },
  sk: { native: "Slovenčina", english: "Slovak" },
  sl: { native: "Slovenščina", english: "Slovenian" },
  sq: { native: "Shqip", english: "Albanian" },
  sr: { native: "Српски", english: "Serbian" },
  "sr-Latn": { native: "Srpski (latinica)", english: "Serbian (Latin)" },
  sv: { native: "Svenska", english: "Swedish" },
  tr: { native: "Türkçe", english: "Turkish" },
  uk: { native: "Українська", english: "Ukrainian" },
}

const displays = new Map<string, Intl.DisplayNames>()

function display(tag: string, locale: string) {
  let names = displays.get(locale)
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "language" })
    displays.set(locale, names)
  }
  return names.of(tag) ?? tag
}

export const englishName = (tag: string) => KNOWN[tag]?.english ?? display(tag, "en")

export function nativeName(tag: string) {
  const known = KNOWN[tag]?.native
  if (known) return known
  const name = display(tag, tag)
  return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1)
}
