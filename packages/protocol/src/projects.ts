import type { Delivery, Role, WhoTranslates } from "./states.ts"

export interface Progress {
  translated: number
  review: number
  approved: number
  problems: number
  suggested: number
}

export interface LanguageProgress extends Progress {
  lang: string
}

export type ProjectState = "scanning" | "ready" | "empty" | "failed" | "removed"

export interface ImportProgress {
  total: number
  done: number
  startedAt: number | null
}

export interface ProjectSummary {
  slug: string
  owner: string
  name: string
  description: string | null
  icon: string | null
  strings: number
  words: number
  languages: number
  state: ProjectState
  importing: ImportProgress | null
  progress: LanguageProgress[] | null
}

export interface ImportStatus {
  state: ProjectState
  problem: string | null
  importing: ImportProgress | null
  areas: { slug: string; name: string; icon: string | null; strings: number }[]
  strings: number
  translations: number
  languages: number
}

export interface AreaSummary {
  id: number
  slug: string
  name: string
  icon: string | null
  strings: number
  words: number
  progress: Progress | null
}

export interface Abilities {
  translate: boolean
  review: boolean
  admin: boolean
}

export interface Project extends Omit<ProjectSummary, "languages" | "progress"> {
  sourceLang: string
  languages: LanguageProgress[]
  problem: string | null
  paused: boolean
  syncedAt: number | null
  headSha: string | null
  delivery: Delivery
  whoTranslates: WhoTranslates
  role: Role | null
  can: Abilities
}

export interface Member {
  userId: string
  name: string
  image: string | null
  githubLogin: string | null
  role: Role
  languages: string[] | null
  areas: string[] | null
  fromGithub: boolean
}

export interface MissingRow {
  lang: string
  areas: { slug: string; name: string; missing: number; review: number; problems: number }[]
}

export interface SyncEntry {
  id: number
  at: number
  sha: string
  reason?: "install" | "push" | "manual" | "automatic"
  message?: string | null
  by?: string | null
  sourceFiles?: number
  translationFiles?: number
  languages?: string[]
  files?: number
}

export interface DeliveryStatus {
  waitingFiles: number
  pullNumber: number | null
  sentAt: number | null
  mergedAt: number | null
  closedAt: number | null
  problem: string | null
}
