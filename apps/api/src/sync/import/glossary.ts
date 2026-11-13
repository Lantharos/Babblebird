import type { GlossaryTerm } from "@babblebird/fluent"
import { type Repo, readBlobs, type TreeEntry } from "../../github/repo.ts"
import type { Db } from "../../strings/db.ts"
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

export interface GlossaryFile {
  fileId: number
  known: Map<string, string>
}

export interface GlossaryEntry {
  lang: string
  sha: string
  terms: GlossaryTerm[]
}

export function glossaryFile(db: Db, pattern: string): GlossaryFile {
  const { id } = db.one<{ id: number }>(
    "INSERT INTO file (area_id, pattern, position) VALUES (0, ?, 0) ON CONFLICT (pattern) DO UPDATE SET area_id = 0 RETURNING id",
    pattern,
  )!
  return {
    fileId: id,
    known: new Map(db.rows<[string, string]>("SELECT lang, sha FROM blob WHERE file_id = ?", id)),
  }
}

export async function changedGlossaries(
  repo: Repo,
  tree: TreeEntry[],
  pattern: string,
  file: GlossaryFile,
  sourceLang: string,
): Promise<GlossaryEntry[]> {
  const matcher = globPattern(pattern.replace("{lang}", "*"))
  const prefix = pattern.slice(0, pattern.indexOf("{lang}"))
  const suffix = pattern.slice(pattern.indexOf("{lang}") + "{lang}".length)
  const changed = tree
    .filter((entry) => matcher.test(entry.path))
    .map((entry) => ({ entry, lang: entry.path.slice(prefix.length, entry.path.length - suffix.length) }))
    .filter(({ entry, lang }) => file.known.get(lang) !== entry.sha)
  if (!changed.length) return []
  const texts = await readBlobs(
    repo,
    changed.map(({ entry }) => entry),
  )
  return changed.map(({ entry, lang }) => ({
    lang,
    sha: entry.sha,
    terms: readTbx(texts.get(entry.sha)!, sourceLang, lang),
  }))
}

export function replaceGlossaries(db: Db, fileId: number, entries: GlossaryEntry[]) {
  for (const { lang, sha, terms } of entries) {
    db.run("DELETE FROM glossary WHERE lang = ?", lang)
    db.each(
      "INSERT OR REPLACE INTO glossary (lang, term, translation, note) VALUES (?, ?, ?, ?)",
      terms.map((term) => [lang, term.term, term.translation, term.note]),
    )
    db.run(
      "INSERT INTO blob (file_id, lang, sha) VALUES (?, ?, ?) ON CONFLICT (file_id, lang) DO UPDATE SET sha = excluded.sha",
      fileId,
      lang,
      sha,
    )
  }
}
