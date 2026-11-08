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
  const name = displayNames(tag).of(tag) ?? tag
  return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1)
}

export const percent = (part: number, whole: number) => (whole ? Math.floor((part / whole) * 100) : 0)
