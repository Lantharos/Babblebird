import { resource } from "@lantharos/pult"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, schema } from "../../db/core.ts"
import { peopleById } from "../../editor/people.ts"
import { removeContributions } from "../../moderation/contributions.ts"
import { pause, remove, restore, resume, resync, sendNow } from "../../moderation/projects.ts"
import { counted, DELIVERY, WHO_TRANSLATES } from "../data/labels.ts"
import { projectPage } from "../data/links.ts"
import { type ProjectView, projects } from "../data/projects.ts"
import { projectBlocks, projectState } from "../render/project.ts"

const live = (project: ProjectView) => project.state !== "removed" && !project.pausedAt
const sends = (project: ProjectView) => live(project) && project.delivery !== "off"

export function removedSummary(removed: { translations: number; suggestions: number }) {
  if (!removed.translations && !removed.suggestions) return "There was nothing of theirs left to remove"
  return `Put back ${counted(removed.translations, "translation")} and removed ${counted(removed.suggestions, "suggestion")}`
}

export const project = resource("project", {
  icon: "git-branch",
  get: (id) => projects.byId(id),
  find: (query, limit) => projects.search(query, limit),
  list: {
    filters: z.object({
      state: z.enum(schema.PROJECT_STATES).optional(),
      delivery: z.enum(schema.DELIVERIES).optional(),
      paused: z.boolean().optional(),
      private: z.boolean().optional(),
    }),
    run: ({ query, filters, cursor, limit }) => projects.browse(query, filters, cursor, limit),
  },
  title: (project) => project.slug,
  subtitle: (project) =>
    [
      projectState(project),
      counted(project.strings, "string"),
      counted(project.languages.length, "language"),
    ].join(" · "),
  fields: (project) => ({
    state: projectState(project),
    strings: project.strings,
    languages: project.languages.length,
    delivery: DELIVERY[project.delivery],
    "last read": project.syncedAt ?? "",
  }),
  url: (project) => (project.state === "removed" ? undefined : projectPage(project)),
  render: (project) => projectBlocks(project),
  actions: (action) => ({
    resync: action({
      label: "Read again",
      description: "Reads the default branch again, like a push would.",
      when: live,
      automatable: true,
      run: async ({ record, actor }) => {
        await resync(record, actor.name)
        return `Reading ${record.slug} again`
      },
    }),
    sendNow: action({
      label: "Send now",
      description:
        "Sends the translations that are waiting now instead of on the next ten-minute run. A pull request the maintainers closed stays closed until there are new translations.",
      when: sends,
      automatable: true,
      run: async ({ record }) => {
        await sendNow(record)
        return `Sending ${record.slug}'s translations`
      },
    }),
    setDelivery: action({
      label: "Change delivery",
      description: "How translations reach the repository. Maintainers can change it back in their settings.",
      input: z.object({ delivery: z.enum(schema.DELIVERIES) }),
      defaults: (project) => ({ delivery: project.delivery }),
      danger: "confirm",
      when: (project) => project.state !== "removed",
      run: async ({ record, input }) => {
        await db
          .update(schema.project)
          .set({ delivery: input.delivery })
          .where(eq(schema.project.id, record.id))
        return `${record.slug}: ${DELIVERY[input.delivery].toLowerCase()}`
      },
    }),
    setWhoTranslates: action({
      label: "Change who translates",
      description: "Whether anyone signed in can translate or only the project's members.",
      input: z.object({ whoTranslates: z.enum(schema.WHO_TRANSLATES) }),
      defaults: (project) => ({ whoTranslates: project.whoTranslates }),
      danger: "confirm",
      when: (project) => project.state !== "removed" && !project.private,
      run: async ({ record, input }) => {
        await db
          .update(schema.project)
          .set({ whoTranslates: input.whoTranslates })
          .where(eq(schema.project.id, record.id))
        return `${record.slug}: ${WHO_TRANSLATES[input.whoTranslates].toLowerCase()}`
      },
    }),
    removeTranslatorWork: action({
      label: "Remove someone's work",
      description:
        "Puts back what the repository has for every translation this person last changed in the project that isn't in the repository yet, and deletes their suggestions here. What's already merged stays.",
      input: z.object({ person: z.string() }),
      choices: {
        person: async (project) => {
          const translators = await projects.translators(project)
          const people = await peopleById(translators.map((row) => row.user_id))
          return translators.map((row) => ({
            value: row.user_id,
            label: `${people.get(row.user_id)?.name ?? row.user_id}, ${counted(row.edits, "edit")}`,
          }))
        },
      },
      danger: "reauth",
      when: (project) => project.state !== "removed",
      run: async ({ record, input }) => removedSummary(await removeContributions(input.person, record.id)),
    }),
    pause: action({
      description:
        "Stops reading pushes, sending translations and taking new translations or suggestions. The project stays listed with a note that it's paused.",
      input: z.object({
        reason: z.string().trim().min(1).max(300).describe("For the record; the maintainers don’t see it"),
      }),
      danger: "confirm",
      when: (project) => project.state !== "removed" && !project.pausedAt,
      run: async ({ record, input }) => {
        await pause(record, input.reason)
        return `Paused ${record.slug}`
      },
    }),
    resume: action({
      description: "Lets the project take translations again and reads the repository to catch up.",
      danger: "confirm",
      when: (project) => project.pausedAt !== null,
      run: async ({ record, actor }) => {
        const reading = await resume(record, actor.name)
        return reading
          ? `${record.slug} is running again`
          : `${record.slug} is running again, but GitHub didn't answer, so it's read on the next push or with Read again`
      },
    }),
    remove: action({
      description:
        "Takes the project off Babblebird, as if its maintainers removed it. Its translations are kept, and adding the repository on GitHub again brings it back.",
      danger: "reauth",
      when: (project) => project.state !== "removed",
      moves: "removed",
      run: async ({ record }) => {
        await remove(record)
        return `Removed ${record.slug}`
      },
    }),
    restore: action({
      label: "Bring back",
      description: "Puts a removed project back and reads its repository again.",
      danger: "confirm",
      when: (project) => project.state === "removed" && project.account !== null,
      run: async ({ record, actor }) => {
        await restore(record, actor.name)
        return `${record.slug} is back`
      },
    }),
  }),
})
