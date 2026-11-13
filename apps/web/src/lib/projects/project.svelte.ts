import type { Project } from "@babblebird/protocol"
import { type Resource, resource } from "#lib/api/resource.svelte.ts"

export const projectPath = (owner: string, name: string) => `/projects/${owner}/${name}`

export function projectResource(owner: string, name: string): Resource<Project> {
  return resource<Project>(projectPath(owner, name))
}
