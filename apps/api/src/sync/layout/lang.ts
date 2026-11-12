export function canonical(tag: string) {
  try {
    return Intl.getCanonicalLocales(tag.replace("_", "-"))[0] ?? null
  } catch {
    return null
  }
}
