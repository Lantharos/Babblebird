import { env } from "cloudflare:workers"
import { englishName } from "@babblebird/protocol"
import { link, paragraph, quote } from "../mail/parts.ts"
import type { Mail } from "../mail/render.ts"

export interface ReplyPayload {
  sourceId: number
  key: string
  area: string
  lang: string
  view: string
  author: string
  excerpt: string
}

export interface StringsPayload {
  added: number
  langs: string[]
}

export interface AnnouncementPayload {
  subject: string
  body: string
  from: string
}

export interface ProjectRef {
  slug: string
  name: string
}

const plural = (count: number, word: string) =>
  `${count.toLocaleString("en")} ${word}${count === 1 ? "" : "s"}`

const stringUrl = (project: ProjectRef, reply: ReplyPayload) =>
  `${env.PUBLIC_URL}/p/${project.slug}/${reply.view}/${reply.area}?string=${reply.sourceId}`

export function repliesMail(
  replies: { project: ProjectRef; payload: ReplyPayload }[],
  unsubscribe: string,
): Mail {
  const [first] = replies
  return {
    subject:
      replies.length === 1
        ? `${first!.payload.author} replied on ${first!.payload.key}`
        : `${replies.length} new replies on Babblebird`,
    preview: first!.payload.excerpt,
    heading: replies.length === 1 ? "A new reply" : "New replies",
    body: replies.flatMap(({ project, payload }) => [
      paragraph(
        `${payload.author} on ${payload.key} in ${project.name}, ${payload.lang ? englishName(payload.lang) : "about the English"}:`,
      ),
      quote(payload.excerpt),
      link("Open the string", stringUrl(project, payload)),
    ]),
    reason: "You got this because you took part in these discussions.",
    unsubscribe,
  }
}

export function stringsMail(
  updates: { project: ProjectRef; payload: StringsPayload }[],
  unsubscribe: string,
): Mail {
  const byProject = Map.groupBy(updates, (update) => update.project.slug)
  const totals = [...byProject.values()].map((group) => ({
    project: group[0]!.project,
    added: group.reduce((sum, update) => sum + update.payload.added, 0),
    langs: [...new Set(group.flatMap((update) => update.payload.langs))],
  }))
  return {
    subject:
      totals.length === 1
        ? `${plural(totals[0]!.added, "new string")} to translate in ${totals[0]!.project.name}`
        : `New strings to translate in ${totals.length} projects`,
    preview: totals.map((total) => `${total.project.name}: ${plural(total.added, "new string")}`).join(", "),
    heading: "New strings to translate",
    body: totals.flatMap((total) => [
      paragraph(`${total.project.name} has ${plural(total.added, "new string")}.`),
      ...total.langs.map((lang) =>
        link(`Translate into ${englishName(lang)}`, `${env.PUBLIC_URL}/p/${total.project.slug}/${lang}`),
      ),
    ]),
    reason: "You got this because you translate these projects on Babblebird.",
    unsubscribe,
  }
}

export function announcementMail(
  project: ProjectRef,
  payload: AnnouncementPayload,
  unsubscribe: string,
): Mail {
  return {
    subject: `${project.name}: ${payload.subject}`,
    preview: payload.body.slice(0, 120),
    heading: payload.subject,
    body: [
      ...payload.body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map(paragraph),
      paragraph(`${payload.from}, for ${project.name}`),
      link(`Open ${project.name}`, `${env.PUBLIC_URL}/p/${project.slug}`),
    ],
    reason: `You got this because you translate ${project.name} on Babblebird.`,
    unsubscribe,
  }
}
