import { syncArea } from "./area.ts"
import type { SyncJob } from "./jobs.ts"
import { scanProject } from "./scan.ts"

export async function consumeSync(batch: MessageBatch<SyncJob>) {
  for (const message of batch.messages) {
    const started = Date.now()
    const job = message.body
    const usage = job.kind === "scan" ? await scanProject(job) : await syncArea(job)
    console.log(
      JSON.stringify({
        job: job.kind,
        project: job.projectId,
        area: job.kind === "area" ? job.areaId : undefined,
        blobs: job.kind === "area" ? job.blobs.length : undefined,
        ms: Date.now() - started,
        rowsRead: usage?.read,
        rowsWritten: usage?.written,
      }),
    )
    message.ack()
  }
}
