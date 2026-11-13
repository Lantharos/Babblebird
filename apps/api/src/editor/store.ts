import { type GlossaryTerm, type Problem, problemFlags, runChecks, termsIn } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { threadsFor } from "../comments/store.ts"
import { type AreaScope, allows } from "../projects/access.ts"
import type { Db } from "../strings/db.ts"
import { recount } from "../sync/apply/progress.ts"
import { ownCandidates } from "../tm/lookup.ts"
import { type StringRecord, stringById } from "./queries.ts"

const HISTORY = 20
const REPOSITORY_VALUE = "iif(translation.unsent, translation.base, translation.body)"

export interface Shot {
  id: number
  name: string
  image: string
  width: number
  height: number
  lang: string
  x: number | null
  y: number | null
  w: number | null
  h: number | null
}

export function glossaryFor(db: Db, lang: string, plain: string) {
  return termsIn(
    plain,
    db.all<GlossaryTerm & { id: number; lang: string }>(
      "SELECT id, lang, term, translation, note FROM glossary WHERE lang = ? AND NOT deleted",
      lang,
    ),
  )
}

export function detailOf(db: Db, id: number, lang: string, sourceLang: string) {
  const record = stringById(db, id, lang)
  if (!record) return null
  return {
    record,
    glossary: glossaryFor(db, lang, record.plain),
    own: ownCandidates(db, record, lang),
    suggestions: db.all<{ id: number; body: string; by: string; at: number; note: string | null }>(
      "SELECT id, body, by, at, note FROM suggestion WHERE source_id = ? AND lang = ? ORDER BY id",
      id,
      lang,
    ),
    shots: db.all<Shot>(
      `SELECT sc.id, sc.name, sc.image, sc.width, sc.height, sc.lang, sh.x, sh.y, sh.w, sh.h FROM shot sh
       JOIN screenshot sc ON sc.id = sh.screenshot_id WHERE sh.source_id = ?1 AND sc.lang IN (?2, ?3)`,
      id,
      lang,
      sourceLang,
    ),
    discussion: threadsFor(db, id, lang),
    history: db.all<{ id: number; kind: string; user_id: string | null; detail: string | null; at: number }>(
      `SELECT id, kind, user_id, detail, at FROM activity WHERE source_id = ? AND lang = ? ORDER BY id DESC LIMIT ${HISTORY}`,
      id,
      lang,
    ),
  }
}

export type Detail = NonNullable<ReturnType<typeof detailOf>>

export type Edit =
  | { kind: "translated" | "approved"; body: string | null }
  | { kind: "accepted"; suggestion: number }
  | { kind: "suggested"; body: string }

export interface EditInput {
  id: number
  lang: string
  userId: string
  edit: Edit
  scope: AreaScope
}

const DENIED = {
  translated: "You can suggest a translation here, but not save one",
  approved: "Only reviewers of this language can approve",
  accepted: "You can't accept suggestions here",
}

export type EditResult =
  | { status: "done"; record: StringRecord; problems: Problem[] }
  | { status: "rejected"; code: 403 | 404 | 409 | 422; error: string; problems?: Problem[] }

function check(db: Db, record: StringRecord, lang: string, body: string) {
  return runChecks(record.body, body, lang, glossaryFor(db, lang, record.plain))
}

function bodyOf(db: Db, record: StringRecord, input: EditInput): string | EditResult {
  const { edit } = input
  if (edit.kind === "accepted") {
    const suggestion = db.one<{ body: string }>(
      "SELECT body FROM suggestion WHERE id = ? AND source_id = ? AND lang = ?",
      edit.suggestion,
      record.id,
      input.lang,
    )
    return suggestion?.body ?? { status: "rejected", code: 404, error: "That suggestion is gone" }
  }
  const body = edit.body ?? record.t_body
  return body ?? { status: "rejected", code: 409, error: "There's nothing to approve yet" }
}

function writeTranslation(db: Db, record: StringRecord, input: EditInput, body: string, problems: Problem[]) {
  const now = Date.now()
  db.run(
    `INSERT INTO translation (source_id, lang, body, base, unsent, state, source_hash, flags, by, credit_id, at)
     VALUES (?1, ?2, ?3, NULL, 1, ?4, ?5, ?6, ?7, NULL, ?8)
     ON CONFLICT (source_id, lang) DO UPDATE SET
       base = iif(excluded.body IS ${REPOSITORY_VALUE}, NULL, ${REPOSITORY_VALUE}),
       unsent = excluded.body IS NOT ${REPOSITORY_VALUE},
       body = excluded.body, state = excluded.state, source_hash = excluded.source_hash,
       flags = excluded.flags, by = excluded.by, credit_id = NULL, at = excluded.at`,
    record.id,
    input.lang,
    body,
    input.edit.kind === "approved" ? STATE.approved : STATE.translated,
    record.hash,
    problemFlags(problems),
    input.userId,
    now,
  )
  db.run(
    "INSERT INTO activity (lang, source_id, user_id, kind, detail, at) VALUES (?, ?, ?, ?, ?, ?)",
    input.lang,
    record.id,
    input.userId,
    input.edit.kind,
    body,
    now,
  )
  db.run(
    `INSERT INTO pending (file_id, lang, since, changed) VALUES (?1, ?2, ?3, ?3)
     ON CONFLICT (file_id, lang) DO UPDATE SET changed = excluded.changed`,
    record.file_id,
    input.lang,
    now,
  )
  if (input.edit.kind === "accepted")
    db.run("DELETE FROM suggestion WHERE source_id = ? AND lang = ?", record.id, input.lang)
}

export function editString(db: Db, input: EditInput): EditResult {
  const record = stringById(db, input.id, input.lang)
  if (!record) return { status: "rejected", code: 404, error: "There's no such string" }
  const { kind } = input.edit
  if (kind !== "suggested" && !allows(input.scope, record.area_slug))
    return { status: "rejected", code: 403, error: DENIED[kind] }
  const body = bodyOf(db, record, input)
  if (typeof body !== "string") return body
  const problems = check(db, record, input.lang, body)
  const approving = input.edit.kind === "approved" && input.edit.body === null
  if (
    !approving &&
    input.edit.kind !== "accepted" &&
    problems.some((problem) => problem.severity === "error")
  )
    return { status: "rejected", code: 422, error: problems[0]!.text, problems }
  if (kind === "suggested")
    db.run(
      "INSERT INTO suggestion (source_id, lang, body, by, at) VALUES (?, ?, ?, ?, ?)",
      record.id,
      input.lang,
      body,
      input.userId,
      Date.now(),
    )
  else writeTranslation(db, record, input, body, problems)
  recount(db, record.area_id, [input.lang])
  return { status: "done", record: stringById(db, record.id, input.lang)!, problems }
}

export function dropSuggestion(db: Db, id: number, lang: string, suggestion: number, owner: string | null) {
  const record = stringById(db, id, lang)
  if (!record) return null
  db.run(
    `DELETE FROM suggestion WHERE id = ?1 AND source_id = ?2 AND lang = ?3 ${owner ? "AND by = ?4" : ""}`,
    suggestion,
    id,
    lang,
    ...(owner ? [owner] : []),
  )
  recount(db, record.area_id, [lang])
  return stringById(db, id, lang)!
}
