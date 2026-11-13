import {
  applyTransform,
  type GeneratedLanguage,
  mergeMessage,
  messagesOf,
  patchMessages,
} from "@babblebird/fluent"
import type { Db } from "../strings/db.ts"
import { REPOSITORY_VALUE } from "../sync/apply/translations.ts"

export interface PendingFile {
  file_id: number
  lang: string
  pattern: string
  since: number
  changed: number
}

export function pendingFiles(db: Db) {
  return db.all<PendingFile>(
    "SELECT p.file_id, p.lang, f.pattern, p.since, p.changed FROM pending p JOIN file f ON f.id = p.file_id",
  )
}

export const pathOf = (file: PendingFile) => file.pattern.replace("{lang}", file.lang)

export function buildFile(db: Db, file: PendingFile, existing: string) {
  const rows = db.all<{ key: string; body: string | null; base: string | null }>(
    `SELECT s.key, t.body, ${REPOSITORY_VALUE} base FROM source s LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2
     WHERE s.file_id = ?1 ORDER BY s.position`,
    file.file_id,
    file.lang,
  )
  const theirs = messagesOf(existing)
  const changes = new Map<string, string>()
  for (const row of rows)
    if (row.body !== null && mergeMessage(row.base, row.body, theirs.get(row.key) ?? null).kind === "ours")
      changes.set(row.key, row.body)
  if (!changes.size) return null
  return {
    pattern: file.pattern,
    lang: file.lang,
    path: pathOf(file),
    content: patchMessages(
      existing,
      rows.map((row) => row.key),
      changes,
    ),
  }
}

export type BuiltFile = NonNullable<Awaited<ReturnType<typeof buildFile>>>

export function withGenerated(built: BuiltFile[], generated: GeneratedLanguage[]) {
  return built.flatMap((file) => [
    file,
    ...generated
      .filter((language) => language.from === file.lang)
      .map((language) => ({
        pattern: file.pattern,
        lang: language.lang,
        path: file.pattern.replace("{lang}", language.lang),
        content: applyTransform(language.transform, file.content),
      })),
  ])
}

export function translators(db: Db, files: PendingFile[], since: number) {
  return db
    .all<{ user_id: string }>(
      `SELECT DISTINCT a.user_id FROM activity a WHERE a.at >= ?1 AND a.user_id IS NOT NULL
       AND a.lang IN (SELECT value FROM json_each(?2))`,
      since,
      JSON.stringify([...new Set(files.map((file) => file.lang))]),
    )
    .map((row) => row.user_id)
}
