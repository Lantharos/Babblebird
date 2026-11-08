import { b, inbox, noul, tag, triage } from "@lantharos/pult"
import { z } from "zod"
import { projects } from "../data/projects.ts"
import { projectBlocks } from "../render/project.ts"
import { project } from "./project.ts"

const FAILED = { sync: "Reading the repository failed", delivery: "Sending translations failed" }

export const failures = inbox("failures", {
  icon: "bug",
  resource: project,
  states: ["open", "fixed", "ignored"],
  closed: ["fixed", "ignored"],
  reopenOn: "new-occurrence",
  reopenFrom: ["fixed"],
  sla: { open: "1d" },
  columns: ["title", "occurrences", "tags", "lastSeen"],
  data: z.object({
    project: z.string(),
    kind: z.enum(["sync", "delivery"]),
    problem: z.string(),
    detail: z.string(),
  }),
  title: (data) => `${FAILED[data.kind]} for ${data.project}`,
  render: (item) => [
    b.fields({
      project: item.record ? b.ref("project", item.record, item.data.project) : item.data.project,
      problem: item.data.problem,
      times: item.occurrences,
      "first seen": item.firstSeen,
      "last seen": item.lastSeen,
    }),
    b.code(item.data.detail, { lang: "trace", title: "What went wrong" }),
  ],
})

const INSTRUCTIONS =
  "Each item is a GitHub repository whose owner just added Babblebird, a translation platform for open source projects. " +
  "It shows what Babblebird found in the repository: its description, languages and how many strings it has. " +
  "Most are real projects. Flag only ones that plainly look like spam, advertising or content that isn't software."

export const newProjects = inbox("new-projects", {
  label: "New projects",
  icon: "rocket",
  resource: project,
  states: ["open", "fine", "removed"],
  closed: ["fine", "removed"],
  sla: { open: "3d" },
  data: z.object({
    project: z.string(),
    account: z.string(),
    description: z.string().nullable(),
    private: z.boolean(),
  }),
  title: (data) => data.project,
  triage: triage({
    instructions: INSTRUCTIONS,
    questions: {
      spam: noul("Does this repository look like spam, advertising or something other than software?"),
    },
    rules: [{ name: "Flag spam", when: (answers) => answers.spam > 0.8, then: tag("suspicious") }],
  }),
  render: async (item) => {
    const found = item.record ? await projects.byId(item.record) : null
    if (!found) return [b.markdown("This project no longer exists.")]
    return [...(found.description ? [b.markdown(found.description)] : []), ...(await projectBlocks(found))]
  },
})
