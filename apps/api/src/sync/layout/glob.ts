const cache = new Map<string, RegExp>()

export function globPattern(glob: string) {
  let pattern = cache.get(glob)
  if (!pattern) {
    const source = glob
      .split(/(\*\*\/|\*\*|\*|\?|\{lang\})/)
      .map((part) => {
        if (part === "**/") return "(?:.*/)?"
        if (part === "**") return ".*"
        if (part === "*") return "[^/]*"
        if (part === "?") return "[^/]"
        if (part === "{lang}") return "\\{lang\\}"
        return part.replace(/[.+^${}()|[\]\\]/g, "\\$&")
      })
      .join("")
    pattern = new RegExp(`^${source}$`)
    cache.set(glob, pattern)
  }
  return pattern
}

export const matchesAny = (path: string, globs: string[]) =>
  globs.some((glob) => globPattern(glob).test(path))
