import { env } from "cloudflare:workers"

const JSON_CHUNK = 400_000
const STATEMENTS_PER_BATCH = 40

export const usage = { read: 0, written: 0 }

export function counted<T extends { meta: D1Meta }>(result: T) {
  usage.read += result.meta.rows_read
  usage.written += result.meta.rows_written
  return result
}

export function shard(project: { shard: number }) {
  return (env as unknown as Record<string, D1Database>)[`STRINGS_${project.shard}`]!
}

export function rowsAsJson(rows: unknown[][]) {
  const chunks: string[] = []
  let current: string[] = []
  let size = 0
  for (const row of rows) {
    const encoded = JSON.stringify(row)
    if (size + encoded.length > JSON_CHUNK && current.length) {
      chunks.push(`[${current.join(",")}]`)
      current = []
      size = 0
    }
    current.push(encoded)
    size += encoded.length + 1
  }
  if (current.length) chunks.push(`[${current.join(",")}]`)
  return chunks
}

export function eachRow(db: D1Database, sql: string, rows: unknown[][], ...before: unknown[]) {
  return rowsAsJson(rows).map((chunk) => db.prepare(sql).bind(...before, chunk))
}

export async function runAll(db: D1Database, statements: D1PreparedStatement[]) {
  for (let index = 0; index < statements.length; index += STATEMENTS_PER_BATCH)
    for (const result of await db.batch(statements.slice(index, index + STATEMENTS_PER_BATCH)))
      counted(result)
}

export async function all<T>(statement: D1PreparedStatement) {
  return counted(await statement.all<T>()).results
}

export async function first<T>(statement: D1PreparedStatement) {
  return (await all<T>(statement))[0] ?? null
}
