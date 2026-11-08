import { github, graphql } from "./api.ts"

export interface Repo {
  owner: string
  name: string
  token: string
}

export interface TreeEntry {
  path: string
  sha: string
  size: number
}

interface TreeResponse {
  truncated: boolean
  tree: { path: string; type: string; sha: string; size?: number }[]
}

export async function readTree(repo: Repo, sha: string): Promise<TreeEntry[]> {
  const tree = await github<TreeResponse>(`/repos/${repo.owner}/${repo.name}/git/trees/${sha}?recursive=1`, {
    token: repo.token,
  })
  if (tree.truncated) throw new Error("The repository has too many files to read in one go")
  return tree.tree
    .filter((entry) => entry.type === "blob")
    .map((entry) => ({ path: entry.path, sha: entry.sha, size: entry.size ?? 0 }))
}

const BLOBS_PER_QUERY = 100
const BYTES_PER_QUERY = 3_000_000

function batches(blobs: TreeEntry[]) {
  const found: TreeEntry[][] = []
  let current: TreeEntry[] = []
  let bytes = 0
  for (const blob of blobs) {
    if (current.length && (current.length === BLOBS_PER_QUERY || bytes + blob.size > BYTES_PER_QUERY)) {
      found.push(current)
      current = []
      bytes = 0
    }
    current.push(blob)
    bytes += blob.size
  }
  if (current.length) found.push(current)
  return found
}

type BlobResult = Record<string, { text: string | null; isTruncated: boolean } | null>

const rawText = async (repo: Repo, sha: string) => new TextDecoder().decode(await readRawBlob(repo, sha))

export async function readBlobs(repo: Repo, blobs: TreeEntry[]) {
  const texts = new Map<string, string>()
  const unique = [...new Map(blobs.map((blob) => [blob.sha, blob])).values()]
  for (const batch of batches(unique)) {
    const fields = batch
      .map((blob, index) => `b${index}: object(oid: "${blob.sha}") { ... on Blob { text isTruncated } }`)
      .join("\n")
    const data = await graphql<{ repository: BlobResult }>(
      repo.token,
      `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`,
      { owner: repo.owner, name: repo.name },
    )
    await Promise.all(
      batch.map(async (blob, index) => {
        const found = data.repository[`b${index}`]
        texts.set(
          blob.sha,
          found?.text != null && !found.isTruncated ? found.text : await rawText(repo, blob.sha),
        )
      }),
    )
  }
  return texts
}

export async function readRawBlob(repo: Repo, sha: string) {
  return github<ArrayBuffer>(`/repos/${repo.owner}/${repo.name}/git/blobs/${sha}`, {
    token: repo.token,
    accept: "application/vnd.github.raw+json",
  })
}

export async function readPaths(repo: Repo, sha: string, paths: string[]) {
  const texts = new Map<string, string>()
  for (let index = 0; index < paths.length; index += BLOBS_PER_QUERY) {
    const batch = paths.slice(index, index + BLOBS_PER_QUERY)
    const fields = batch
      .map(
        (path, position) =>
          `b${position}: object(expression: ${JSON.stringify(`${sha}:${path}`)}) { ... on Blob { text } }`,
      )
      .join("\n")
    const data = await graphql<{ repository: BlobResult }>(
      repo.token,
      `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${fields} } }`,
      { owner: repo.owner, name: repo.name },
    )
    for (const [position, path] of batch.entries())
      texts.set(path, data.repository[`b${position}`]?.text ?? "")
  }
  return texts
}
