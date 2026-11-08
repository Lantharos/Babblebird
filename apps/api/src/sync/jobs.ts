import { env } from "cloudflare:workers"

export interface AreaBlob {
  fileId: number
  lang: string
  sha: string
  path: string
  size: number
}

export type SyncJob =
  | {
      kind: "scan"
      projectId: string
      sha: string
      credit: string | null
      reason: SyncReason
      message: string | null
      by: string | null
    }
  | {
      kind: "area"
      projectId: string
      areaId: number
      sha: string
      blobs: AreaBlob[]
      credit: string | null
      fresh: boolean
    }

const BLOBS_PER_JOB = 400

export type SyncReason = "install" | "push" | "manual" | "automatic"

export interface ScanOptions {
  reason: SyncReason
  credit?: string | null
  message?: string | null
  by?: string | null
}

export function scan(projectId: string, sha: string, options: ScanOptions) {
  return env.SYNC.send({
    kind: "scan",
    projectId,
    sha,
    reason: options.reason,
    credit: options.credit ?? null,
    message: options.message ?? null,
    by: options.by ?? null,
  } satisfies SyncJob)
}

export function areaJobs(base: Omit<Extract<SyncJob, { kind: "area" }>, "blobs">, blobs: AreaBlob[]) {
  const byFile = Map.groupBy(blobs, (blob) => blob.fileId)
  const jobs: SyncJob[] = []
  let current: AreaBlob[] = []
  for (const group of byFile.values()) {
    if (current.length && current.length + group.length > BLOBS_PER_JOB) {
      jobs.push({ ...base, blobs: current })
      current = []
    }
    current.push(...group)
  }
  if (current.length) jobs.push({ ...base, blobs: current })
  return jobs
}

export async function sendJobs(jobs: SyncJob[]) {
  for (let index = 0; index < jobs.length; index += 100)
    await env.SYNC.sendBatch(jobs.slice(index, index + 100).map((body) => ({ body })))
}
