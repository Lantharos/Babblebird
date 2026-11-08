import type { LanguageProgress, Progress } from "@babblebird/protocol"
import { all } from "../db/strings.ts"

const SUMS =
  "sum(translated) translated, sum(review) review, sum(approved) approved, sum(problems) problems, sum(suggested) suggested"

export const emptyProgress = (): Progress => ({
  translated: 0,
  review: 0,
  approved: 0,
  problems: 0,
  suggested: 0,
})

export async function projectsProgress(db: D1Database, ids: string[], lang: string) {
  if (!ids.length) return new Map<string, Progress>()
  const rows = await all<Progress & { project_id: string }>(
    db
      .prepare(
        `SELECT project_id, ${SUMS} FROM progress WHERE lang = ?1
         AND project_id IN (SELECT value FROM json_each(?2)) GROUP BY project_id`,
      )
      .bind(lang, JSON.stringify(ids)),
  )
  return new Map(rows.map(({ project_id, ...progress }) => [project_id, progress]))
}

export async function languagesProgress(
  db: D1Database,
  projectId: string,
  languages: string[],
): Promise<LanguageProgress[]> {
  const rows = await all<LanguageProgress>(
    db.prepare(`SELECT lang, ${SUMS} FROM progress WHERE project_id = ? GROUP BY lang`).bind(projectId),
  )
  const byLang = new Map(rows.map((row) => [row.lang, row]))
  return languages.map((lang) => byLang.get(lang) ?? { lang, ...emptyProgress() })
}

export interface AreaProgressRow extends Progress {
  id: number
  slug: string
  name: string
  icon: string | null
  strings: number
  words: number
  lang: string | null
}

export function areasWithProgress(db: D1Database, projectId: string, lang: string | null) {
  return all<AreaProgressRow>(
    db
      .prepare(
        `SELECT a.id, a.slug, a.name, a.icon, a.strings, a.words, p.lang, p.translated, p.review, p.approved, p.problems, p.suggested
         FROM area a LEFT JOIN progress p ON p.project_id = a.project_id AND p.area_id = a.id AND p.lang = ?2
         WHERE a.project_id = ?1 ORDER BY a.position`,
      )
      .bind(projectId, lang ?? ""),
  )
}

export function allAreaProgress(db: D1Database, projectId: string) {
  return all<AreaProgressRow>(
    db
      .prepare(
        `SELECT a.id, a.slug, a.name, a.icon, a.strings, a.words, p.lang, p.translated, p.review, p.approved, p.problems, p.suggested
         FROM area a JOIN progress p ON p.project_id = a.project_id AND p.area_id = a.id
         WHERE a.project_id = ?1 ORDER BY a.position`,
      )
      .bind(projectId),
  )
}
