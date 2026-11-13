import type { AreaSummary } from "@babblebird/protocol"
import { fetchApi } from "#lib/api/load.ts"
import { areasPath } from "#lib/projects/project.svelte.ts"

export async function load({ fetch, params }) {
  return { areas: await fetchApi<AreaSummary[]>(fetch, areasPath(params.owner, params.name, params.lang)) }
}
