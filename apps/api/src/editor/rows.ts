import { type StringRow, stateName } from "@babblebird/protocol"
import { peopleById, personOf } from "./people.ts"
import type { StringRecord } from "./queries.ts"

export async function rowsOf(records: StringRecord[]): Promise<StringRow[]> {
  const people = await peopleById(records.map((record) => record.t_by))
  return records.map((record) => ({
    id: record.id,
    key: record.key,
    file: record.pattern,
    position: record.position,
    body: record.body,
    comment: record.comment,
    section: record.section,
    words: record.words,
    suggestions: record.suggestions,
    translation:
      record.t_body === null
        ? null
        : {
            body: record.t_body,
            state: stateName(record.t_state),
            flags: record.t_flags ?? 0,
            by: personOf(people, record.t_by, record.t_credit),
            at: record.t_at ?? 0,
            stale: record.t_source_hash !== record.hash,
          },
  }))
}
