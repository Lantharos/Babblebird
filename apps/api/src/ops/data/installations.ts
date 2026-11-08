import { and, desc, eq, like, type SQL, sql } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"

function installationQuery() {
  return db
    .select({
      installation: schema.installation,
      projects: sql<number>`(select count(*) from project p where p.installation_id = installation.id and p.state != 'removed')`,
    })
    .from(schema.installation)
}

type Row = Awaited<ReturnType<ReturnType<typeof installationQuery>["execute"]>>[number]

function view({ installation, projects }: Row) {
  return { ...installation, projects }
}

export type InstallationView = ReturnType<typeof view>

function matching(query: string): SQL | undefined {
  if (!query) return undefined
  return /^\d+$/.test(query)
    ? eq(schema.installation.id, Number(query))
    : like(schema.installation.account, `%${query}%`)
}

export const installations = {
  async byId(id: string) {
    if (!/^\d+$/.test(id)) return null
    const [row] = await installationQuery().where(eq(schema.installation.id, Number(id)))
    return row ? view(row) : null
  },
  async search(query: string, limit: number) {
    return (await installationQuery().where(matching(query)).limit(limit)).map(view)
  },
  async browse(query: string, suspended: boolean | undefined, cursor: string | null, limit: number) {
    const offset = Number(cursor ?? 0)
    const rows = await installationQuery()
      .where(
        and(
          matching(query),
          suspended === undefined ? undefined : eq(schema.installation.suspended, suspended),
        ),
      )
      .orderBy(desc(schema.installation.createdAt))
      .limit(limit)
      .offset(offset)
    return { records: rows.map(view), cursor: rows.length === limit ? String(offset + limit) : null }
  },
}
