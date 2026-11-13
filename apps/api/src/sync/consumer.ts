import { usage } from "../strings/client.ts"
import { syncArea } from "./area.ts"
import type { SyncJob } from "./jobs.ts"
import { scanProject } from "./scan.ts"

export async function consumeSync(batch: MessageBatch<SyncJob>) {
  for (const message of batch.messages) {
    const started = Date.now()
    const before = { ...usage }
    const job = message.body
    if (job.kind === "scan") await scanProject(job)
    else await syncArea(job)
    console.log(
      JSON.stringify({
        job: job.kind,
        project: job.projectId,
        area: job.kind === "area" ? job.areaId : undefined,
        blobs: job.kind === "area" ? job.blobs.length : undefined,
        ms: Date.now() - started,
        rowsRead: usage.read - before.read,
        rowsWritten: usage.written - before.written,
      }),
    )
    message.ack()
  }
}
