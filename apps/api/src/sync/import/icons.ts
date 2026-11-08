import { env } from "cloudflare:workers"
import { runAll } from "../../db/strings.ts"
import { type Repo, readRawBlob, type TreeEntry } from "../../github/repo.ts"
import { putOnce } from "../../lib/files.ts"

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

export async function storeIcons(db: D1Database, repo: Repo, icons: { areaId: number; entry: TreeEntry }[]) {
  const stored = new Map<string, string | null>()
  const updates: D1PreparedStatement[] = []
  for (const { areaId, entry } of icons) {
    if (!stored.has(entry.sha)) stored.set(entry.sha, await storeIcon(repo, entry))
    const name = stored.get(entry.sha)
    if (name)
      updates.push(
        db.prepare("UPDATE area SET icon = ?, icon_sha = ? WHERE id = ?").bind(name, entry.sha, areaId),
      )
  }
  await runAll(db, updates)
}
