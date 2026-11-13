import type { Project, ProjectSummary } from "@babblebird/protocol"
import { type Resource, resource } from "#lib/api/resource.svelte.ts"

export interface ProjectList {
  projects: ProjectSummary[]
  more: boolean
  languages: string[]
}

export const projectPath = (owner: string, name: string) => `/projects/${owner}/${name}`

export const areasPath = (owner: string, name: string, lang: string) =>
  `${projectPath(owner, name)}/areas?lang=${lang}`

export function projectListPath(langs: string[], needs: boolean, search: string, page: number) {
  const query = new URLSearchParams({ page: String(page) })
  if (langs.length) query.set("langs", langs.join(","))
  if (langs.length && needs) query.set("needs", "1")
  if (search) query.set("q", search)
  return `/projects?${query}`
}

export function projectResource(owner: string, name: string): Resource<Project> {
  return resource<Project>(projectPath(owner, name))
}
