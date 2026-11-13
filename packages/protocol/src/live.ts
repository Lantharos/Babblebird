import type { Progress } from "./projects.ts"
import type { StringRow } from "./strings.ts"

export interface Presence {
  id: string
  name: string
  image: string | null
  string: number | null
}

export type LiveEvent =
  | { type: "presence"; viewers: Presence[] }
  | { type: "changed"; area: string; row: StringRow; progress: Progress }
  | { type: "synced"; area: string }

export interface LiveFocus {
  type: "focus"
  string: number | null
}
