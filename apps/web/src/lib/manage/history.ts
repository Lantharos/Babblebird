import { englishName, type SyncEntry } from "@babblebird/protocol"

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export function titleOf(entry: SyncEntry) {
  if (entry.message) return entry.message
  if (entry.reason === "install") return "First sync"
  if (entry.reason === "manual") return "Synced on request"
  if (entry.reason === "automatic") return "Synced by Babblebird"
  return "Synced after a push"
}

export function changesOf(entry: SyncEntry) {
  const translations = entry.translationFiles ?? (entry.sourceFiles === undefined ? (entry.files ?? 0) : 0)
  const sources = entry.sourceFiles ?? 0
  if (!translations && !sources) return "No translation files changed"
  const parts: string[] = []
  if (sources) parts.push(`English changed in ${plural(sources, "file", "files")}`)
  if (translations) {
    const languages = entry.languages ?? []
    const named =
      languages.length && languages.length <= 3
        ? ` (${languages.map(englishName).join(", ")})`
        : languages.length
          ? ` in ${languages.length} languages`
          : ""
    parts.push(`${plural(translations, "translation file", "translation files")} changed${named}`)
  }
  return parts.join(", ")
}
