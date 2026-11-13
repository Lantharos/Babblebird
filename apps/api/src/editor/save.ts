import { sql } from "drizzle-orm"
import { db as core, schema } from "../db/core.ts"

export async function noteContribution(userId: string, projectId: string, edits: number) {
  const now = Date.now()
  await core
    .insert(schema.contribution)
    .values({ userId, projectId, edits, lastAt: now })
    .onConflictDoUpdate({
      target: [schema.contribution.userId, schema.contribution.projectId],
      set: { edits: sql`${schema.contribution.edits} + ${edits}`, lastAt: now },
    })
}

export async function rememberLanguage(userId: string, lang: string) {
  await core.run(
    sql`UPDATE user SET languages = json_insert(languages, '$[#]', ${lang})
        WHERE id = ${userId} AND NOT EXISTS (SELECT 1 FROM json_each(user.languages) WHERE value = ${lang})`,
  )
}
