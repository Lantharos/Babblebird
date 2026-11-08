import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseArgs } from "node:util"
import { Git } from "./git.ts"

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    repo: { type: "string" },
    owner: { type: "string", default: "Lantharos" },
    name: { type: "string", default: "Luft" },
    api: { type: "string", default: "http://localhost:8787" },
    github: { type: "string", default: "http://localhost:8790" },
  },
})

const vars = readFileSync(join(import.meta.dir, "../../apps/api/.dev.vars"), "utf8")
const secret = /^GITHUB_WEBHOOK_SECRET=(.*)$/m.exec(vars)![1]!.trim()
const repository = { id: 4242, name: values.name, full_name: `${values.owner}/${values.name}` }
const installation = { id: 1, account: { login: values.owner } }

async function deliver(event: string, payload: unknown) {
  const body = JSON.stringify(payload)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  ).toHex()
  const response = await fetch(`${values.api}/api/github/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body,
  })
  console.log(event, response.status)
}

function pushOf(git: Git, before: string, after: string) {
  const shas = git
    .text(["rev-list", "--reverse", `${before}..${after}`])
    .trim()
    .split("\n")
    .filter(Boolean)
  const commits = shas.map((sha) => {
    const [name, message] = git.text(["log", "-1", "--format=%an%x00%B", sha]).split("\0") as [string, string]
    const changes = git
      .text(["diff-tree", "--no-commit-id", "--name-status", "-r", sha])
      .trim()
      .split("\n")
      .filter(Boolean)
    const of = (status: string) =>
      changes.filter((line) => line.startsWith(status)).map((line) => line.split("\t").pop()!)
    return { id: sha, message, author: { name }, added: of("A"), removed: of("D"), modified: of("M") }
  })
  const forced =
    Bun.spawnSync(["git", "-C", git.dir, "merge-base", "--is-ancestor", before, after]).exitCode !== 0
  return {
    ref: "refs/heads/main",
    before,
    after,
    deleted: false,
    forced,
    size: commits.length,
    commits,
    repository,
  }
}

const [command, ...rest] = positionals
if (command === "install")
  await deliver("installation", { action: "created", installation, repositories: [repository] })
else if (command === "push") {
  const git = new Git(values.repo!)
  await deliver("push", pushOf(git, git.resolve(rest[0]!), git.resolve(rest[1]!)))
} else if (command === "pull") {
  const [number, outcome] = rest
  await fetch(`${values.github}/repos/${values.owner}/${values.name}/pulls/${number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  })
  await deliver("pull_request", {
    action: "closed",
    pull_request: {
      number: Number(number),
      merged: outcome === "merged",
      head: { ref: "babblebird/translations" },
    },
    repository,
  })
} else
  console.log("Usage: send.ts install | push <before> <after> --repo <dir> | pull <number> merged|closed")
