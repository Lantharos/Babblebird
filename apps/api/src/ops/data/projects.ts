import { and, desc, eq, inArray, isNotNull, isNull, like, or, type SQL } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { all, first, shard } from "../../db/strings.ts"
import { languagesProgress } from "../../projects/progress.ts"

const TRANSLATORS = 50
const READS = 10

function projectQuery() {
  return db
    .select({
      project: schema.project,
      account: schema.installation.account,
      installationSuspended: schema.installation.suspended,
      sent: schema.delivery,
    })
    .from(schema.project)
    .leftJoin(schema.installation, eq(schema.installation.id, schema.project.installationId))
    .leftJoin(schema.delivery, eq(schema.delivery.projectId, schema.project.id))
}

type Row = Awaited<ReturnType<ReturnType<typeof projectQuery>["execute"]>>[number]

function view({ project, account, installationSuspended, sent }: Row) {
  const openPull = sent?.pullNumber && !sent.mergedAt && !sent.closedAt ? sent.pullNumber : null
  return { ...project, account, installationSuspended: installationSuspended ?? false, sent, openPull }
}

export type ProjectView = ReturnType<typeof view>

function matching(query: string): SQL | undefined {
  if (!query) return undefined
  const pattern = `%${query}%`
  return or(
    eq(schema.project.id, query),
    like(schema.project.slug, pattern.toLowerCase()),
    like(schema.project.description, pattern),
  )
}

export interface ProjectFilters {
  state?: ProjectView["state"]
  delivery?: ProjectView["delivery"]
  paused?: boolean
  private?: boolean
}

export interface ReadEntry {
  at: number
  sha: string
  reason: "install" | "push" | "manual" | "automatic"
  by: string | null
  message: string | null
  sourceFiles: number
  translationFiles: number
}

export const projects = {
  async byId(id: string) {
    const [row] = await projectQuery().where(eq(schema.project.id, id))
    return row ? view(row) : null
  },
  async search(query: string, limit: number) {
    return (await projectQuery().where(matching(query)).limit(limit)).map(view)
  },
  async browse(query: string, filters: ProjectFilters, cursor: string | null, limit: number) {
    const offset = Number(cursor ?? 0)
    const rows = await projectQuery()
      .where(
        and(
          matching(query),
          filters.state ? eq(schema.project.state, filters.state) : undefined,
          filters.delivery ? eq(schema.project.delivery, filters.delivery) : undefined,
          filters.paused === undefined
            ? undefined
            : filters.paused
              ? isNotNull(schema.project.pausedAt)
              : isNull(schema.project.pausedAt),
          filters.private === undefined ? undefined : eq(schema.project.private, filters.private),
        ),
      )
      .orderBy(desc(schema.project.createdAt))
      .limit(limit)
      .offset(offset)
    return { records: rows.map(view), cursor: rows.length === limit ? String(offset + limit) : null }
  },
  async ofInstallation(installationId: number) {
    const rows = await projectQuery()
      .where(eq(schema.project.installationId, installationId))
      .orderBy(schema.project.slug)
    return rows.map(view)
  },
  async slugs(ids: string[]) {
    if (!ids.length) return new Map<string, string>()
    const rows = await db
      .select({ id: schema.project.id, slug: schema.project.slug })
      .from(schema.project)
      .where(inArray(schema.project.id, [...new Set(ids)]))
    return new Map(rows.map((row) => [row.id, row.slug]))
  },
  members(projectId: string) {
    return db
      .select({ member: schema.member, user: schema.user })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(eq(schema.member.projectId, projectId))
      .orderBy(schema.member.createdAt)
  },
  languages(project: ProjectView) {
    return languagesProgress(shard(project), project.id, project.languages)
  },
  translators(project: ProjectView) {
    return all<{ user_id: string; edits: number; last: number }>(
      shard(project)
        .prepare(
          `SELECT user_id, count(*) edits, max(at) last FROM activity WHERE project_id = ? AND user_id IS NOT NULL
           GROUP BY user_id ORDER BY edits DESC LIMIT ${TRANSLATORS}`,
        )
        .bind(project.id),
    )
  },
  async reads(project: ProjectView) {
    const rows = await all<{ detail: string; at: number }>(
      shard(project)
        .prepare(
          `SELECT detail, at FROM activity WHERE project_id = ? AND kind = 'synced' ORDER BY id DESC LIMIT ${READS}`,
        )
        .bind(project.id),
    )
    return rows.map((row): ReadEntry => ({ at: row.at, ...JSON.parse(row.detail) }))
  },
  async counts(project: ProjectView) {
    const strings = shard(project)
    const [waiting, glossary] = await Promise.all([
      first<{ count: number }>(
        strings.prepare("SELECT count(*) count FROM pending WHERE project_id = ?").bind(project.id),
      ),
      first<{ count: number }>(
        strings.prepare("SELECT count(*) count FROM glossary WHERE project_id = ?").bind(project.id),
      ),
    ])
    return { waitingFiles: waiting?.count ?? 0, glossaryTerms: glossary?.count ?? 0 }
  },
}
