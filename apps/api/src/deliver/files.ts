import { mergeMessage, messagesOf, patchMessages } from "@babblebird/fluent"
import { all } from "../db/strings.ts"

export interface PendingFile {
  file_id: number
  lang: string
  pattern: string
  changed: number
}

export function pendingFiles(db: D1Database, projectId: string) {
  return all<PendingFile>(
    db
      .prepare(
        "SELECT p.file_id, p.lang, f.pattern, p.changed FROM pending p JOIN file f ON f.id = p.file_id WHERE p.project_id = ?",
      )
      .bind(projectId),
  )
}

export const pathOf = (file: PendingFile) => file.pattern.replace("{lang}", file.lang)

export async function buildFile(db: D1Database, file: PendingFile, existing: string) {
  const rows = await all<{ key: string; body: string | null; base: string | null }>(
    db
      .prepare(
        `SELECT s.key, t.body, t.base FROM source s LEFT JOIN translation t ON t.source_id = s.id AND t.lang = ?2
         WHERE s.file_id = ?1 ORDER BY s.position`,
      )
      .bind(file.file_id, file.lang),
  )
  const theirs = messagesOf(existing)
  const changes = new Map<string, string>()
  for (const row of rows)
    if (row.body !== null && mergeMessage(row.base, row.body, theirs.get(row.key) ?? null).kind === "ours")
      changes.set(row.key, row.body)
  if (!changes.size) return null
  return {
    path: pathOf(file),
    content: patchMessages(
      existing,
      rows.map((row) => row.key),
      changes,
    ),
  }
}

export async function translators(db: D1Database, projectId: string, files: PendingFile[], since: number) {
  const rows = await all<{ user_id: string }>(
    db
      .prepare(
        `SELECT DISTINCT a.user_id FROM activity a WHERE a.project_id = ?1 AND a.at >= ?2 AND a.user_id IS NOT NULL
         AND a.lang IN (SELECT value FROM json_each(?3))`,
      )
      .bind(projectId, since, JSON.stringify([...new Set(files.map((file) => file.lang))])),
  )
  return rows.map((row) => row.user_id)
}
