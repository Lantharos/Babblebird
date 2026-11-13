import { env } from "cloudflare:workers"
import { type Repo, readRawBlob, type TreeEntry } from "../../github/repo.ts"
import { putOnce } from "../../lib/files.ts"

export interface AreaIcon {
  areaId: number
  name: string
  sha: string
}

const TYPES: Record<string, string> = { svg: "image/svg+xml", png: "image/png", webp: "image/webp" }

export async function storeIcon(repo: Repo, entry: TreeEntry) {
  const extension = entry.path.split(".").pop()!.toLowerCase()
  const type = TYPES[extension]
  if (!type) return null
  const name = `${entry.sha}.${extension}`
  if (!(await env.FILES.head(`icons/${name}`)))
    await putOnce(`icons/${name}`, await readRawBlob(repo, entry.sha), type)
  return name
}

export async function storeIcons(repo: Repo, icons: { areaId: number; entry: TreeEntry }[]) {
  const stored = new Map<string, string | null>()
  const named: AreaIcon[] = []
  for (const { areaId, entry } of icons) {
    if (!stored.has(entry.sha)) stored.set(entry.sha, await storeIcon(repo, entry))
    const name = stored.get(entry.sha)
    if (name) named.push({ areaId, name, sha: entry.sha })
  }
  return named
}
