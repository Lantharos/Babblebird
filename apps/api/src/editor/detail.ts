import type { StringDetail } from "@babblebird/protocol"
import { inArray } from "drizzle-orm"
import { ENGLISH } from "../comments/store.ts"
import { db as core, type ProjectRow, schema } from "../db/core.ts"
import { memoryFor } from "../tm/lookup.ts"
import { peopleById, personOf } from "./people.ts"
import type { Detail } from "./store.ts"

async function projectSlugs(ids: string[]) {
  if (!ids.length) return new Map<string, string>()
  const rows = await core
    .select({ id: schema.project.id, slug: schema.project.slug })
    .from(schema.project)
    .where(inArray(schema.project.id, [...new Set(ids)]))
  return new Map(rows.map((row) => [row.id, row.slug]))
}

export async function detailView(project: ProjectRow, detail: Detail, lang: string): Promise<StringDetail> {
  const { record, glossary, own, suggestions, shots, history, discussion } = detail
  const memory = await memoryFor(project, record, lang, own)
  const [people, slugs] = await Promise.all([
    peopleById([
      ...suggestions.map((row) => row.by),
      ...history.map((row) => row.user_id),
      ...discussion.flatMap((thread) => [
        ...thread.comments.map((comment) => comment.user_id),
        thread.resolved?.by ?? null,
      ]),
    ]),
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
    discussion: discussion.map((thread) => ({
      english: thread.lang === ENGLISH,
      resolved: thread.resolved && { at: thread.resolved.at, by: personOf(people, thread.resolved.by, null) },
      comments: thread.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        at: comment.at,
        by: personOf(people, comment.user_id, null),
      })),
    })),
    sourceChanged:
      record.t_source_hash !== null && record.t_source_hash !== record.hash ? record.previous : null,
  }
}
