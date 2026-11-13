import type { MemoryMatch } from "@babblebird/protocol"
import { STATE } from "@babblebird/protocol"
import type { ProjectRow } from "../db/core.ts"
import { all, type Strings } from "../strings/client.ts"
import { type Candidate, memoryOf } from "./memory.ts"
import { bandsOf, similarity } from "./minhash.ts"

interface Source {
  id: number
  plain: string
  text_hash: number
}

const CANDIDATES = 40
const SHOWN = 5
const ENOUGH = 0.55

async function ownCandidates(strings: Strings, source: Source, lang: string, bands: number[]) {
  const [exact, near] = await Promise.all([
    all<Omit<Candidate, "project_id">>(
      strings
        .prepare(
          `SELECT s.plain, t.body FROM source s JOIN translation t ON t.source_id = s.id AND t.lang = ?2
           WHERE s.text_hash = ?1 AND s.id != ?3 AND t.state != ${STATE.review} LIMIT ${SHOWN}`,
        )
        .bind(source.text_hash, lang, source.id),
    ),
    bands.length
      ? all<Omit<Candidate, "project_id">>(
          strings
            .prepare(
              `WITH near AS (SELECT source_id FROM tm_band WHERE band IN (SELECT value FROM json_each(?1)) AND source_id != ?2
                 GROUP BY source_id ORDER BY count(*) DESC LIMIT ${CANDIDATES})
               SELECT s.plain, t.body FROM near JOIN source s ON s.id = near.source_id
               JOIN translation t ON t.source_id = s.id AND t.lang = ?3 WHERE t.state != ${STATE.review}`,
            )
            .bind(JSON.stringify(bands), source.id, lang),
        )
      : [],
  ])
  return [...exact, ...near]
}

export async function memoryFor(strings: Strings, project: ProjectRow, source: Source, lang: string) {
  const bands = bandsOf(source.plain)
  const [own, shared] = await Promise.all([
    ownCandidates(strings, source, lang, bands),
    memoryOf(project.sourceLang, lang).lookup(project.id, source.text_hash, bands, {
      exact: SHOWN,
      near: CANDIDATES,
    }),
  ])
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
