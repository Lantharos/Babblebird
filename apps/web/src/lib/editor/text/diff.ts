export interface DiffPart {
  text: string
  kind: "same" | "added" | "removed"
}

const tokens = (text: string) => text.split(/(\s+)/).filter(Boolean)

export function wordDiff(before: string, after: string): DiffPart[] {
  const a = tokens(before)
  const b = tokens(after)
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lengths[i]![j] =
        a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
  const parts: DiffPart[] = []
  const push = (text: string, kind: DiffPart["kind"]) => {
    const last = parts.at(-1)
    if (last?.kind === kind) last.text += text
    else parts.push({ text, kind })
  }
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push(a[i++]!, "same")
      j++
    } else if (i < a.length && (j === b.length || lengths[i + 1]![j]! >= lengths[i]![j + 1]!))
      push(a[i++]!, "removed")
    else push(b[j++]!, "added")
  }
  return parts
}
