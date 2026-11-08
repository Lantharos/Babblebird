import { env } from "cloudflare:workers"
import { b } from "@lantharos/pult"

export const projectPage = (project: { slug: string }) => `${env.PUBLIC_URL}/p/${project.slug}`

export function repositoryLink(project: { owner: string; name: string }) {
  return b.link(`https://github.com/${project.owner}/${project.name}`, `${project.owner}/${project.name}`)
}

export function commitLink(project: { owner: string; name: string }, sha: string | null) {
  return sha
    ? b.link(`https://github.com/${project.owner}/${project.name}/commit/${sha}`, sha.slice(0, 12))
    : undefined
}

export function pullLink(project: { owner: string; name: string }, number: number | null) {
  return number
    ? b.link(`https://github.com/${project.owner}/${project.name}/pull/${number}`, `#${number}`)
    : undefined
}

export function githubLink(login: string | null) {
  return login ? b.link(`https://github.com/${login}`, login) : undefined
}

export function emailHint(email: string) {
  const [name, domain] = email.split("@")
  return `${name![0]}…@${domain}`
}
