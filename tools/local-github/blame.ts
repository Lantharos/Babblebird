import type { Git } from "./git.ts"

const COAUTHOR = /^Co-authored-by:\s*(.+?)\s*<([^>]*)>\s*$/gim
const NOREPLY = /^\d+\+([^@]+)@users\.noreply\.github\.com$/

const authorOf = (name: string, email: string) => ({
  name,
  user: NOREPLY.test(email) ? { login: NOREPLY.exec(email)![1] } : null,
})

export function blame(git: Git, sha: string, path: string) {
  const lines = git.text(["blame", "--porcelain", sha, "--", path]).split("\n")
  const authors = new Map<string, { name: string; user: { login: string } | null }[]>()
  const owners: string[] = []
  let current = ""
  let name = ""
  for (const line of lines) {
    const header = /^([0-9a-f]{40}) \d+ (\d+)/.exec(line)
    if (header) current = header[1]!
    else if (line.startsWith("author ")) name = line.slice(7)
    else if (line.startsWith("author-mail ") && !authors.has(current)) {
      const message = git.text(["log", "-1", "--format=%B", current])
      authors.set(current, [
        authorOf(name, line.slice(13, -1)),
        ...[...message.matchAll(COAUTHOR)].map((match) => authorOf(match[1]!, match[2]!)),
      ])
    } else if (line.startsWith("\t")) owners.push(current)
  }
  const ranges: { startingLine: number; endingLine: number; commit: { authors: { nodes: unknown[] } } }[] = []
  owners.forEach((commit, index) => {
    const last = ranges.at(-1)
    if (last && owners[index - 1] === commit) last.endingLine = index + 1
    else
      ranges.push({
        startingLine: index + 1,
        endingLine: index + 1,
        commit: { authors: { nodes: authors.get(commit) ?? [] } },
      })
  })
  return { ranges }
}
