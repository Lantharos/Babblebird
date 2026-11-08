import { and, asc, eq, gte, isNotNull, isNull, ne } from "drizzle-orm"
import { db, schema } from "../../db/core.ts"
import { all, shard, shardsInUse } from "../../db/strings.ts"

const WEEK_MS = 7 * 86_400_000

async function translations() {
  const sums = await Promise.all(
    (await shardsInUse()).map((index) =>
      all<{ total: number }>(
        shard({ shard: index }).prepare("SELECT coalesce(sum(translated), 0) total FROM progress"),
      ),
    ),
  )
  return sums.reduce((sum, rows) => sum + (rows[0]?.total ?? 0), 0)
}

export async function serviceTotals() {
  const live = ne(schema.project.state, "removed")
  const [projects, ready, users, newUsers, openPulls, translated] = await Promise.all([
    db.$count(schema.project, live),
    db.$count(schema.project, eq(schema.project.state, "ready")),
    db.$count(schema.user),
    db.$count(schema.user, gte(schema.user.createdAt, new Date(Date.now() - WEEK_MS))),
    db.$count(
      schema.delivery,
      and(
        isNotNull(schema.delivery.pullNumber),
        isNull(schema.delivery.mergedAt),
        isNull(schema.delivery.closedAt),
      ),
    ),
    translations(),
  ])
  return { projects, ready, users, newUsers, openPulls, translated }
}

const projectColumns = {
  id: schema.project.id,
  slug: schema.project.slug,
  problem: schema.project.problem,
  updatedAt: schema.project.updatedAt,
}

export function failingProjects() {
  return db
    .select(projectColumns)
    .from(schema.project)
    .where(eq(schema.project.state, "failed"))
    .orderBy(asc(schema.project.updatedAt))
}

export function importingProjects() {
  return db
    .select({ ...projectColumns, done: schema.project.importDone, total: schema.project.importTotal })
    .from(schema.project)
    .where(eq(schema.project.state, "scanning"))
    .orderBy(asc(schema.project.importStartedAt))
}

export function deliveryProblems() {
  return db
    .select({ id: schema.project.id, slug: schema.project.slug, problem: schema.delivery.problem })
    .from(schema.delivery)
    .innerJoin(schema.project, eq(schema.project.id, schema.delivery.projectId))
    .where(
      and(
        isNotNull(schema.delivery.problem),
        ne(schema.project.state, "removed"),
        ne(schema.project.delivery, "off"),
      ),
    )
    .orderBy(schema.project.slug)
}

export function pausedProjects() {
  return db
    .select({
      id: schema.project.id,
      slug: schema.project.slug,
      reason: schema.project.pausedReason,
      since: schema.project.pausedAt,
    })
    .from(schema.project)
    .where(isNotNull(schema.project.pausedAt))
    .orderBy(asc(schema.project.pausedAt))
}

export function suspendedUsers() {
  return db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      reason: schema.user.suspendedReason,
      since: schema.user.suspendedAt,
    })
    .from(schema.user)
    .where(isNotNull(schema.user.suspendedAt))
    .orderBy(asc(schema.user.suspendedAt))
}
