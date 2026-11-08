import { b, home, page } from "@lantharos/pult"
import {
  deliveryProblems,
  failingProjects,
  importingProjects,
  pausedProjects,
  serviceTotals,
  suspendedUsers,
} from "../data/service.ts"
import { deliveries, newAccounts } from "./flags.ts"
import { failures, newProjects } from "./inboxes.ts"
import { mail } from "./mail.ts"

export default home([
  b.columns(
    [b.count(failures, { filter: { state: "open" }, label: "Failures" })],
    [b.count(newProjects, { filter: { state: "open" }, label: "New projects" })],
    [b.count(mail, { filter: { state: "open" }, label: "Mail" })],
  ),
  b.columns(
    [b.items(failures, { filter: { state: "open" }, limit: 5 })],
    [b.items(newProjects, { filter: { state: "open" }, limit: 5 })],
  ),
  b.items(mail, { filter: { state: "open" }, limit: 5 }),
  b.columns([b.flag(deliveries)], [b.flag(newAccounts)]),
])

export const overview = page("overview", {
  icon: "gauge",
  render: async () => {
    const [totals, failing, importing, undelivered, paused, suspended] = await Promise.all([
      serviceTotals(),
      failingProjects(),
      importingProjects(),
      deliveryProblems(),
      pausedProjects(),
      suspendedUsers(),
    ])
    return [
      b.stats({
        Projects: { value: totals.projects, note: `${totals.ready} ready` },
        People: { value: totals.users, note: `${totals.newUsers} this week` },
        Translations: totals.translated,
        "Open pull requests": totals.openPulls,
      }),
      b.table(
        failing.map((project) => ({
          project: b.ref("project", project.id, project.slug),
          problem: project.problem ?? "",
          since: project.updatedAt,
        })),
        { title: "Reading failed" },
      ),
      b.table(
        undelivered.map((project) => ({
          project: b.ref("project", project.id, project.slug),
          problem: project.problem ?? "",
        })),
        { title: "Delivery problems" },
      ),
      b.table(
        importing.map((project) => ({
          project: b.ref("project", project.id, project.slug),
          files: project.total ? `${project.done} of ${project.total}` : "Looking",
          since: project.updatedAt,
        })),
        { title: "Importing" },
      ),
      b.table(
        paused.map((project) => ({
          project: b.ref("project", project.id, project.slug),
          reason: project.reason ?? "",
          since: project.since ?? "",
        })),
        { title: "Paused" },
      ),
      b.table(
        suspended.map((user) => ({
          person: b.ref("user", user.id, user.name || undefined),
          reason: user.reason ?? "",
          since: user.since ?? "",
        })),
        { title: "Suspended" },
      ),
      b.columns([b.flag(deliveries)], [b.flag(newAccounts)]),
    ]
  },
})
