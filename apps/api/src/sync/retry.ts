import { and, eq, isNull, lt, or } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { scanHead } from "./head.ts"
import { LAYOUT_VERSION } from "./layout/detect.ts"

const QUIET_MS = 9 * 60_000

export async function rescanStale() {
  const quiet = new Date(Date.now() - QUIET_MS)
  const stale = await db
    .select()
    .from(schema.project)
    .where(
      and(
        lt(schema.project.updatedAt, quiet),
        isNull(schema.project.pausedAt),
        or(
          eq(schema.project.state, "failed"),
          and(eq(schema.project.state, "ready"), lt(schema.project.layoutVersion, LAYOUT_VERSION)),
        ),
      ),
    )
  for (const project of stale) await scanHead(project, { reason: "automatic" })
}
