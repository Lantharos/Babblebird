import type { LanguageProgress, Progress } from "@babblebird/protocol"
import type { ProjectRow } from "../db/core.ts"
import { query } from "../strings/client.ts"

export const emptyProgress = (): Progress => ({
  translated: 0,
  review: 0,
  approved: 0,
  problems: 0,
  suggested: 0,
})

export const languagesProgress = (
  project: Pick<ProjectRow, "progress">,
  languages: string[],
): LanguageProgress[] => languages.map((lang) => ({ lang, ...(project.progress[lang] ?? emptyProgress()) }))

export interface AreaProgressRow extends Progress {
  id: number
  slug: string
  name: string
  icon: string | null
  strings: number
  words: number
  lang: string | null
}

const AREA_COLUMNS =
  "a.id, a.slug, a.name, a.icon, a.strings, a.words, p.lang, p.translated, p.review, p.approved, p.problems, p.suggested"

export function areasWithProgress(project: { id: string }, lang: string | null) {
  return query<AreaProgressRow>(
    project,
    `SELECT ${AREA_COLUMNS} FROM area a LEFT JOIN progress p ON p.area_id = a.id AND p.lang = ?1 ORDER BY a.position`,
    lang ?? "",
  )
}

export function allAreaProgress(project: { id: string }) {
  return query<AreaProgressRow>(
    project,
    `SELECT ${AREA_COLUMNS} FROM area a JOIN progress p ON p.area_id = a.id ORDER BY a.position`,
  )
}
