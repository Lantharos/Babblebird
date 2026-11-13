import { DurableObject } from "cloudflare:workers"
import { STATE } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { migrate } from "../lib/migrate.ts"
import { type MemoryRow, memoryOf } from "../tm/memory.ts"
import { STRINGS_SCHEMA } from "./schema.ts"

export interface Query {
  sql: string
  params: SqlStorageValue[]
}

export interface Result {
  results: Record<string, SqlStorageValue>[]
  read: number
  written: number
}

const MEMORY_DELAY_MS = 60_000

export class ProjectStrings extends DurableObject<Env> {
  private readonly sql = this.ctx.storage.sql

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    migrate(ctx.storage, STRINGS_SCHEMA)
  }

  async run(query: Query) {
    const result = this.exec(query)
    if (result.written) await this.scheduleMemory()
    return result
  }

  async batch(queries: Query[]) {
    const results = this.ctx.storage.transactionSync(() => queries.map((query) => this.exec(query)))
    if (results.some((result) => result.written)) await this.scheduleMemory()
    return results
  }

  async republish() {
    this.sql.exec("INSERT OR IGNORE INTO memory_stale SELECT DISTINCT lang FROM translation")
    await this.scheduleMemory()
  }

  override async alarm() {
    const project = await db.query.project.findFirst({ where: eq(schema.project.id, this.ctx.id.name!) })
    const shared = project && !project.private && project.state !== "removed"
    for (const { lang } of this.sql.exec<{ lang: string }>("SELECT lang FROM memory_stale").toArray()) {
      const rows = this.ctx.storage.transactionSync(() => {
        this.sql.exec("DELETE FROM memory_stale WHERE lang = ?", lang)
        return shared ? this.memoryRows(lang) : []
      })
      if (!project) continue
      try {
        await memoryOf(project.sourceLang, lang).replace(project.id, rows)
      } catch (error) {
        this.sql.exec("INSERT OR IGNORE INTO memory_stale VALUES (?)", lang)
        throw error
      }
    }
    await this.scheduleMemory()
  }

  private memoryRows(lang: string) {
    return [
      ...this.sql
        .exec(
          `SELECT s.id, s.text_hash, s.plain, t.body FROM translation t JOIN source s ON s.id = t.source_id
           WHERE t.lang = ? AND t.state != ?`,
          lang,
          STATE.review,
        )
        .raw(),
    ] as MemoryRow[]
  }

  private async scheduleMemory() {
    if (!this.sql.exec("SELECT 1 FROM memory_stale LIMIT 1").toArray().length) return
    if ((await this.ctx.storage.getAlarm()) === null)
      await this.ctx.storage.setAlarm(Date.now() + MEMORY_DELAY_MS)
  }

  private exec({ sql, params }: Query): Result {
    const cursor = this.sql.exec(sql, ...params)
    const results = cursor.toArray()
    return { results, read: cursor.rowsRead, written: cursor.rowsWritten }
  }
}
