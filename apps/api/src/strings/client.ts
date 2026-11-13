import { env } from "cloudflare:workers"

export const stringsOf = (project: { id: string }) => env.STRINGS.getByName(project.id)

export async function query<T>(project: { id: string }, sql: string, ...params: SqlStorageValue[]) {
  return (await stringsOf(project).query(sql, params)) as unknown as T[]
}

export async function queryOne<T>(project: { id: string }, sql: string, ...params: SqlStorageValue[]) {
  return (await query<T>(project, sql, ...params))[0] ?? null
}

export async function republish(projects: { id: string }[]) {
  await Promise.all(projects.map((project) => stringsOf(project).republish()))
}
