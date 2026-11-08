import { resource } from "@lantharos/pult"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db, schema } from "../../db/core.ts"
import { deleteAccount, reinstate, revokeSessions, suspend } from "../../moderation/accounts.ts"
import { removeContributions } from "../../moderation/contributions.ts"
import { counted } from "../data/labels.ts"
import { emailHint } from "../data/links.ts"
import { projects } from "../data/projects.ts"
import { users } from "../data/users.ts"
import { userBlocks } from "../render/user.ts"
import { removedSummary } from "./project.ts"

const EVERYWHERE = "everywhere"

const nameOf = (user: { name: string; githubLogin: string | null; email: string }) =>
  user.name || user.githubLogin || emailHint(user.email)

export const user = resource("user", {
  icon: "user",
  label: "Person",
  plural: "People",
  get: (id) => users.byId(id),
  find: (query, limit) => users.search(query, limit),
  list: {
    filters: z.object({ suspended: z.boolean().optional(), github: z.boolean().optional() }),
    run: ({ query, filters, cursor, limit }) => users.browse(query, filters, cursor, limit),
  },
  title: nameOf,
  subtitle: (user) =>
    [user.githubLogin && `@${user.githubLogin}`, emailHint(user.email), user.suspendedAt && "Suspended"]
      .filter(Boolean)
      .join(" · "),
  fields: (user) => ({
    github: user.githubLogin ?? "",
    projects: user.memberships,
    suspended: user.suspendedAt !== null,
    joined: user.createdAt,
  }),
  render: (user) => userBlocks(user),
  actions: (action) => ({
    suspend: action({
      description:
        "Signs them out everywhere and stops them from signing in, translating or suggesting. Their work stays as it is.",
      input: z.object({
        reason: z.string().trim().min(1).max(300).describe("For the record; they don’t see it"),
      }),
      danger: "reauth",
      when: (user) => user.suspendedAt === null,
      run: async ({ record, input }) => {
        await suspend(record.id, input.reason)
        return `Suspended ${nameOf(record)}`
      },
    }),
    reinstate: action({
      description: "Lets them sign in and translate again.",
      danger: "confirm",
      when: (user) => user.suspendedAt !== null,
      run: async ({ record }) => {
        await reinstate(record.id)
        return `${nameOf(record)} can sign in again`
      },
    }),
    signOut: action({
      label: "Sign out everywhere",
      description: "Ends every session. A browser they have open keeps working for up to five minutes.",
      danger: "confirm",
      when: (user) => user.sessions > 0,
      run: async ({ record }) => `Ended ${counted(await revokeSessions(record.id), "session")}`,
    }),
    removeWork: action({
      label: "Remove their work",
      description:
        "Puts back what the repository has for every translation they last changed that isn't in the repository yet, and deletes their suggestions. What's already merged stays.",
      input: z.object({ project: z.string() }),
      choices: {
        project: async (user) => {
          const work = await users.work(user.id)
          const slugs = await projects.slugs(work.map((row) => row.projectId))
          return [
            { value: EVERYWHERE, label: "Every project" },
            ...work.map((row) => ({
              value: row.projectId,
              label: slugs.get(row.projectId) ?? row.projectId,
            })),
          ]
        },
      },
      defaults: () => ({ project: EVERYWHERE }),
      danger: "reauth",
      run: async ({ record, input }) =>
        removedSummary(
          await removeContributions(record.id, input.project === EVERYWHERE ? null : input.project),
        ),
    }),
    removeFromProject: action({
      label: "Remove from a project",
      description:
        "Takes away their role in one project. Access that comes from GitHub comes back on its own.",
      input: z.object({ project: z.string() }),
      choices: {
        project: async (user) =>
          (await users.memberships(user.id)).map(({ member, slug }) => ({
            value: member.projectId,
            label: slug,
          })),
      },
      danger: "confirm",
      when: (user) => user.memberships > 0,
      run: async ({ record, input }) => {
        const [removed] = await db
          .delete(schema.member)
          .where(and(eq(schema.member.userId, record.id), eq(schema.member.projectId, input.project)))
          .returning({ projectId: schema.member.projectId })
        if (!removed) throw new Error("They aren't a member of that project any more")
        return `Removed ${nameOf(record)} from the project`
      },
    }),
    delete: action({
      label: "Delete account",
      description:
        "Deletes the account, its sign-ins, passkeys and memberships. Their translations stay, credited to a translator without a name. To take those out too, remove their work first.",
      danger: "reauth",
      run: async ({ record }) => {
        await deleteAccount(record.id)
        return `Deleted ${nameOf(record)}'s account`
      },
    }),
  }),
})
