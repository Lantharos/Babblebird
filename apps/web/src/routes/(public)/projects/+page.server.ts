import { fetchApi } from "#lib/api/load.ts"
import { browsedLanguages } from "#lib/api/session.svelte.ts"
import { type ProjectList, projectListPath } from "#lib/projects/project.svelte.ts"

export async function load({ fetch, parent }) {
  const { me, language } = await parent()
  return {
    list: await fetchApi<ProjectList>(fetch, projectListPath(browsedLanguages(me, language), true, "", 0)),
  }
}
