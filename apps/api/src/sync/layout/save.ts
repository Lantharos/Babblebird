import { all, eachRow, first, runAll } from "../../db/strings.ts"
import type { TreeEntry } from "../../github/repo.ts"
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

async function removeFiles(db: D1Database, ids: number[]) {
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

export async function saveLayout(
  db: D1Database,
  projectId: string,
  detected: DetectedArea[],
): Promise<SavedLayout> {
  const areaRows = new Map(
    (
      await all<AreaRow>(
        db
          .prepare("SELECT id, slug, name, icon_sha, position FROM area WHERE project_id = ?")
          .bind(projectId),
      )
    ).map((row) => [row.slug, row]),
  )
  const fileRows = new Map(
    (
      await all<FileRow>(
        db
          .prepare("SELECT id, pattern, area_id, position FROM file WHERE project_id = ? AND area_id > 0")
          .bind(projectId),
      )
    ).map((row) => [row.pattern, row]),
  )
  const saved: SavedLayout = {
    areas: new Map(),
    files: new Map(),
    present: new Set(),
    icons: [],
    recount: new Set(),
  }
  const updates: D1PreparedStatement[] = []
  let filePosition = 0
  for (const [position, area] of detected.entries()) {
    let row = areaRows.get(area.slug)
    areaRows.delete(area.slug)
    if (!row) {
      const inserted = await first<{ id: number }>(
        db
          .prepare("INSERT INTO area (project_id, slug, name, position) VALUES (?, ?, ?, ?) RETURNING id")
          .bind(projectId, area.slug, area.name, position),
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
            .prepare(
              "INSERT INTO file (project_id, area_id, pattern, position) VALUES (?, ?, ?, ?) RETURNING id",
            )
            .bind(projectId, row.id, file.pattern, filePosition),
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
      db.prepare("DELETE FROM progress WHERE project_id = ? AND area_id = ?").bind(projectId, id),
      db.prepare("DELETE FROM area WHERE id = ?").bind(id),
    ]),
  ])
  return saved
}
