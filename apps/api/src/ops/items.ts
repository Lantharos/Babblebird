import type { Pult } from "@lantharos/pult"
import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { projects } from "./data/projects.ts"
import { failures, newProjects } from "./define/inboxes.ts"
import { project as projectResource } from "./define/project.ts"
import type { Failure } from "./events.ts"

export async function sendFailure(pult: Pult, failure: Omit<Failure, "error"> & { detail: string }) {
  const project = await projects.byId(failure.projectId)
  if (!project) return
  const retry = failure.kind === "sync" ? projectResource.actions.resync : projectResource.actions.sendNow
  await pult.send(failures, {
    fingerprint: `${failure.kind}:${project.id}`,
    record: project.id,
    tags: [failure.kind],
    data: { project: project.slug, kind: failure.kind, problem: failure.problem, detail: failure.detail },
    suggest: [{ action: retry, reason: "Babblebird tries again within ten minutes by itself" }],
  })
}

export async function sendNewProject(pult: Pult, projectId: string) {
  const project = await projects.byId(projectId)
  if (!project || project.pultItem) return
  const sent = await pult.send(newProjects, {
    fingerprint: project.id,
    record: project.id,
    tags: project.private ? ["private"] : [],
    data: {
      project: project.slug,
      account: project.account ?? project.owner,
      description: project.description,
      private: project.private,
    },
  })
  await db.update(schema.project).set({ pultItem: sent.id }).where(eq(schema.project.id, project.id))
}
