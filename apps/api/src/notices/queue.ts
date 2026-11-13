import { and, eq, inArray, or, sql } from "drizzle-orm"
import { db, type ProjectRow, schema } from "../db/core.ts"
import type { NoticeKind } from "./unsubscribe.ts"

const ROWS_PER_INSERT = 15

export interface NewNotice {
  userId: string
  projectId: string
  kind: NoticeKind
  payload: Record<string, unknown>
}

export async function queueNotices(notices: NewNotice[]) {
  const createdAt = new Date()
  for (let index = 0; index < notices.length; index += ROWS_PER_INSERT)
    await db
      .insert(schema.notice)
      .values(notices.slice(index, index + ROWS_PER_INSERT).map((notice) => ({ ...notice, createdAt })))
}

export async function translatorsOf(project: Pick<ProjectRow, "id">, lang: string | null) {
  const involved = or(
    inArray(
      schema.user.id,
      db
        .select({ id: schema.contribution.userId })
        .from(schema.contribution)
        .where(eq(schema.contribution.projectId, project.id)),
    ),
    inArray(
      schema.user.id,
      db
        .select({ id: schema.member.userId })
        .from(schema.member)
        .where(eq(schema.member.projectId, project.id)),
    ),
  )
  return db
    .select({ id: schema.user.id, languages: schema.user.languages })
    .from(schema.user)
    .where(
      and(
        involved,
        lang
          ? sql`EXISTS (SELECT 1 FROM json_each(${schema.user.languages}) WHERE value = ${lang})`
          : undefined,
      ),
    )
}
