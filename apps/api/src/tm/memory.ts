import { DurableObject, env } from "cloudflare:workers"
import { migrate } from "../lib/migrate.ts"
import { bandsOf } from "./minhash.ts"

export type MemoryRow = [sourceId: number, textHash: number, plain: string, body: string]

export interface Candidate {
  project_id: string
  plain: string
  body: string
}

type Stored = [id: number, ...MemoryRow]

const MEMORY_SCHEMA = [
  `CREATE TABLE project (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE entry (
    id INTEGER PRIMARY KEY,
    project INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    text_hash INTEGER NOT NULL,
    plain TEXT NOT NULL,
    body TEXT NOT NULL,
    UNIQUE (project, source_id)
  );

  CREATE INDEX entry_text ON entry (text_hash);

  CREATE TABLE band (
    band INTEGER NOT NULL,
    entry INTEGER NOT NULL,
    PRIMARY KEY (band, entry)
  ) WITHOUT ROWID;`,
]

const CANDIDATE_COLUMNS = "p.name project_id, e.plain, e.body"

export class Memory extends DurableObject<Env> {
  private readonly sql = this.ctx.storage.sql

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    migrate(ctx.storage, MEMORY_SCHEMA)
  }

  replace(projectId: string, rows: MemoryRow[]) {
    this.ctx.storage.transactionSync(() => {
      const project = this.projectNumber(projectId)
      const existing = new Map(
        (
          [
            ...this.sql
              .exec("SELECT id, source_id, text_hash, plain, body FROM entry WHERE project = ?", project)
              .raw(),
          ] as Stored[]
        ).map((row) => [row[1], row]),
      )
      for (const row of rows) {
        const before = existing.get(row[0])
        existing.delete(row[0])
        if (before) this.update(before, row)
        else this.insert(project, row)
      }
      for (const row of existing.values()) {
        this.sql.exec("DELETE FROM entry WHERE id = ?", row[0])
        this.dropBands(row)
      }
    })
  }

  lookup(projectId: string, textHash: number, bands: number[], limit: { exact: number; near: number }) {
    const own =
      this.sql.exec<{ id: number }>("SELECT id FROM project WHERE name = ?", projectId).toArray()[0]?.id ?? 0
    const exact = this.sql
      .exec(
        `SELECT ${CANDIDATE_COLUMNS} FROM entry e JOIN project p ON p.id = e.project
         WHERE e.text_hash = ? AND e.project != ? LIMIT ?`,
        textHash,
        own,
        limit.exact,
      )
      .toArray()
    const near = bands.length
      ? this.sql
          .exec(
            `WITH near AS (SELECT b.entry FROM band b JOIN entry e ON e.id = b.entry
               WHERE b.band IN (SELECT value FROM json_each(?1)) AND e.project != ?2
               GROUP BY b.entry ORDER BY count(*) DESC LIMIT ?3)
             SELECT ${CANDIDATE_COLUMNS} FROM near JOIN entry e ON e.id = near.entry JOIN project p ON p.id = e.project`,
            JSON.stringify(bands),
            own,
            limit.near,
          )
          .toArray()
      : []
    return [...exact, ...near] as unknown as Candidate[]
  }

  private projectNumber(projectId: string) {
    this.sql.exec("INSERT OR IGNORE INTO project (name) VALUES (?)", projectId)
    return this.sql.exec<{ id: number }>("SELECT id FROM project WHERE name = ?", projectId).one().id
  }

  private insert(project: number, [sourceId, textHash, plain, body]: MemoryRow) {
    const { id } = this.sql
      .exec<{ id: number }>(
        "INSERT INTO entry (project, source_id, text_hash, plain, body) VALUES (?, ?, ?, ?, ?) RETURNING id",
        project,
        sourceId,
        textHash,
        plain,
        body,
      )
      .one()
    this.addBands(id, plain)
  }

  private update(before: Stored, [, textHash, plain, body]: MemoryRow) {
    if (before[2] === textHash && before[3] === plain && before[4] === body) return
    this.sql.exec(
      "UPDATE entry SET text_hash = ?, plain = ?, body = ? WHERE id = ?",
      textHash,
      plain,
      body,
      before[0],
    )
    if (before[3] === plain) return
    this.dropBands(before)
    this.addBands(before[0], plain)
  }

  private addBands(entry: number, plain: string) {
    for (const band of bandsOf(plain)) this.sql.exec("INSERT OR IGNORE INTO band VALUES (?, ?)", band, entry)
  }

  private dropBands([entry, , , plain]: Stored) {
    for (const band of bandsOf(plain))
      this.sql.exec("DELETE FROM band WHERE band = ? AND entry = ?", band, entry)
  }
}

export const memoryOf = (sourceLang: string, lang: string) => env.MEMORY.getByName(`${sourceLang}:${lang}`)
