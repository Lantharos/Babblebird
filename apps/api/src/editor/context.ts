import type { StringDetail } from "@babblebird/protocol"
import { inArray } from "drizzle-orm"
import { db as core, type ProjectRow, schema } from "../db/core.ts"
import { all, type Strings } from "../strings/client.ts"
import { memoryFor } from "../tm/lookup.ts"
import { peopleById, personOf } from "./people.ts"
import type { StringRecord } from "./queries.ts"
import { glossaryFor } from "./save.ts"

const HISTORY = 20

interface Shot {
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

async function projectSlugs(ids: string[]) {
  if (!ids.length) return new Map<string, string>()
  const rows = await core
    .select({ id: schema.project.id, slug: schema.project.slug })
    .from(schema.project)
    .where(inArray(schema.project.id, [...new Set(ids)]))
  return new Map(rows.map((row) => [row.id, row.slug]))
}

export async function contextFor(
  db: Strings,
  project: ProjectRow,
  record: StringRecord,
  lang: string,
): Promise<StringDetail> {
  const [glossary, memory, suggestions, shots, history] = await Promise.all([
    glossaryFor(db, lang, record.plain),
    memoryFor(db, project, record, lang),
    all<{ id: number; body: string; by: string; at: number; note: string | null }>(
      db
        .prepare("SELECT id, body, by, at, note FROM suggestion WHERE source_id = ? AND lang = ? ORDER BY id")
        .bind(record.id, lang),
    ),
    all<Shot>(
      db
        .prepare(
          `SELECT sc.id, sc.name, sc.image, sc.width, sc.height, sc.lang, sh.x, sh.y, sh.w, sh.h FROM shot sh
           JOIN screenshot sc ON sc.id = sh.screenshot_id WHERE sh.source_id = ?1 AND sc.lang IN (?2, ?3)`,
        )
        .bind(record.id, lang, project.sourceLang),
    ),
    all<{ id: number; kind: string; user_id: string | null; detail: string | null; at: number }>(
      db
        .prepare(
          `SELECT id, kind, user_id, detail, at FROM activity WHERE source_id = ?1 AND lang = ?2
           ORDER BY id DESC LIMIT ${HISTORY}`,
        )
        .bind(record.id, lang),
    ),
  ])
  const [people, slugs] = await Promise.all([
    peopleById([...suggestions.map((row) => row.by), ...history.map((row) => row.user_id)]),
    projectSlugs(memory.map((match) => match.projectId)),
  ])
  const translated = shots.filter((shot) => shot.lang === lang)
  return {
    glossary: glossary.map((term) => ({ ...term, lang })) as StringDetail["glossary"],
    memory: memory.map(({ projectId, ...match }) => ({ ...match, project: slugs.get(projectId) ?? "" })),
    suggestions: suggestions.map((row) => ({
      id: row.id,
      body: row.body,
      note: row.note,
      at: row.at,
      by: personOf(people, row.by, null)!,
    })),
    screenshots: (translated.length ? translated : shots).map((shot) => ({
      id: shot.id,
      name: shot.name,
      url: `/api/screenshots/${shot.image}`,
      width: shot.width,
      height: shot.height,
      box: shot.x === null ? null : { x: shot.x, y: shot.y!, w: shot.w!, h: shot.h! },
    })),
    history: history.map((row) => ({
      id: row.id,
      kind: row.kind,
      lang,
      key: record.key,
      sourceId: record.id,
      detail: row.detail,
      by: personOf(people, row.user_id, null),
      at: row.at,
    })),
    sourceChanged:
      record.t_source_hash !== null && record.t_source_hash !== record.hash ? record.previous : null,
  }
}
