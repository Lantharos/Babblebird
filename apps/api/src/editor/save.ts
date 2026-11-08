import { type GlossaryTerm, type Problem, problemFlags, runChecks, termsIn } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { sql } from "drizzle-orm"
import { db as core, type ProjectRow } from "../db/core.ts"
import { all, runAll } from "../db/strings.ts"
import { recountArea } from "../sync/apply/progress.ts"
import type { StringRecord } from "./queries.ts"

export async function glossaryFor(db: D1Database, projectId: string, lang: string, plain: string) {
  const terms = await all<GlossaryTerm & { id: number; lang: string }>(
    db
      .prepare("SELECT id, lang, term, translation, note FROM glossary WHERE project_id = ? AND lang = ?")
      .bind(projectId, lang),
  )
  return termsIn(plain, terms)
}

export interface SaveInput {
  project: ProjectRow
  record: StringRecord
  lang: string
  body: string
  state: (typeof STATE)[keyof typeof STATE]
  userId: string
  kind: string
}

export async function checkTranslation(
  db: D1Database,
  input: Pick<SaveInput, "project" | "record" | "lang" | "body">,
) {
  const glossary = await glossaryFor(db, input.project.id, input.lang, input.record.plain)
  return runChecks(input.record.body, input.body, input.lang, glossary)
}

export async function saveTranslation(db: D1Database, input: SaveInput, problems: Problem[]) {
  const { project, record, lang, body, state, userId } = input
  const now = Date.now()
  await runAll(db, [
    db
      .prepare(
        `INSERT INTO translation (source_id, lang, body, state, source_hash, flags, by, credit, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8)
         ON CONFLICT (source_id, lang) DO UPDATE SET body = excluded.body, state = excluded.state, source_hash = excluded.source_hash,
           flags = excluded.flags, by = excluded.by, credit = NULL, at = excluded.at`,
      )
      .bind(record.id, lang, body, state, record.hash, problemFlags(problems), userId, now),
    db
      .prepare(
        "INSERT INTO activity (project_id, lang, source_id, user_id, kind, detail, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(project.id, lang, record.id, userId, input.kind, body, now),
    db
      .prepare(
        `INSERT INTO pending (project_id, file_id, lang, since, changed) VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT (project_id, file_id, lang) DO UPDATE SET changed = excluded.changed`,
      )
      .bind(project.id, record.file_id, lang, now),
  ])
  await recountArea(db, project.id, record.area_id, [lang])
}

export const stateFor = (approve: boolean) => (approve ? STATE.approved : STATE.translated)

export async function rememberLanguage(userId: string, lang: string) {
  await core.run(
    sql`UPDATE user SET languages = json_insert(languages, '$[#]', ${lang})
        WHERE id = ${userId} AND NOT EXISTS (SELECT 1 FROM json_each(user.languages) WHERE value = ${lang})`,
  )
}
