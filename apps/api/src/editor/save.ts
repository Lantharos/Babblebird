import { type GlossaryTerm, type Problem, problemFlags, runChecks, termsIn } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { sql } from "drizzle-orm"
import { db as core, type ProjectRow, schema } from "../db/core.ts"
import { all, type Statement, type Strings } from "../strings/client.ts"
import { publishTotals, recountStatements } from "../sync/apply/progress.ts"
import type { StringRecord } from "./queries.ts"

const REPOSITORY_VALUE = "iif(translation.unsent, translation.base, translation.body)"

export async function glossaryFor(db: Strings, lang: string, plain: string) {
  const terms = await all<GlossaryTerm & { id: number; lang: string }>(
    db.prepare("SELECT id, lang, term, translation, note FROM glossary WHERE lang = ?").bind(lang),
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

export async function checkTranslation(db: Strings, input: Pick<SaveInput, "record" | "lang" | "body">) {
  const glossary = await glossaryFor(db, input.lang, input.record.plain)
  return runChecks(input.record.body, input.body, input.lang, glossary)
}

export async function saveTranslation(
  db: Strings,
  input: SaveInput,
  problems: Problem[],
  before: Statement[] = [],
) {
  const { project, record, lang, body, state, userId } = input
  const now = Date.now()
  await publishTotals(db, project.id, [
    ...before,
    db
      .prepare(
        `INSERT INTO translation (source_id, lang, body, base, unsent, state, source_hash, flags, by, credit_id, at)
         VALUES (?1, ?2, ?3, NULL, 1, ?4, ?5, ?6, ?7, NULL, ?8)
         ON CONFLICT (source_id, lang) DO UPDATE SET
           base = iif(excluded.body IS ${REPOSITORY_VALUE}, NULL, ${REPOSITORY_VALUE}),
           unsent = excluded.body IS NOT ${REPOSITORY_VALUE},
           body = excluded.body, state = excluded.state, source_hash = excluded.source_hash,
           flags = excluded.flags, by = excluded.by, credit_id = NULL, at = excluded.at`,
      )
      .bind(record.id, lang, body, state, record.hash, problemFlags(problems), userId, now),
    db
      .prepare("INSERT INTO activity (lang, source_id, user_id, kind, detail, at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(lang, record.id, userId, input.kind, body, now),
    db
      .prepare(
        `INSERT INTO pending (file_id, lang, since, changed) VALUES (?1, ?2, ?3, ?3)
         ON CONFLICT (file_id, lang) DO UPDATE SET changed = excluded.changed`,
      )
      .bind(record.file_id, lang, now),
    ...recountStatements(db, record.area_id, [lang]),
  ])
  await noteContribution(userId, project.id, 1)
}

export async function noteContribution(userId: string, projectId: string, edits: number) {
  const now = Date.now()
  await core
    .insert(schema.contribution)
    .values({ userId, projectId, edits, lastAt: now })
    .onConflictDoUpdate({
      target: [schema.contribution.userId, schema.contribution.projectId],
      set: { edits: sql`${schema.contribution.edits} + ${edits}`, lastAt: now },
    })
}

export const stateFor = (approve: boolean) => (approve ? STATE.approved : STATE.translated)

export async function rememberLanguage(userId: string, lang: string) {
  await core.run(
    sql`UPDATE user SET languages = json_insert(languages, '$[#]', ${lang})
        WHERE id = ${userId} AND NOT EXISTS (SELECT 1 FROM json_each(user.languages) WHERE value = ${lang})`,
  )
}
