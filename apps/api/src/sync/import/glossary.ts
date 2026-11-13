import { type Repo, readBlobs, type TreeEntry } from "../../github/repo.ts"
import { all, eachRow, first, runAll, type Strings } from "../../strings/client.ts"
import type { Config } from "../layout/config.ts"
import { globPattern } from "../layout/glob.ts"
import { readTbx } from "./tbx.ts"

const GLOSSARY_FILE = /^(?:(.*)\/)?glossary\/([^/]+)\.tbx$/

export function glossaryPattern(tree: TreeEntry[], config: Config) {
  if (config.glossary) return config.glossary
  const counts = new Map<string, number>()
  for (const entry of tree) {
    const match = GLOSSARY_FILE.exec(entry.path)
    if (match) {
      const pattern = `${match[1] ? `${match[1]}/` : ""}glossary/{lang}.tbx`
      counts.set(pattern, (counts.get(pattern) ?? 0) + 1)
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

export async function importGlossaries(db: Strings, repo: Repo, tree: TreeEntry[], config: Config) {
  const pattern = glossaryPattern(tree, config)
  if (!pattern) return
  const matcher = globPattern(pattern.replace("{lang}", "*"))
  const prefix = pattern.slice(0, pattern.indexOf("{lang}"))
  const suffix = pattern.slice(pattern.indexOf("{lang}") + "{lang}".length)
  const file = await first<{ id: number }>(
    db
      .prepare(
        `INSERT INTO file (area_id, pattern, position) VALUES (0, ?, 0)
         ON CONFLICT (pattern) DO UPDATE SET area_id = 0 RETURNING id`,
      )
      .bind(pattern),
  )
  const fileId = file!.id
  const known = new Map(
    (
      await all<{ lang: string; sha: string }>(
        db.prepare("SELECT lang, sha FROM blob WHERE file_id = ?").bind(fileId),
      )
    ).map((row) => [row.lang, row.sha]),
  )
  const changed = tree
    .filter((entry) => matcher.test(entry.path))
    .map((entry) => ({ entry, lang: entry.path.slice(prefix.length, entry.path.length - suffix.length) }))
    .filter(({ entry, lang }) => known.get(lang) !== entry.sha)
  if (!changed.length) return
  const texts = await readBlobs(
    repo,
    changed.map(({ entry }) => entry),
  )
  const statements = changed.flatMap(({ entry, lang }) => {
    const terms = readTbx(texts.get(entry.sha)!, config.source, lang)
    return [
      db.prepare("DELETE FROM glossary WHERE lang = ?").bind(lang),
      ...eachRow(
        db,
        `INSERT OR REPLACE INTO glossary (lang, term, translation, note)
         SELECT ?1, j.value->>0, j.value->>1, j.value->>2 FROM json_each(?2) j`,
        terms.map((term) => [term.term, term.translation, term.note]),
        lang,
      ),
      db
        .prepare(
          "INSERT INTO blob (file_id, lang, sha) VALUES (?, ?, ?) ON CONFLICT (file_id, lang) DO UPDATE SET sha = excluded.sha",
        )
        .bind(fileId, lang, entry.sha),
    ]
  })
  await runAll(db, statements)
}
