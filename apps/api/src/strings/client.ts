import { env } from "cloudflare:workers"
import type { ProjectStrings, Query, Result } from "./object.ts"

const JSON_CHUNK = 400_000
const STATEMENTS_PER_BATCH = 40

export const usage = { read: 0, written: 0 }

type Stub = DurableObjectStub<ProjectStrings>

function counted(result: Result) {
  usage.read += result.read
  usage.written += result.written
  return result
}

export class Statement {
  constructor(
    private readonly stub: Stub,
    readonly query: Query,
  ) {}

  bind(...params: SqlStorageValue[]) {
    return new Statement(this.stub, { sql: this.query.sql, params })
  }

  async all<T>() {
    return counted(await this.stub.run(this.query)).results as T[]
  }

  async run() {
    await this.all()
  }
}

export class Strings {
  constructor(private readonly stub: Stub) {}

  prepare(sql: string) {
    return new Statement(this.stub, { sql, params: [] })
  }

  async batch(statements: Statement[]) {
    return (await this.stub.batch(statements.map((statement) => statement.query))).map(counted)
  }

  republish() {
    return this.stub.republish()
  }
}

export const stringsOf = (project: { id: string }) => new Strings(env.STRINGS.getByName(project.id))

export async function republish(projects: { id: string }[]) {
  await Promise.all(projects.map((project) => stringsOf(project).republish()))
}

export const all = <T>(statement: Statement) => statement.all<T>()

export async function first<T>(statement: Statement) {
  return (await statement.all<T>())[0] ?? null
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

export function eachRow(strings: Strings, sql: string, rows: unknown[][], ...before: SqlStorageValue[]) {
  return rowsAsJson(rows).map((chunk) => strings.prepare(sql).bind(...before, chunk))
}

export async function runAll(strings: Strings, statements: Statement[]) {
  for (let index = 0; index < statements.length; index += STATEMENTS_PER_BATCH)
    await strings.batch(statements.slice(index, index + STATEMENTS_PER_BATCH))
}
