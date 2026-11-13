import type { GlossaryTerm, Unit } from "@babblebird/fluent"
import type { Db } from "../../strings/db.ts"
import { type GlossaryEntry, type GlossaryFile, glossaryFile, replaceGlossaries } from "../import/glossary.ts"
import type { AreaIcon } from "../import/icons.ts"
import type { DetectedArea } from "../layout/detect.ts"
import { type SavedLayout, saveLayout } from "../layout/save.ts"
import { recount } from "./progress.ts"
import { applySources } from "./sources.ts"
import { applyTranslations, clearSettled, glossaryOf } from "./translations.ts"

export interface LayoutInput {
  areas: DetectedArea[]
  sourceLang: string
  glossaryPattern: string | null
}

export interface Layout extends SavedLayout {
  known: Map<string, string>
  glossary: GlossaryFile | null
}

export function applyLayout(db: Db, input: LayoutInput): Layout {
  const saved = saveLayout(db, input.areas, input.sourceLang)
  return {
    ...saved,
    known: new Map(
      db
        .rows<[number, string, string]>(
          "SELECT b.file_id, b.lang, b.sha FROM blob b JOIN file f ON f.id = b.file_id WHERE f.area_id > 0",
        )
        .map(([fileId, lang, sha]) => [`${fileId}:${lang}`, sha]),
    ),
    glossary: input.glossaryPattern ? glossaryFile(db, input.glossaryPattern) : null,
  }
}

export interface ScanInput {
  icons: AreaIcon[]
  glossary: { fileId: number; entries: GlossaryEntry[] } | null
  vanished: [fileId: number, lang: string][]
  synced: string
  recount: number[]
}

export function finishScan(db: Db, input: ScanInput) {
  for (const icon of input.icons)
    db.run("UPDATE area SET icon = ?, icon_sha = ? WHERE id = ?", icon.name, icon.sha, icon.areaId)
  if (input.glossary) replaceGlossaries(db, input.glossary.fileId, input.glossary.entries)
  for (const [fileId, lang] of input.vanished) {
    db.run(
      "DELETE FROM translation WHERE lang = ? AND source_id IN (SELECT id FROM source WHERE file_id = ?)",
      lang,
      fileId,
    )
    db.run("DELETE FROM blob WHERE file_id = ? AND lang = ?", fileId, lang)
  }
  db.run("INSERT INTO activity (kind, detail, at) VALUES ('synced', ?, ?)", input.synced, Date.now())
  for (const areaId of input.recount) recount(db, areaId, null)
}

export interface AreaInput {
  areaId: number
  sources: { fileId: number; units: Unit[] }[]
  targets: { fileId: number; lang: string; units: Unit[]; credits: Map<string, string> }[]
  credit: string | null
  blobs: [fileId: number, lang: string, sha: string][]
}

export function applyArea(db: Db, input: AreaInput) {
  let sourcesChanged = false
  let added = 0
  for (const source of input.sources) {
    const applied = applySources(db, source.fileId, source.units)
    sourcesChanged ||= applied.changed
    added += applied.added
  }
  const glossaries = new Map<string, GlossaryTerm[]>()
  const touched = new Set<string>()
  for (const target of input.targets) {
    if (!glossaries.has(target.lang)) glossaries.set(target.lang, glossaryOf(db, target.lang))
    if (applyTranslations(db, { ...target, credit: input.credit }, glossaries.get(target.lang)!))
      touched.add(target.lang)
    clearSettled(db, target.fileId, target.lang)
  }
  db.each(
    "INSERT INTO blob (file_id, lang, sha) VALUES (?, ?, ?) ON CONFLICT (file_id, lang) DO UPDATE SET sha = excluded.sha",
    input.blobs,
  )
  if (sourcesChanged || touched.size) recount(db, input.areaId, sourcesChanged ? null : [...touched])
  return added
}
