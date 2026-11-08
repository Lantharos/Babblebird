import { parse } from "smol-toml"

export const MANIFESTS = ["Sabine.toml", "extension.toml"] as const

export interface Manifest {
  name: string | null
  icon: string | null
}

const joined = (dir: string, path: string) => (dir ? `${dir}/${path}` : path).replace(/\/\.\//g, "/")

function tableOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)

export function readManifest(path: string, content: string, exists: (path: string) => boolean): Manifest {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
  let data: Record<string, unknown>
  try {
    data = parse(content)
  } catch {
    return { name: null, icon: null }
  }
  const section = path.endsWith("Sabine.toml") ? tableOf(data.app) : data
  const declared = text(section.icon)
  const candidates = [declared, "icon.svg", "icon.png"].filter((candidate) => candidate !== null)
  const icon = candidates.map((candidate) => joined(dir, candidate)).find(exists) ?? null
  return { name: text(section.name), icon }
}
