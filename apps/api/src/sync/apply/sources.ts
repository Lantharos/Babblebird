import { type Unit, wordCount } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import { all, eachRow, runAll } from "../../db/strings.ts"
import { bandsOf, textHash } from "../../tm/minhash.ts"

interface Existing {
  id: number
  key: string
  position: number
  hash: number
  comment: string | null
  section: string | null
  body: string
  plain: string
}

export async function applySources(
  db: D1Database,
  projectId: string,
  open: boolean,
  fileId: number,
  units: Unit[],
) {
  const existing = new Map(
    (
      await all<Existing>(
        db
          .prepare(
            "SELECT id, key, position, hash, comment, section, body, plain FROM source WHERE file_id = ?",
          )
          .bind(fileId),
      )
    ).map((row) => [row.key, row]),
  )
  const added: unknown[][] = []
  const edited: unknown[][] = []
  const moved: unknown[][] = []
  const bands: [string | number, number][] = []
  const oldBands: unknown[][] = []
  const forget = (row: Existing) => {
    if (open) for (const band of bandsOf(row.plain)) oldBands.push([band, row.id])
  }
  const stale: number[] = []
  units.forEach((unit, position) => {
    const before = existing.get(unit.key)
    existing.delete(unit.key)
    const row = [
      unit.body,
      unit.hash,
      textHash(unit.plain),
      unit.plain,
      wordCount(unit.plain),
      unit.comment,
      unit.section,
    ]
    if (!before) {
      added.push([unit.key, position, ...row])
      if (open) for (const band of bandsOf(unit.plain)) bands.push([unit.key, band])
    } else if (before.hash !== unit.hash) {
      edited.push([before.id, position, ...row, before.body])
      stale.push(before.id)
      forget(before)
      if (open) for (const band of bandsOf(unit.plain)) bands.push([before.id, band])
    } else if (
      before.position !== position ||
      before.comment !== unit.comment ||
      before.section !== unit.section
    )
      moved.push([before.id, position, unit.comment, unit.section])
  })
  for (const row of existing.values()) forget(row)
  const removed = [...existing.values()].map((row) => [row.id])
  const insertedIds = new Map<string, number>()
  for (const statement of eachRow(
    db,
    `INSERT INTO source (project_id, file_id, open, key, position, body, hash, text_hash, plain, words, comment, section)
     SELECT ?1, ?2, ?3, j.value->>0, j.value->>1, j.value->>2, j.value->>3, j.value->>4, j.value->>5, j.value->>6, j.value->>7, j.value->>8
     FROM json_each(?4) j RETURNING id, key`,
    added,
    projectId,
    fileId,
    open ? 1 : 0,
  ))
    for (const row of await all<{ id: number; key: string }>(statement)) insertedIds.set(row.key, row.id)
  await runAll(db, [
    ...eachRow(
      db,
      `UPDATE source SET position = j.value->>1, body = j.value->>2, hash = j.value->>3, text_hash = j.value->>4,
         plain = j.value->>5, words = j.value->>6, comment = j.value->>7, section = j.value->>8, previous = j.value->>9
       FROM json_each(?1) j WHERE source.id = j.value->>0`,
      edited,
    ),
    ...eachRow(
      db,
      `UPDATE source SET position = j.value->>1, comment = j.value->>2, section = j.value->>3
       FROM json_each(?1) j WHERE source.id = j.value->>0`,
      moved,
    ),
    ...eachRow(
      db,
      `UPDATE translation SET state = ${STATE.review}
       WHERE source_id IN (SELECT j.value->>0 FROM json_each(?1) j) AND state != ${STATE.review}`,
      stale.map((id) => [id]),
    ),
    ...["translation", "suggestion", "shot"].flatMap((table) =>
      eachRow(
        db,
        `DELETE FROM ${table} WHERE source_id IN (SELECT j.value->>0 FROM json_each(?1) j)`,
        removed,
      ),
    ),
    ...eachRow(db, "DELETE FROM source WHERE id IN (SELECT j.value->>0 FROM json_each(?1) j)", removed),
    ...eachRow(
      db,
      "DELETE FROM tm_band WHERE (band, source_id) IN (SELECT j.value->>0, j.value->>1 FROM json_each(?1) j)",
      oldBands,
    ),
    ...eachRow(
      db,
      "INSERT OR IGNORE INTO tm_band (band, source_id) SELECT j.value->>0, j.value->>1 FROM json_each(?1) j",
      bands.map(([source, band]) => [band, typeof source === "number" ? source : insertedIds.get(source)]),
    ),
  ])
  return added.length + edited.length + removed.length > 0
}
