import { graphql } from "../../github/api.ts"
import type { Repo } from "../../github/repo.ts"

interface Author {
  name: string | null
  user: { login: string } | null
}

interface Blame {
  ranges: { startingLine: number; endingLine: number; commit: { authors: { nodes: Author[] } } }[]
}

const FILES_PER_QUERY = 6
const MACHINES = /\[bot\]$|^weblate$|^hosted weblate$/i
const KEY_LINE = /^(-?[a-zA-Z][\w-]*)\s*=/

export const creditOf = (authors: Author[]) => {
  const names = authors
    .map((author) => author.user?.login ?? author.name ?? "")
    .filter((name) => name && !MACHINES.test(name))
  return names.length ? [...new Set(names)].join(", ") : null
}

function keyLines(text: string) {
  const lines = text.split("\n")
  const found: { key: string; start: number; end: number }[] = []
  lines.forEach((line, index) => {
    const match = KEY_LINE.exec(line)
    if (!match) return
    const previous = found.at(-1)
    if (previous) previous.end = index
    found.push({ key: match[1]!, start: index + 1, end: lines.length })
  })
  return found
}

function creditsFrom(blame: Blame, text: string) {
  const credits = new Map<string, string>()
  for (const { key, start, end } of keyLines(text)) {
    const authors = blame.ranges
      .filter((range) => range.startingLine <= end && range.endingLine >= start)
      .flatMap((range) => range.commit.authors.nodes)
    const credit = creditOf(authors)
    if (credit) credits.set(key, credit)
  }
  return credits
}

export async function blameCredits(repo: Repo, sha: string, files: { path: string; text: string }[]) {
  const credits = new Map<string, Map<string, string>>()
  for (let index = 0; index < files.length; index += FILES_PER_QUERY) {
    const batch = files.slice(index, index + FILES_PER_QUERY)
    const fields = batch
      .map(
        (file, position) =>
          `f${position}: blame(path: ${JSON.stringify(file.path)}) { ranges { startingLine endingLine commit { authors(first: 10) { nodes { name user { login } } } } } }`,
      )
      .join("\n")
    const data = await graphql<{ repository: { object: Record<string, Blame | null> | null } }>(
      repo.token,
      `query($owner: String!, $name: String!, $sha: GitObjectID!) { repository(owner: $owner, name: $name) { object(oid: $sha) { ... on Commit { ${fields} } } } }`,
      { owner: repo.owner, name: repo.name, sha },
    )
    batch.forEach((file, position) => {
      const blame = data.repository.object?.[`f${position}`]
      if (blame) credits.set(file.path, creditsFrom(blame, file.text))
    })
  }
  return credits
}
