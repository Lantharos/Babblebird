import type { TreeEntry } from "../../github/repo.ts"
import type { Db } from "../../strings/db.ts"
import { removeSources } from "../apply/sources.ts"
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

function removeFiles(db: Db, ids: number[]) {
  for (const id of ids) {
    removeSources(
      db,
      db.all<{ id: number; plain: string }>("SELECT id, plain FROM source WHERE file_id = ?", id),
    )
    for (const table of ["blob", "pending"]) db.run(`DELETE FROM ${table} WHERE file_id = ?`, id)
    db.run("DELETE FROM file WHERE id = ?", id)
  }
}

function movedFiles(db: Db, rows: FileRow[], detected: DetectedArea[], sourceLang: string) {
  const patterns = new Set(rows.map((row) => row.pattern))
  const arriving = detected.flatMap((area) => area.files).filter((file) => !patterns.has(file.pattern))
  const leaving = rows.filter(
    (row) => !detected.some((area) => area.files.some((file) => file.pattern === row.pattern)),
  )
  if (!arriving.length || !leaving.length) return new Map<string, FileRow>()
  const shas = db.all<{ file_id: number; sha: string }>(
    "SELECT file_id, sha FROM blob WHERE lang = ?1 AND file_id IN (SELECT value FROM json_each(?2))",
    sourceLang,
    JSON.stringify(leaving.map((row) => row.id)),
  )
  const bySha = new Map(shas.map((row) => [row.sha, leaving.find((file) => file.id === row.file_id)!]))
  const moves = new Map<string, FileRow>()
  for (const file of arriving) {
    const sha = file.langs.get(sourceLang)?.sha ?? ""
    const from = bySha.get(sha)
    if (from) {
      moves.set(file.pattern, from)
      bySha.delete(sha)
    }
  }
  return moves
}

function savedArea(db: Db, rows: Map<string, AreaRow>, area: DetectedArea, position: number) {
  const row = rows.get(area.slug)
  rows.delete(area.slug)
  if (!row) {
    const { id } = db.one<{ id: number }>(
      "INSERT INTO area (slug, name, position) VALUES (?, ?, ?) RETURNING id",
      area.slug,
      area.name,
      position,
    )!
    return { id, slug: area.slug, name: area.name, icon_sha: null, position }
  }
  if (row.name !== area.name || row.position !== position)
    db.run("UPDATE area SET name = ?, position = ? WHERE id = ?", area.name, position, row.id)
  if (!area.icon && row.icon_sha) db.run("UPDATE area SET icon = NULL, icon_sha = NULL WHERE id = ?", row.id)
  return row
}

export function saveLayout(db: Db, detected: DetectedArea[], sourceLang: string): SavedLayout {
  const areaRows = new Map(
    db.all<AreaRow>("SELECT id, slug, name, icon_sha, position FROM area").map((row) => [row.slug, row]),
  )
  const fileRows = new Map(
    db
      .all<FileRow>("SELECT id, pattern, area_id, position FROM file WHERE area_id > 0")
      .map((row) => [row.pattern, row]),
  )
  for (const [pattern, from] of movedFiles(db, [...fileRows.values()], detected, sourceLang)) {
    fileRows.delete(from.pattern)
    db.run("UPDATE file SET pattern = ? WHERE id = ?", pattern, from.id)
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
    const row = savedArea(db, areaRows, area, position)
    saved.areas.set(area.slug, row.id)
    if (area.icon && area.icon.sha !== row.icon_sha) saved.icons.push({ areaId: row.id, entry: area.icon })
    for (const file of area.files) {
      let fileRow = fileRows.get(file.pattern)
      fileRows.delete(file.pattern)
      if (!fileRow) {
        const { id } = db.one<{ id: number }>(
          "INSERT INTO file (area_id, pattern, position) VALUES (?, ?, ?) RETURNING id",
          row.id,
          file.pattern,
          filePosition,
        )!
        fileRow = { id, pattern: file.pattern, area_id: row.id, position: filePosition }
      } else if (fileRow.area_id !== row.id || fileRow.position !== filePosition) {
        saved.recount.add(fileRow.area_id).add(row.id)
        db.run("UPDATE file SET area_id = ?, position = ? WHERE id = ?", row.id, filePosition, fileRow.id)
      }
      filePosition++
      saved.files.set(file.pattern, fileRow.id)
      for (const lang of file.langs.keys()) saved.present.add(`${fileRow.id}:${lang}`)
    }
  }
  const goneAreas = [...areaRows.values()].map((row) => row.id)
  for (const row of fileRows.values()) saved.recount.add(row.area_id)
  for (const id of goneAreas) saved.recount.delete(id)
  removeFiles(
    db,
    [...fileRows.values()].map((row) => row.id),
  )
  for (const id of goneAreas) {
    db.run("DELETE FROM progress WHERE area_id = ?", id)
    db.run("DELETE FROM area WHERE id = ?", id)
  }
  return saved
}
