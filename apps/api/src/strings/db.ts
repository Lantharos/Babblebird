export interface Usage {
  read: number
  written: number
}

export class Db {
  readonly usage: Usage = { read: 0, written: 0 }

  constructor(private readonly sql: SqlStorage) {}

  all<T>(query: string, ...params: SqlStorageValue[]) {
    const cursor = this.sql.exec(query, ...params)
    const rows = cursor.toArray()
    this.count(cursor)
    return rows as T[]
  }

  one<T>(query: string, ...params: SqlStorageValue[]) {
    return this.all<T>(query, ...params)[0] ?? null
  }

  rows<T extends unknown[]>(query: string, ...params: SqlStorageValue[]) {
    const cursor = this.sql.exec(query, ...params)
    const rows = [...cursor.raw()]
    this.count(cursor)
    return rows as T[]
  }

  run(query: string, ...params: SqlStorageValue[]) {
    this.count(this.sql.exec(query, ...params))
  }

  each(query: string, rows: SqlStorageValue[][]) {
    for (const row of rows) this.run(query, ...row)
  }

  private count(cursor: SqlStorageCursor<Record<string, SqlStorageValue>>) {
    this.usage.read += cursor.rowsRead
    this.usage.written += cursor.rowsWritten
  }
}
