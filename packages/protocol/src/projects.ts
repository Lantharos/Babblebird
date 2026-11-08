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

export interface ProjectSummary {
  slug: string
  owner: string
  name: string
  description: string | null
  strings: number
  words: number
  languages: number
  progress: Progress | null
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

export interface Project {
  slug: string
  owner: string
  name: string
  description: string | null
  sourceLang: string
  languages: LanguageProgress[]
  strings: number
  words: number
  state: "scanning" | "ready" | "empty" | "failed" | "removed"
  problem: string | null
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
