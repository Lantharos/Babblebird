import type { Db } from "../strings/db.ts"

export interface StoredScreenshot {
  name: string
  lang: string
  image: string
  width: number
  height: number
  commit: string
  strings: { key: string; pattern: string | null; box: [number, number, number, number] | null }[]
}

export function saveScreenshots(db: Db, screenshots: StoredScreenshot[]) {
  const keys = [...new Set(screenshots.flatMap((shot) => shot.strings.map((entry) => entry.key)))]
  const byKey = Map.groupBy(
    db.all<{ id: number; key: string; pattern: string }>(
      `SELECT s.id, s.key, f.pattern FROM source s JOIN file f ON f.id = s.file_id
       WHERE s.key IN (SELECT value FROM json_each(?))`,
      JSON.stringify(keys),
    ),
    (source) => source.key,
  )
  const unknown = new Set<string>()
  let linked = 0
  for (const shot of screenshots) {
    const { id } = db.one<{ id: number }>(
      `INSERT INTO screenshot (name, image, width, height, lang, commit_sha, at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (name, lang) DO UPDATE SET image = excluded.image, width = excluded.width,
         height = excluded.height, commit_sha = excluded.commit_sha, at = excluded.at RETURNING id`,
      shot.name,
      shot.image,
      shot.width,
      shot.height,
      shot.lang,
      shot.commit,
      Date.now(),
    )!
    db.run("DELETE FROM shot WHERE screenshot_id = ?", id)
    for (const entry of shot.strings) {
      const matches = (byKey.get(entry.key) ?? []).filter(
        (source) => !entry.pattern || source.pattern === entry.pattern,
      )
      if (!matches.length) unknown.add(entry.key)
      for (const source of matches) {
        db.run(
          "INSERT OR REPLACE INTO shot (source_id, screenshot_id, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?)",
          source.id,
          id,
          ...(entry.box ?? [null, null, null, null]),
        )
        linked++
      }
    }
  }
  return { linked, unknown: [...unknown] }
}
