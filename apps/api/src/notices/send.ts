import { inArray, lte } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import type { Mail } from "../mail/render.ts"
import { sendNotice } from "../mail/send.ts"
import {
  type AnnouncementPayload,
  announcementMail,
  type ProjectRef,
  type ReplyPayload,
  repliesMail,
  type StringsPayload,
  stringsMail,
} from "./mails.ts"
import { type NoticeKind, PREFERENCE, unsubscribeUrl } from "./unsubscribe.ts"

const SETTLE_MS = 3 * 60_000
const PER_ROUND = 90
const ROUNDS = 10

type Notice = typeof schema.notice.$inferSelect
type Person = Pick<typeof schema.user.$inferSelect, "id" | "email" | (typeof PREFERENCE)[NoticeKind]>

async function mailsFor(person: Person, notices: Notice[], projects: Map<string, ProjectRef>) {
  const wanted = notices.filter((notice) => person[PREFERENCE[notice.kind]] && projects.has(notice.projectId))
  const of = <T>(kind: NoticeKind) =>
    wanted
      .filter((notice) => notice.kind === kind)
      .map((notice) => ({
        project: projects.get(notice.projectId)!,
        payload: notice.payload as unknown as T,
      }))
  const mails: Mail[] = []
  const replies = of<ReplyPayload>("reply")
  if (replies.length) mails.push(repliesMail(replies, await unsubscribeUrl(person.id, "reply")))
  const strings = of<StringsPayload>("strings")
  if (strings.length) mails.push(stringsMail(strings, await unsubscribeUrl(person.id, "strings")))
  for (const { project, payload } of of<AnnouncementPayload>("announcement"))
    mails.push(announcementMail(project, payload, await unsubscribeUrl(person.id, "announcement")))
  return mails
}

async function round() {
  const due = await db
    .select()
    .from(schema.notice)
    .where(lte(schema.notice.createdAt, new Date(Date.now() - SETTLE_MS)))
    .orderBy(schema.notice.id)
    .limit(PER_ROUND)
  if (!due.length) return false
  const [people, projects] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        emailReplies: schema.user.emailReplies,
        emailStrings: schema.user.emailStrings,
        emailAnnouncements: schema.user.emailAnnouncements,
      })
      .from(schema.user)
      .where(inArray(schema.user.id, [...new Set(due.map((notice) => notice.userId))])),
    db
      .select({ id: schema.project.id, slug: schema.project.slug, name: schema.project.name })
      .from(schema.project)
      .where(inArray(schema.project.id, [...new Set(due.map((notice) => notice.projectId))])),
  ])
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  for (const person of people)
    for (const mail of await mailsFor(
      person,
      due.filter((notice) => notice.userId === person.id),
      projectsById,
    ))
      await sendNotice(person.email, mail)
  await db.delete(schema.notice).where(
    inArray(
      schema.notice.id,
      due.map((notice) => notice.id),
    ),
  )
  return due.length === PER_ROUND
}

export async function sendNotices() {
  let more = true
  for (let index = 0; more && index < ROUNDS; index++) more = await round()
}
