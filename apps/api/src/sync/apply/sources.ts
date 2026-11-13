import { type Unit, wordCount } from "@babblebird/fluent"
import { STATE } from "@babblebird/protocol"
import type { Db } from "../../strings/db.ts"
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

const SOURCE_TABLES = ["translation", "suggestion", "shot", "comment", "resolved_thread"]

export function addBands(db: Db, sourceId: number, plain: string) {
  for (const band of bandsOf(plain)) db.run("INSERT OR IGNORE INTO tm_band VALUES (?, ?)", band, sourceId)
}

export function dropBands(db: Db, sourceId: number, plain: string) {
  for (const band of bandsOf(plain))
    db.run("DELETE FROM tm_band WHERE band = ? AND source_id = ?", band, sourceId)
}

export function removeSources(db: Db, sources: { id: number; plain: string }[]) {
  for (const source of sources) {
    for (const table of SOURCE_TABLES) db.run(`DELETE FROM ${table} WHERE source_id = ?`, source.id)
    db.run("DELETE FROM source WHERE id = ?", source.id)
    dropBands(db, source.id, source.plain)
  }
}

function contentOf(unit: Unit) {
  return [
    unit.body,
    unit.hash,
    textHash(unit.plain),
    unit.plain,
    wordCount(unit.plain),
    unit.comment,
    unit.section,
  ] as const
}

export function applySources(db: Db, fileId: number, units: Unit[]) {
  const existing = new Map(
    db
      .all<Existing>(
        "SELECT id, key, position, hash, comment, section, body, plain FROM source WHERE file_id = ?",
        fileId,
      )
      .map((row) => [row.key, row]),
  )
  const keys = new Set(units.map((unit) => unit.key))
  const leaving = Map.groupBy(
    [...existing.values()].filter((row) => !keys.has(row.key)),
    (row) => row.hash,
  )
  let changed = false
  let added = 0
  units.forEach((unit, position) => {
    const before = existing.get(unit.key)
    existing.delete(unit.key)
    const renamedFrom = before ? undefined : leaving.get(unit.hash)?.shift()
    if (renamedFrom) {
      existing.delete(renamedFrom.key)
      db.run(
        "UPDATE source SET key = ?, position = ?, comment = ?, section = ? WHERE id = ?",
        unit.key,
        position,
        unit.comment,
        unit.section,
        renamedFrom.id,
      )
      changed = true
    } else if (!before) {
      const { id } = db.one<{ id: number }>(
        `INSERT INTO source (file_id, key, position, body, hash, text_hash, plain, words, comment, section)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        fileId,
        unit.key,
        position,
        ...contentOf(unit),
      )!
      addBands(db, id, unit.plain)
      changed = true
      added++
    } else if (before.hash !== unit.hash) {
      db.run(
        `UPDATE source SET position = ?, body = ?, hash = ?, text_hash = ?, plain = ?, words = ?, comment = ?, section = ?,
           previous = ? WHERE id = ?`,
        position,
        ...contentOf(unit),
        before.body,
        before.id,
      )
      db.run(
        `UPDATE translation SET state = ${STATE.review} WHERE source_id = ? AND state != ${STATE.review}`,
        before.id,
      )
      dropBands(db, before.id, before.plain)
      addBands(db, before.id, unit.plain)
      changed = true
    } else if (
      before.position !== position ||
      before.comment !== unit.comment ||
      before.section !== unit.section
    )
      db.run(
        "UPDATE source SET position = ?, comment = ?, section = ? WHERE id = ?",
        position,
        unit.comment,
        unit.section,
        before.id,
      )
  })
  removeSources(db, [...existing.values()])
  return { changed: changed || existing.size > 0, added }
}
