import { and, desc, eq, gt, isNotNull, isNull, like, or, type SQL, sql } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { all, shard, shardsInUse } from "../../db/strings.ts"

const RECENT = 20

const now = sql`(cast(strftime('%s', 'now') as integer) * 1000)`

function userQuery() {
  return db
    .select({
      user: schema.user,
      memberships: sql<number>`(select count(*) from member m where m.user_id = "user".id)`,
      sessions: sql<number>`(select count(*) from session s where s.user_id = "user".id and s.expires_at > ${now})`,
    })
    .from(schema.user)
}

type Row = Awaited<ReturnType<ReturnType<typeof userQuery>["execute"]>>[number]

function view({ user, ...counts }: Row) {
  return { ...user, ...counts }
}

export type UserView = ReturnType<typeof view>

function matching(query: string): SQL | undefined {
  if (!query) return undefined
  const pattern = `%${query}%`
  return or(
    eq(schema.user.id, query),
    like(schema.user.name, pattern),
    like(schema.user.email, pattern),
    like(schema.user.githubLogin, pattern),
  )
}

export interface UserFilters {
  suspended?: boolean
  github?: boolean
}

export interface Work {
  projectId: string
  edits: number
  last: number
}

export interface Recent {
  projectId: string
  lang: string | null
  key: string | null
  kind: string
  at: number
}

async function everyShard<T>(query: (strings: D1Database) => Promise<T[]>) {
  const shards = await shardsInUse()
  return (await Promise.all(shards.map((index) => query(shard({ shard: index }))))).flat()
}

export const users = {
  async byId(id: string) {
    const [row] = await userQuery().where(eq(schema.user.id, id))
    return row ? view(row) : null
  },
  async search(query: string, limit: number) {
    return (await userQuery().where(matching(query)).limit(limit)).map(view)
  },
  async browse(query: string, filters: UserFilters, cursor: string | null, limit: number) {
    const offset = Number(cursor ?? 0)
    const flag = (on: boolean | undefined, column: Parameters<typeof isNull>[0]) =>
      on === undefined ? undefined : on ? isNotNull(column) : isNull(column)
    const rows = await userQuery()
      .where(
        and(
          matching(query),
          flag(filters.suspended, schema.user.suspendedAt),
          flag(filters.github, schema.user.githubLogin),
        ),
      )
      .orderBy(desc(schema.user.createdAt))
      .limit(limit)
      .offset(offset)
    return { records: rows.map(view), cursor: rows.length === limit ? String(offset + limit) : null }
  },
  accounts(id: string) {
    return db
      .select({ provider: schema.account.providerId, linked: schema.account.createdAt })
      .from(schema.account)
      .where(eq(schema.account.userId, id))
  },
  passkeys(id: string) {
    return db
      .select({ name: schema.passkey.name, kind: schema.passkey.deviceType, added: schema.passkey.createdAt })
      .from(schema.passkey)
      .where(eq(schema.passkey.userId, id))
  },
  sessions(id: string) {
    return db
      .select()
      .from(schema.session)
      .where(and(eq(schema.session.userId, id), gt(schema.session.expiresAt, new Date())))
      .orderBy(desc(schema.session.updatedAt))
  },
  memberships(id: string) {
    return db
      .select({ member: schema.member, slug: schema.project.slug })
      .from(schema.member)
      .innerJoin(schema.project, eq(schema.project.id, schema.member.projectId))
      .where(eq(schema.member.userId, id))
      .orderBy(schema.project.slug)
  },
  async work(id: string) {
    const rows = await everyShard((strings) =>
      all<{ project_id: string; edits: number; last: number }>(
        strings
          .prepare(
            "SELECT project_id, count(*) edits, max(at) last FROM activity WHERE user_id = ? GROUP BY project_id",
          )
          .bind(id),
      ),
    )
    return rows
      .map((row): Work => ({ projectId: row.project_id, edits: row.edits, last: row.last }))
      .sort((a, b) => b.last - a.last)
  },
  async recent(id: string) {
    const rows = await everyShard((strings) =>
      all<{ project_id: string; lang: string | null; key: string | null; kind: string; at: number }>(
        strings
          .prepare(
            `SELECT a.project_id, a.lang, s.key, a.kind, a.at FROM activity a LEFT JOIN source s ON s.id = a.source_id
             WHERE a.user_id = ? ORDER BY a.id DESC LIMIT ${RECENT}`,
          )
          .bind(id),
      ),
    )
    return rows
      .map(
        (row): Recent => ({
          projectId: row.project_id,
          lang: row.lang,
          key: row.key,
          kind: row.kind,
          at: row.at,
        }),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, RECENT)
  },
  async suggestions(id: string) {
    const counts = await everyShard((strings) =>
      all<{ count: number }>(strings.prepare("SELECT count(*) count FROM suggestion WHERE by = ?").bind(id)),
    )
    return counts.reduce((sum, row) => sum + row.count, 0)
  },
}
