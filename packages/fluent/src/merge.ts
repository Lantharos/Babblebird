export type Merge = { kind: "same" } | { kind: "theirs" } | { kind: "ours" } | { kind: "conflict" }

export function mergeMessage(base: string | null, ours: string | null, theirs: string | null): Merge {
  if (ours === theirs) return { kind: "same" }
  if (theirs === base) return { kind: "ours" }
  if (ours === base) return { kind: "theirs" }
  return { kind: "conflict" }
}
