import type { TreeEntry } from "../../github/repo.ts"
import { all, eachRow, first, runAll, type Statement, type Strings } from "../../strings/client.ts"
import { bandsOf } from "../../tm/minhash.ts"
import type { DetectedArea } from "./detect.ts"

interface AreaRow {
  id: number
  slug: string
  name: string
  icon_sha: string | null
  position: number
}

interface FileRow {
  id: number
  pattern: string
  area_id: number
  position: number
}

export interface SavedLayout {
  areas: Map<string, number>
  files: Map<string, number>
  present: Set<string>
  icons: { areaId: number; entry: TreeEntry }[]
  recount: Set<number>
}

const SOURCE_TABLES = ["translation", "suggestion", "shot"]

async function removeFiles(db: Strings, ids: number[]) {
  const rows = ids.map((id) => [id])
  if (!rows.length) return []
  const sources = await all<{ id: number; plain: string }>(
    db
      .prepare("SELECT id, plain FROM source WHERE file_id IN (SELECT value FROM json_each(?))")
      .bind(JSON.stringify(ids)),
  )
  const bands = sources.flatMap((source) => bandsOf(source.plain).map((band) => [band, source.id]))
  return [
    ...eachRow(
      db,
      "DELETE FROM tm_band WHERE (band, source_id) IN (SELECT j.value->>0, j.value->>1 FROM json_each(?1) j)",
      bands,
    ),
    ...SOURCE_TABLES.flatMap((table) =>
      eachRow(
        db,
        `DELETE FROM ${table} WHERE source_id IN (SELECT s.id FROM source s JOIN json_each(?1) j ON s.file_id = j.value->>0)`,
        rows,
      ),
    ),
    ...["source", "blob", "pending"].flatMap((table) =>
      eachRow(db, `DELETE FROM ${table} WHERE file_id IN (SELECT j.value->>0 FROM json_each(?1) j)`, rows),
    ),
    ...eachRow(db, "DELETE FROM file WHERE id IN (SELECT j.value->>0 FROM json_each(?1) j)", rows),
  ]
}

async function movedFiles(db: Strings, rows: FileRow[], detected: DetectedArea[], sourceLang: string) {
  const patterns = new Set(rows.map((row) => row.pattern))
  const arriving = detected.flatMap((area) => area.files).filter((file) => !patterns.has(file.pattern))
  const leaving = rows.filter(
    (row) => !detected.some((area) => area.files.some((file) => file.pattern === row.pattern)),
  )
  if (!arriving.length || !leaving.length) return new Map<string, FileRow>()
  const shas = await all<{ file_id: number; sha: string }>(
    db
      .prepare(
        "SELECT file_id, sha FROM blob WHERE lang = ?1 AND file_id IN (SELECT value FROM json_each(?2))",
      )
      .bind(sourceLang, JSON.stringify(leaving.map((row) => row.id))),
  )
  const bySha = new Map(shas.map((row) => [row.sha, leaving.find((file) => file.id === row.file_id)!]))
  const moves = new Map<string, FileRow>()
  for (const file of arriving) {
    const from = bySha.get(file.langs.get(sourceLang)?.sha ?? "")
    if (from) {
      moves.set(file.pattern, from)
      bySha.delete(file.langs.get(sourceLang)!.sha)
    }
  }
  return moves
}

export async function saveLayout(
  db: Strings,
  detected: DetectedArea[],
  sourceLang: string,
): Promise<SavedLayout> {
  const areaRows = new Map(
    (await all<AreaRow>(db.prepare("SELECT id, slug, name, icon_sha, position FROM area"))).map((row) => [
      row.slug,
      row,
    ]),
  )
  const fileRows = new Map(
    (await all<FileRow>(db.prepare("SELECT id, pattern, area_id, position FROM file WHERE area_id > 0"))).map(
      (row) => [row.pattern, row],
    ),
  )
  const updates: Statement[] = []
  const moves = await movedFiles(db, [...fileRows.values()], detected, sourceLang)
  for (const [pattern, from] of moves) {
    fileRows.delete(from.pattern)
    updates.push(db.prepare("UPDATE file SET pattern = ? WHERE id = ?").bind(pattern, from.id))
    fileRows.set(pattern, { ...from, pattern })
  }
  const saved: SavedLayout = {
    areas: new Map(),
    files: new Map(),
    present: new Set(),
    icons: [],
    recount: new Set(),
  }
  let filePosition = 0
  for (const [position, area] of detected.entries()) {
    let row = areaRows.get(area.slug)
    areaRows.delete(area.slug)
    if (!row) {
      const inserted = await first<{ id: number }>(
        db
          .prepare("INSERT INTO area (slug, name, position) VALUES (?, ?, ?) RETURNING id")
          .bind(area.slug, area.name, position),
      )
      row = { id: inserted!.id, slug: area.slug, name: area.name, icon_sha: null, position }
    } else if (row.name !== area.name || row.position !== position)
      updates.push(
        db.prepare("UPDATE area SET name = ?, position = ? WHERE id = ?").bind(area.name, position, row.id),
      )
    saved.areas.set(area.slug, row.id)
    if (area.icon && area.icon.sha !== row.icon_sha) saved.icons.push({ areaId: row.id, entry: area.icon })
    if (!area.icon && row.icon_sha)
      updates.push(db.prepare("UPDATE area SET icon = NULL, icon_sha = NULL WHERE id = ?").bind(row.id))
    for (const file of area.files) {
      let fileRow = fileRows.get(file.pattern)
      fileRows.delete(file.pattern)
      if (!fileRow) {
        const inserted = await first<{ id: number }>(
          db
            .prepare("INSERT INTO file (area_id, pattern, position) VALUES (?, ?, ?) RETURNING id")
            .bind(row.id, file.pattern, filePosition),
        )
        fileRow = { id: inserted!.id, pattern: file.pattern, area_id: row.id, position: filePosition }
      } else if (fileRow.area_id !== row.id || fileRow.position !== filePosition) {
        saved.recount.add(fileRow.area_id).add(row.id)
        updates.push(
          db
            .prepare("UPDATE file SET area_id = ?, position = ? WHERE id = ?")
            .bind(row.id, filePosition, fileRow.id),
        )
      }
      filePosition++
      saved.files.set(file.pattern, fileRow.id)
      for (const lang of file.langs.keys()) saved.present.add(`${fileRow.id}:${lang}`)
    }
  }
  const goneAreas = [...areaRows.values()].map((row) => row.id)
  for (const row of fileRows.values()) saved.recount.add(row.area_id)
  for (const id of goneAreas) saved.recount.delete(id)
  await runAll(db, [
    ...updates,
    ...(await removeFiles(
      db,
      [...fileRows.values()].map((row) => row.id),
    )),
    ...goneAreas.flatMap((id) => [
      db.prepare("DELETE FROM progress WHERE area_id = ?").bind(id),
      db.prepare("DELETE FROM area WHERE id = ?").bind(id),
    ]),
  ])
  return saved
}
