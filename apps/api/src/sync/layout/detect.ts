import type { TreeEntry } from "../../github/repo.ts"
import type { Config } from "./config.ts"
import { globPattern, matchesAny } from "./glob.ts"
import { MANIFESTS, type Manifest } from "./manifests.ts"

export interface DetectedFile {
  pattern: string
  langs: Map<string, TreeEntry>
}

export interface DetectedArea {
  slug: string
  name: string
  icon: TreeEntry | null
  files: DetectedFile[]
}

const LOCALE_FILE = /^(?:(.*)\/)?locales\/([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})*)\/([^/]+\.ftl)$/

function canonical(tag: string) {
  try {
    return Intl.getCanonicalLocales(tag.replace("_", "-"))[0] ?? null
  } catch {
    return null
  }
}

export function localeFiles(tree: TreeEntry[], config: Config) {
  const files = new Map<string, DetectedFile>()
  for (const entry of tree) {
    const match = LOCALE_FILE.exec(entry.path)
    if (!match || matchesAny(entry.path, config.ignore)) continue
    const lang = canonical(match[2]!)
    if (!lang) continue
    const pattern = `${match[1] ? `${match[1]}/` : ""}locales/{lang}/${match[3]}`
    const file = files.get(pattern) ?? { pattern, langs: new Map() }
    file.langs.set(lang, entry)
    files.set(pattern, file)
  }
  return [...files.values()].filter((file) => file.langs.has(config.source))
}

const rootOf = (pattern: string) => pattern.slice(0, Math.max(0, pattern.indexOf("locales/{lang}") - 1))

function ancestors(dir: string) {
  const found = [dir]
  for (let current = dir; current; ) {
    current = current.includes("/") ? current.slice(0, current.lastIndexOf("/")) : ""
    found.push(current)
  }
  return found
}

const manifestIn = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)

export function manifestOwner(pattern: string, paths: Set<string>) {
  for (const dir of ancestors(rootOf(pattern)))
    for (const name of MANIFESTS) if (paths.has(manifestIn(dir, name))) return manifestIn(dir, name)
  return null
}

const words = (name: string) => name.replace(/\.ftl$/, "").replace(/[-_]+/g, " ")
const titled = (name: string) =>
  words(name)
    .split(" ")
    .map((word, index) =>
      word.length <= 2 ? word.toUpperCase() : index === 0 ? word[0]!.toUpperCase() + word.slice(1) : word,
    )
    .join(" ")
const lastFolder = (path: string) => path.split("/").pop() || path
const parentFolder = (path: string) => lastFolder(path.slice(0, Math.max(0, path.lastIndexOf("/"))))

export function slugOf(name: string) {
  return (
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "area"
  )
}

interface Draft {
  name: string
  qualifier: string | null
  icon: string | null
  files: DetectedFile[]
}

function automatic(files: DetectedFile[], paths: Set<string>, manifests: Map<string, Manifest>) {
  const owned = new Map<string, Draft>()
  const loose = new Map<string, DetectedFile[]>()
  for (const file of files) {
    const owner = manifestOwner(file.pattern, paths)
    if (owner) {
      const manifest = manifests.get(owner)
      const dir = owner.slice(0, Math.max(0, owner.lastIndexOf("/")))
      const draft = owned.get(owner) ?? {
        name: manifest?.name ?? titled(lastFolder(dir)),
        qualifier: null,
        icon: manifest?.icon ?? null,
        files: [],
      }
      draft.files.push(file)
      owned.set(owner, draft)
    } else {
      const root = rootOf(file.pattern)
      loose.set(root, [...(loose.get(root) ?? []), file])
    }
  }
  const drafts = [...owned.values()]
  for (const [root, group] of loose) {
    if (group.length === 1)
      drafts.push({
        name: titled(lastFolder(root || "translations")),
        qualifier: parentFolder(root) || null,
        icon: null,
        files: group,
      })
    else
      for (const file of group)
        drafts.push({
          name: titled(file.pattern.slice(file.pattern.lastIndexOf("/") + 1)),
          qualifier: lastFolder(root) || null,
          icon: null,
          files: [file],
        })
  }
  return drafts
}

function distinctNames(drafts: Draft[]) {
  const counts = new Map<string, number>()
  for (const draft of drafts) counts.set(draft.name, (counts.get(draft.name) ?? 0) + 1)
  for (const draft of drafts)
    if (counts.get(draft.name)! > 1 && draft.qualifier)
      draft.name = titled(`${draft.qualifier} ${draft.name.toLowerCase()}`)
}

export const LAYOUT_VERSION = 2

const PROJECT_ICONS = [
  ".github/logo.svg",
  "logo.svg",
  "icon.svg",
  "assets/logo.svg",
  "docs/logo.svg",
  "public/favicon.svg",
  "static/favicon.svg",
  ".github/logo.png",
  "logo.png",
  "icon.png",
]

export function projectIcon(tree: TreeEntry[], config: Config) {
  const byPath = new Map(tree.map((entry) => [entry.path, entry]))
  const path = config.icon ?? PROJECT_ICONS.find((candidate) => byPath.has(candidate))
  return path ? (byPath.get(path) ?? null) : null
}

export function detectAreas(
  tree: TreeEntry[],
  config: Config,
  manifests: Map<string, Manifest>,
): DetectedArea[] {
  const byPath = new Map(tree.map((entry) => [entry.path, entry]))
  const paths = new Set(byPath.keys())
  let files = localeFiles(tree, config)
  const configured: Draft[] = config.areas.map((area) => {
    const claimed = files.filter((file) => area.files.some((glob) => globPattern(glob).test(file.pattern)))
    files = files.filter((file) => !claimed.includes(file))
    const owners = new Set(claimed.map((file) => manifestOwner(file.pattern, paths)))
    const [owner] = owners
    const ownIcon = owners.size === 1 && owner ? (manifests.get(owner)?.icon ?? null) : null
    return { name: area.name, qualifier: null, icon: area.icon ?? ownIcon, files: claimed }
  })
  const found = automatic(files, paths, manifests).sort((a, b) => a.name.localeCompare(b.name))
  distinctNames(found)
  const slugs = new Set<string>()
  return [...configured.filter((draft) => draft.files.length), ...found].map((draft) => {
    let slug = slugOf(draft.name)
    for (let index = 2; slugs.has(slug); index++) slug = `${slugOf(draft.name)}-${index}`
    slugs.add(slug)
    const icon = draft.icon
    return {
      slug,
      name: draft.name,
      icon: icon ? (byPath.get(icon) ?? null) : null,
      files: draft.files.sort((a, b) => a.pattern.localeCompare(b.pattern)),
    }
  })
}
