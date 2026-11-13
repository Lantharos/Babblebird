import { DurableObject } from "cloudflare:workers"
import type { LiveEvent, Progress } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { db as core, schema } from "../db/core.ts"
import { type BuiltFile, buildFile, type PendingFile, pendingFiles, translators } from "../deliver/files.ts"
import { type PageQuery, searchStrings, stringPage } from "../editor/queries.ts"
import { rowsOf } from "../editor/rows.ts"
import { detailOf, dropSuggestion, type EditInput, editString } from "../editor/store.ts"
import { buildGlossary, dropTerm, glossaryRows, saveTerm, type TermEdit } from "../glossary/store.ts"
import { migrate } from "../lib/migrate.ts"
import { removeWork } from "../moderation/work.ts"
import { type StoredScreenshot, saveScreenshots } from "../screenshots/store.ts"
import { totals } from "../sync/apply/progress.ts"
import {
  type AreaInput,
  applyArea,
  applyLayout,
  finishScan,
  type LayoutInput,
  type ScanInput,
} from "../sync/apply/project.ts"
import { Db } from "./db.ts"
import { Live } from "./live.ts"
import { MemoryPublisher } from "./publish.ts"
import { Schedule } from "./schedule.ts"
import { STRINGS_SCHEMA } from "./schema.ts"

export class ProjectStrings extends DurableObject<Env> {
  private readonly live = new Live(this.ctx)
  private readonly memory = new MemoryPublisher(this.ctx)
  private readonly schedule = new Schedule(this.ctx, this.memory)

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    migrate(ctx.storage, STRINGS_SCHEMA)
  }

  private get projectId() {
    return this.ctx.id.name!
  }

  private write<T>(work: (db: Db) => T) {
    const db = new Db(this.ctx.storage.sql)
    const result = this.ctx.storage.transactionSync(() => work(db))
    return { result, usage: db.usage }
  }

  private read<T>(work: (db: Db) => T) {
    return work(new Db(this.ctx.storage.sql))
  }

  private async settle() {
    const db = new Db(this.ctx.storage.sql)
    await core.update(schema.project).set(totals(db)).where(eq(schema.project.id, this.projectId))
    await this.schedule.memory()
  }

  query(sql: string, params: SqlStorageValue[] = []) {
    return this.read((db) => db.all<Record<string, SqlStorageValue>>(sql, ...params))
  }

  applyLayout(input: LayoutInput) {
    return this.write((db) => applyLayout(db, input)).result
  }

  async finishScan(input: ScanInput) {
    const { usage } = this.write((db) => finishScan(db, input))
    await this.settle()
    return usage
  }

  async applyArea(input: AreaInput) {
    const { usage } = this.write((db) => applyArea(db, input))
    await this.settle()
    const area = this.read((db) =>
      db.one<{ slug: string }>("SELECT slug FROM area WHERE id = ?", input.areaId),
    )
    if (area) this.live.broadcastAll({ type: "synced", area: area.slug })
    return usage
  }

  page(query: PageQuery) {
    return this.read((db) => stringPage(db, query))
  }

  search(lang: string, text: string, limit: number) {
    return this.read((db) => searchStrings(db, lang, text, limit))
  }

  detail(id: number, lang: string, sourceLang: string) {
    return this.read((db) => detailOf(db, id, lang, sourceLang))
  }

  async edit(input: EditInput) {
    const { result } = this.write((db) => editString(db, input))
    if (result.status !== "done") return result
    await this.settle()
    if (input.edit.kind !== "suggested") await this.schedule.delivery()
    await this.announce(result.record.area_id, input.lang, result.record)
    return result
  }

  async dropSuggestion(id: number, lang: string, suggestion: number, owner: string | null) {
    const { result: record } = this.write((db) => dropSuggestion(db, id, lang, suggestion, owner))
    if (!record) return false
    await this.settle()
    await this.announce(record.area_id, lang, record)
    return true
  }

  pending(): PendingFile[] {
    return this.read((db) => pendingFiles(db))
  }

  build(files: PendingFile[], existing: Map<string, string>, since: number, sourceLang: string) {
    const contentOf = (file: PendingFile) => existing.get(file.pattern.replace("{lang}", file.lang)) ?? ""
    return this.read((db) => ({
      built: files
        .map((file) =>
          file.pattern.endsWith(".tbx")
            ? buildGlossary(db, file, contentOf(file), sourceLang)
            : buildFile(db, file, contentOf(file)),
        )
        .filter((file): file is BuiltFile => file !== null),
      translators: translators(db, files, since),
    }))
  }

  glossary(lang: string) {
    return this.read((db) => glossaryRows(db, lang))
  }

  async saveTerm(edit: TermEdit) {
    this.write((db) => saveTerm(db, edit))
    await this.schedule.delivery()
  }

  async dropTerm(lang: string, term: string, userId: string) {
    const { result } = this.write((db) => dropTerm(db, lang, term, userId))
    if (result) await this.schedule.delivery()
    return result
  }

  async removeWork(userId: string) {
    const { result } = this.write((db) => removeWork(db, userId))
    if (result.translations + result.suggestions) await this.settle()
    return result
  }

  saveScreenshots(screenshots: StoredScreenshot[]) {
    return this.write((db) => saveScreenshots(db, screenshots)).result
  }

  async republish() {
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO memory_stale SELECT DISTINCT lang FROM translation")
    await this.schedule.memory()
  }

  deliverAfter(ms: number) {
    return this.schedule.deliverAt(Date.now() + ms)
  }

  override fetch(request: Request) {
    return this.live.accept(request)
  }

  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    this.live.receive(socket, message)
  }

  override webSocketClose(socket: WebSocket) {
    this.live.leave(socket)
  }

  override alarm() {
    return this.schedule.run(this.projectId)
  }

  private async announce(areaId: number, lang: string, record: Parameters<typeof rowsOf>[0][number]) {
    if (!this.live.watching(lang)) return
    const [row] = await rowsOf([record])
    const found = this.read((db) =>
      db.one<Progress & { slug: string }>(
        `SELECT a.slug, coalesce(p.translated, 0) translated, coalesce(p.review, 0) review, coalesce(p.approved, 0) approved,
           coalesce(p.problems, 0) problems, coalesce(p.suggested, 0) suggested
         FROM area a LEFT JOIN progress p ON p.area_id = a.id AND p.lang = ?2 WHERE a.id = ?1`,
        areaId,
        lang,
      ),
    )!
    const { slug, ...progress } = found
    this.live.broadcast(lang, { type: "changed", area: slug, row: row!, progress } satisfies LiveEvent)
  }
}
