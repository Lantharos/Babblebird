import type { MemoryMatch } from "@babblebird/protocol"
import { STATE } from "@babblebird/protocol"
import type { ProjectRow } from "../db/core.ts"
import type { Db } from "../strings/db.ts"
import { memoryOf } from "./memory.ts"
import { bandsOf, similarity } from "./minhash.ts"

export interface MemorySource {
  id: number
  plain: string
  text_hash: number
}

export interface OwnCandidate {
  plain: string
  body: string
}

const CANDIDATES = 40
const SHOWN = 5
const ENOUGH = 0.55

export function ownCandidates(db: Db, source: MemorySource, lang: string) {
  const bands = bandsOf(source.plain)
  const exact = db.all<OwnCandidate>(
    `SELECT s.plain, t.body FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?2
     WHERE s.text_hash = ?1 AND s.id != ?3 AND t.state != ${STATE.review} LIMIT ${SHOWN}`,
    source.text_hash,
    lang,
    source.id,
  )
  const near = bands.length
    ? db.all<OwnCandidate>(
        `WITH near AS (SELECT source_id FROM tm_band WHERE band IN (SELECT value FROM json_each(?1)) AND source_id != ?2
           GROUP BY source_id ORDER BY count(*) DESC LIMIT ${CANDIDATES})
         SELECT s.plain, t.body FROM near JOIN source s ON s.id = near.source_id
         JOIN translation t ON t.source_id = s.id AND t.lang = ?3 WHERE t.state != ${STATE.review}`,
        JSON.stringify(bands),
        source.id,
        lang,
      )
    : []
  return [...exact, ...near]
}

export async function memoryFor(
  project: ProjectRow,
  source: MemorySource,
  lang: string,
  own: OwnCandidate[],
) {
  const shared = await memoryOf(project.sourceLang, lang).lookup(
    project.id,
    source.text_hash,
    bandsOf(source.plain),
    {
      exact: SHOWN,
      near: CANDIDATES,
    },
  )
  const seen = new Set<string>()
  const matches: (Omit<MemoryMatch, "project"> & { projectId: string })[] = []
  for (const candidate of [...own.map((row) => ({ ...row, project_id: project.id })), ...shared]) {
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
