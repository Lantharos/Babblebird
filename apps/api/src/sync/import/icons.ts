import { env } from "cloudflare:workers"
import { runAll } from "../../db/strings.ts"
import { type Repo, readRawBlob, type TreeEntry } from "../../github/repo.ts"
import { putOnce } from "../../lib/files.ts"

const TYPES: Record<string, string> = { svg: "image/svg+xml", png: "image/png", webp: "image/webp" }
export async function storeIcons(db: D1Database, repo: Repo, icons: { areaId: number; entry: TreeEntry }[]) {
  const updates: D1PreparedStatement[] = []
  const stored = new Set<string>()
  for (const { areaId, entry } of icons) {
    const extension = entry.path.split(".").pop()!.toLowerCase()
    const type = TYPES[extension]
    if (!type) continue
    const name = `${entry.sha}.${extension}`
    if (!stored.has(name) && !(await env.FILES.head(`icons/${name}`)))
      await putOnce(`icons/${name}`, await readRawBlob(repo, entry.sha), type)
    stored.add(name)
    updates.push(
      db.prepare("UPDATE area SET icon = ?, icon_sha = ? WHERE id = ?").bind(name, entry.sha, areaId),
    )
  }
  await runAll(db, updates)
}
