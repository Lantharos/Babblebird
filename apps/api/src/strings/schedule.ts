import { env } from "cloudflare:workers"
import { type DeliverJob, LONGEST_WAIT_MS, QUIET_MS } from "../deliver/deliver.ts"
import type { MemoryPublisher } from "./publish.ts"

const MEMORY_DELAY_MS = 60_000
const DELIVER_AT = "deliver_at"

export class Schedule {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly publisher: MemoryPublisher,
  ) {}

  async memory() {
    if (this.publisher.stale()) await this.wake(Date.now() + MEMORY_DELAY_MS)
  }

  async delivery() {
    const [pending] = this.ctx.storage.sql
      .exec<{ since: number | null; changed: number | null }>(
        "SELECT min(since) since, max(changed) changed FROM pending",
      )
      .toArray()
    if (pending?.since == null || pending.changed == null) return
    await this.deliverAt(Math.min(pending.changed + QUIET_MS, pending.since + LONGEST_WAIT_MS))
  }

  async deliverAt(at: number) {
    this.ctx.storage.kv.put(DELIVER_AT, at)
    await this.wake(at)
  }

  async run(projectId: string) {
    if (this.publisher.stale()) await this.publisher.publish(projectId)
    const due = this.ctx.storage.kv.get<number>(DELIVER_AT)
    if (due !== undefined && due <= Date.now()) {
      this.ctx.storage.kv.delete(DELIVER_AT)
      await env.DELIVER.send({ projectId } satisfies DeliverJob)
    }
    const next = [
      this.publisher.stale() ? Date.now() + MEMORY_DELAY_MS : undefined,
      this.ctx.storage.kv.get<number>(DELIVER_AT),
    ].filter((at) => at !== undefined)
    if (next.length) await this.ctx.storage.setAlarm(Math.min(...next))
  }

  private async wake(at: number) {
    const current = await this.ctx.storage.getAlarm()
    if (current === null || at < current) await this.ctx.storage.setAlarm(at)
  }
}
