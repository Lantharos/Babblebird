export const STATE = { translated: 1, review: 2, approved: 3 } as const

export type StateName = keyof typeof STATE | "untranslated"

export const stateName = (state: number | null): StateName =>
  state === STATE.approved
    ? "approved"
    : state === STATE.review
      ? "review"
      : state === STATE.translated
        ? "translated"
        : "untranslated"

export const FILTERS = ["all", "untranslated", "review", "problems", "suggested", "done"] as const
export type Filter = (typeof FILTERS)[number]

export type Role = "translator" | "reviewer" | "admin"
export type Delivery = "off" | "branch" | "direct"
export type WhoTranslates = "anyone" | "members"
