import type { Project } from "@babblebird/protocol"
import { fetchApi } from "#lib/api/load.ts"
import { projectPath } from "#lib/projects/project.svelte.ts"

export async function load({ fetch, params }) {
  return { project: await fetchApi<Project>(fetch, projectPath(params.owner, params.name)) }
}
