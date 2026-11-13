import type { Progress } from "@babblebird/protocol"
import { percent } from "#lib/format/languages.ts"

export const donePercent = (progress: Progress | null, total: number) =>
  progress ? percent(progress.translated - progress.review, total) : 0
