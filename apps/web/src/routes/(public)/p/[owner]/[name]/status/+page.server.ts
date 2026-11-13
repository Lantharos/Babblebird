import type { MissingRow } from "@babblebird/protocol"
import { fetchApi } from "#lib/api/load.ts"
import { projectPath } from "#lib/projects/project.svelte.ts"

export async function load({ fetch, params }) {
  return { missing: await fetchApi<MissingRow[]>(fetch, `${projectPath(params.owner, params.name)}/missing`) }
}
