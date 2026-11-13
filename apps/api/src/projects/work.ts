import { desc, eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { all, stringsOf } from "../strings/client.ts"

export interface Recent {
  projectId: string
  lang: string | null
  key: string | null
  kind: string
  at: number
}

export function contributedTo(userId: string) {
  return db
    .select({
      projectId: schema.contribution.projectId,
      edits: schema.contribution.edits,
      last: schema.contribution.lastAt,
    })
    .from(schema.contribution)
    .where(eq(schema.contribution.userId, userId))
    .orderBy(desc(schema.contribution.lastAt))
}

export async function recentWork(userId: string, limit: number): Promise<Recent[]> {
  const projects = await contributedTo(userId).limit(limit)
  const rows = await Promise.all(
    projects.map(async ({ projectId }) =>
      (
        await all<Omit<Recent, "projectId">>(
          stringsOf({ id: projectId })
            .prepare(
              `SELECT a.lang, s.key, a.kind, a.at FROM activity a LEFT JOIN source s ON s.id = a.source_id
               WHERE a.user_id = ? ORDER BY a.id DESC LIMIT ${limit}`,
            )
            .bind(userId),
        )
      ).map((row) => ({ projectId, ...row })),
    ),
  )
  return rows
    .flat()
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
}
