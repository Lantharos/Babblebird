const ENDINGS: [kind: string, marks: string[]][] = [
  ["ellipsis", ["…", "..."]],
  ["question", ["?", "？", "؟", ";"]],
  ["exclamation", ["!", "！"]],
  ["colon", [":", "："]],
  ["stop", [".", "。", "।", "۔", "።"]],
]

const QUOTES = /["'”’»«)\]\s]+$/

export function endingOf(text: string) {
  const trimmed = text.replace(QUOTES, "")
  for (const [kind, marks] of ENDINGS) if (marks.some((mark) => trimmed.endsWith(mark))) return kind
  return null
}

export function edgeSpaces(text: string) {
  return { leading: /^\s/.test(text), trailing: /\s$/.test(text) }
}
