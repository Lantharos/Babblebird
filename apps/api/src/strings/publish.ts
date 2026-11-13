import { STATE } from "@babblebird/protocol"
import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { type MemoryRow, memoryOf } from "../tm/memory.ts"

export class MemoryPublisher {
  private readonly sql: SqlStorage

  constructor(private readonly ctx: DurableObjectState) {
    this.sql = ctx.storage.sql
  }

  stale() {
    return this.sql.exec("SELECT 1 FROM memory_stale LIMIT 1").toArray().length > 0
  }

  async publish(projectId: string) {
    const project = await db.query.project.findFirst({ where: eq(schema.project.id, projectId) })
    const shared = project && !project.private && project.state !== "removed"
    for (const { lang } of this.sql.exec<{ lang: string }>("SELECT lang FROM memory_stale").toArray()) {
      const rows = this.ctx.storage.transactionSync(() => {
        this.sql.exec("DELETE FROM memory_stale WHERE lang = ?", lang)
        return shared ? this.rows(lang) : []
      })
      if (!project) continue
      try {
        await memoryOf(project.sourceLang, lang).replace(project.id, rows)
      } catch (error) {
        this.sql.exec("INSERT OR IGNORE INTO memory_stale VALUES (?)", lang)
        throw error
      }
    }
  }

  private rows(lang: string) {
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
}
