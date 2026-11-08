import type { MemoryMatch } from "@babblebird/protocol"
import { STATE } from "@babblebird/protocol"
import { all } from "../db/strings.ts"
import { bandsOf, similarity } from "./minhash.ts"

interface Source {
  id: number
  plain: string
  text_hash: number
  project_id: string
}

interface Candidate {
  id: number
  plain: string
  project_id: string
  body: string
}

const CANDIDATES = 40
const SHOWN = 5
const ENOUGH = 0.55

export async function memoryFor(db: D1Database, source: Source, lang: string) {
  const exact = await all<Candidate>(
    db
      .prepare(
        `SELECT s.id, s.plain, s.project_id, t.body FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?2
         WHERE s.text_hash = ?1 AND s.id != ?3 AND (s.project_id = ?4 OR s.open = 1) AND t.state != ${STATE.review} LIMIT ${SHOWN}`,
      )
      .bind(source.text_hash, lang, source.id, source.project_id),
  )
  const bands = bandsOf(source.plain)
  const near = bands.length
    ? await all<Candidate>(
        db
          .prepare(
            `WITH near AS (SELECT source_id FROM tm_band WHERE band IN (SELECT value FROM json_each(?1)) AND source_id != ?2
               GROUP BY source_id ORDER BY count(*) DESC LIMIT ${CANDIDATES})
             SELECT s.id, s.plain, s.project_id, t.body FROM near JOIN source s ON s.id = near.source_id
             JOIN translation t ON t.source_id = s.id AND t.lang = ?3 WHERE t.state != ${STATE.review}`,
          )
          .bind(JSON.stringify(bands), source.id, lang),
      )
    : []
  const seen = new Set<string>()
  const matches: (Omit<MemoryMatch, "project"> & { projectId: string })[] = []
  for (const candidate of [...exact, ...near]) {
    if (seen.has(candidate.body)) continue
    seen.add(candidate.body)
    const score = candidate.plain === source.plain ? 1 : similarity(source.plain, candidate.plain)
    if (score >= ENOUGH)
      matches.push({
        body: candidate.body,
        source: candidate.plain,
        similarity: score,
        projectId: candidate.project_id,
      })
  }
  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, SHOWN)
}
