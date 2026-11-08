import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const input = (name) => process.env[`INPUT_${name.toUpperCase()}`]?.trim() ?? ""
const AUDIENCE = "https://babblebird.dev"

async function oidcToken() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!url || !token) throw new Error("This job needs `permissions: id-token: write` to send screenshots")
  const response = await fetch(`${url}&audience=${encodeURIComponent(AUDIENCE)}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`GitHub didn't hand out a token (${response.status})`)
  return (await response.json()).value
}

const PER_REQUEST = 40

async function send(token, base, screenshots) {
  const form = new FormData()
  form.set("manifest", JSON.stringify({ commit: process.env.GITHUB_SHA, screenshots }))
  for (const shot of screenshots)
    form.set(shot.file, new Blob([await readFile(resolve(base, shot.file))]), shot.file)
  const response = await fetch(`${input("url")}/api/projects/${process.env.GITHUB_REPOSITORY}/screenshots`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error ?? `Babblebird answered ${response.status}`)
  return result
}

async function main() {
  const manifestPath = resolve(input("manifest"))
  const { screenshots } = JSON.parse(await readFile(manifestPath, "utf8"))
  const token = await oidcToken()
  let strings = 0
  const unknown = new Set()
  for (let index = 0; index < screenshots.length; index += PER_REQUEST) {
    const result = await send(token, dirname(manifestPath), screenshots.slice(index, index + PER_REQUEST))
    strings += result.strings
    for (const key of result.unknown) unknown.add(key)
  }
  console.log(`Sent ${screenshots.length} screenshots showing ${strings} strings.`)
  if (unknown.size) console.log(`::warning::These keys aren't in the project: ${[...unknown].join(", ")}`)
}

main().catch((error) => {
  console.log(`::error::${error.message}`)
  process.exit(1)
})
