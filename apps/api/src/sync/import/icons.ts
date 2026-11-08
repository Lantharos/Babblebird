import { env } from "cloudflare:workers"
import { runAll } from "../../db/strings.ts"
import { type Repo, readRawBlob, type TreeEntry } from "../../github/repo.ts"

const TYPES: Record<string, string> = { svg: "image/svg+xml", png: "image/png", webp: "image/webp" }

export async function storeIcons(db: D1Database, repo: Repo, icons: { areaId: number; entry: TreeEntry }[]) {
  const updates = await Promise.all(
    icons.map(async ({ areaId, entry }) => {
      const extension = entry.path.split(".").pop()!.toLowerCase()
      const type = TYPES[extension]
      if (!type) return null
      const name = `${entry.sha}.${extension}`
      await env.FILES.put(`icons/${name}`, await readRawBlob(repo, entry.sha), {
        httpMetadata: { contentType: type },
      })
      return db.prepare("UPDATE area SET icon = ?, icon_sha = ? WHERE id = ?").bind(name, entry.sha, areaId)
    }),
  )
  await runAll(
    db,
    updates.filter((update) => update !== null),
  )
}
