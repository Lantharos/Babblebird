import type { Delivery, Role, WhoTranslates } from "@babblebird/protocol"
import type { ProjectRow } from "../../db/core.ts"
import type { SyncReason } from "../../sync/jobs.ts"

export const PROJECT_STATE: Record<ProjectRow["state"], string> = {
  scanning: "Reading the repository",
  ready: "Ready",
  empty: "No translations found",
  failed: "Reading failed",
  removed: "Removed",
}

export const DELIVERY: Record<Delivery, string> = {
  off: "Not sent back",
  pull: "Pull requests merged by hand",
  branch: "Pull requests merged after the checks",
  direct: "Straight to the default branch",
}

export const WHO_TRANSLATES: Record<WhoTranslates, string> = {
  anyone: "Anyone signed in",
  members: "Members only",
}

export const ROLE: Record<Role, string> = {
  translator: "Translator",
  reviewer: "Reviewer",
  admin: "Maintainer",
}

export const SYNC_REASON: Record<SyncReason, string> = {
  install: "Added",
  push: "Push",
  manual: "By hand",
  automatic: "Retry",
}

export const PROVIDER: Record<string, string> = { github: "GitHub", google: "Google" }

export const ACTIVITY: Record<string, string> = {
  translated: "Translated",
  approved: "Approved",
  accepted: "Accepted a suggestion",
}

export const counted = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`
