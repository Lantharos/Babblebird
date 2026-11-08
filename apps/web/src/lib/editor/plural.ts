const cache = new Map<string, string>()

export function examples(lang: string, category: string) {
  const key = `${lang}:${category}`
  let found = cache.get(key)
  if (found === undefined) {
    const rules = new Intl.PluralRules(lang)
    const numbers: number[] = []
    for (let n = 0; n <= 120 && numbers.length < 4; n++) if (rules.select(n) === category) numbers.push(n)
    found = numbers.length ? `${numbers.join(", ")}${numbers.length === 4 ? "…" : ""}` : "fractions"
    cache.set(key, found)
  }
  return found
}

export function variantLabel(lang: string, key: string) {
  if (/^-?\d/.test(key)) return { name: `Exactly ${key}`, hint: null }
  if (["zero", "one", "two", "few", "many", "other"].includes(key))
    return { name: key, hint: examples(lang, key) }
  return { name: key, hint: null }
}
