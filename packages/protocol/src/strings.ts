import type { StateName } from "./states.ts"

export interface Person {
  id: string | null
  name: string
  image: string | null
}

export interface TranslationView {
  body: string
  state: StateName
  flags: number
  by: Person | null
  at: number
  stale: boolean
}

export interface StringRow {
  id: number
  key: string
  file: string
  position: number
  body: string
  comment: string | null
  section: string | null
  words: number
  translation: TranslationView | null
  suggestions: number
}

export interface StringPage {
  rows: StringRow[]
  next: string | null
}

export interface MemoryMatch {
  body: string
  source: string
  similarity: number
  project: string
}

export interface GlossaryEntry {
  id: number
  lang: string
  term: string
  translation: string | null
  note: string | null
}

export interface SuggestionView {
  id: number
  body: string
  note: string | null
  by: Person
  at: number
}

export interface Screenshot {
  id: number
  name: string
  url: string
  width: number
  height: number
  box: { x: number; y: number; w: number; h: number } | null
}

export interface ActivityEntry {
  id: number
  kind: string
  lang: string | null
  key: string | null
  sourceId: number | null
  detail: string | null
  by: Person | null
  at: number
}

export interface StringDetail {
  glossary: GlossaryEntry[]
  memory: MemoryMatch[]
  suggestions: SuggestionView[]
  screenshots: Screenshot[]
  history: ActivityEntry[]
  sourceChanged: string | null
}
