const TAG = /<(\/?)([a-zA-Z][\w-]*)(?:\s[^<>]*)?\/?>/g

export function tagsIn(texts: { text: string }[]) {
  const found = texts.flatMap(({ text }) => [...text.matchAll(TAG)])
  const closed = new Set(found.filter((match) => match[1]).map((match) => match[2]!.toLowerCase()))
  return new Set(
    found
      .filter((match) => closed.has(match[2]!.toLowerCase()))
      .map((match) => match[0].replace(/\s+/g, " ")),
  )
}

export const sameTags = (source: Set<string>, translation: Set<string>) =>
  source.size === translation.size && [...source].every((tag) => translation.has(tag))
