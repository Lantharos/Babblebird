import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { git } from "./server.ts"

type Route = [RegExp, string, (match: RegExpExecArray, request: Request) => Response | Promise<Response>]

interface Pull {
  number: number
  node_id: string
  head: string
  base: string
  title: string
  merged: boolean
}

const pulls: Pull[] = []
const json = (data: unknown, status = 200) => Response.json(data, { status })
const exists = (ref: string) =>
  Bun.spawnSync(["git", "-C", git.dir, "rev-parse", "--verify", "-q", ref]).exitCode === 0

function writeTree(base: string, files: { path: string; content: string }[]) {
  const index = join(mkdtempSync(join(tmpdir(), "babblebird-index-")), "index")
  const env = { ...process.env, GIT_INDEX_FILE: index }
  const run = (args: string[], input?: string) => {
    const result = Bun.spawnSync(["git", "-C", git.dir, ...args], {
      env,
      stdin: input === undefined ? undefined : Buffer.from(input),
    })
    if (result.exitCode !== 0) throw new Error(result.stderr.toString())
    return result.stdout.toString().trim()
  }
  run(["read-tree", base])
  for (const file of files) {
    const blob = run(["hash-object", "-w", "--stdin"], file.content)
    run(["update-index", "--add", "--cacheinfo", `100644,${blob},${file.path}`])
  }
  return run(["write-tree"])
}

function squash(pull: Pull) {
  const tree = git.text(["rev-parse", `${pull.head}^{tree}`]).trim()
  const parent = git.resolve(pull.base)
  const commit = git.text(["commit-tree", tree, "-p", parent, "-m", pull.title]).trim()
  git.run(["update-ref", `refs/heads/${pull.base}`, commit])
  pull.merged = true
  console.log(`merged #${pull.number} into ${pull.base} as ${commit}`)
}

export function writeRoutes(prefix: string): Route[] {
  return [
    [
      new RegExp(`^${prefix}/git/ref/heads/(.+)$`),
      "GET",
      (match) =>
        exists(`refs/heads/${match[1]}`)
          ? json({ object: { sha: git.resolve(`refs/heads/${match[1]}`) } })
          : json({ message: "Not Found" }, 404),
    ],
    [
      new RegExp(`^${prefix}/git/commits/([0-9a-f]{40})$`),
      "GET",
      (match) => json({ sha: match[1], tree: { sha: git.text(["rev-parse", `${match[1]}^{tree}`]).trim() } }),
    ],
    [
      new RegExp(`^${prefix}/git/trees$`),
      "POST",
      async (_, request) => {
        const { base_tree, tree } = (await request.json()) as {
          base_tree: string
          tree: { path: string; content: string }[]
        }
        return json({ sha: writeTree(base_tree, tree) }, 201)
      },
    ],
    [
      new RegExp(`^${prefix}/git/commits$`),
      "POST",
      async (_, request) => {
        const { message, tree, parents } = (await request.json()) as {
          message: string
          tree: string
          parents: string[]
        }
        const sha = git
          .text(["commit-tree", tree, ...parents.flatMap((parent) => ["-p", parent]), "-m", message])
          .trim()
        return json({ sha }, 201)
      },
    ],
    [
      new RegExp(`^${prefix}/git/refs/heads/(.+)$`),
      "PATCH",
      async (match, request) => {
        const { sha, force } = (await request.json()) as { sha: string; force: boolean }
        const ref = `refs/heads/${match[1]}`
        if (!exists(ref)) return json({ message: "Reference does not exist" }, 422)
        const fastForward =
          Bun.spawnSync(["git", "-C", git.dir, "merge-base", "--is-ancestor", ref, sha]).exitCode === 0
        if (!force && !fastForward) return json({ message: "Update is not a fast forward" }, 422)
        git.run(["update-ref", ref, sha])
        return json({ object: { sha } })
      },
    ],
    [
      new RegExp(`^${prefix}/git/refs$`),
      "POST",
      async (_, request) => {
        const { ref, sha } = (await request.json()) as { ref: string; sha: string }
        git.run(["update-ref", ref, sha])
        return json({ object: { sha } }, 201)
      },
    ],
    [new RegExp(`^${prefix}/pulls$`), "GET", () => json(pulls.filter((pull) => !pull.merged))],
    [
      new RegExp(`^${prefix}/pulls$`),
      "POST",
      async (_, request) => {
        const body = (await request.json()) as { title: string; head: string; base: string }
        const pull = { number: pulls.length + 1, node_id: `PR_${pulls.length + 1}`, ...body, merged: false }
        pulls.push(pull)
        return json(pull, 201)
      },
    ],
    [
      new RegExp(`^${prefix}/pulls/(\\d+)/merge$`),
      "PUT",
      (match) => {
        const pull = pulls.find((candidate) => candidate.number === Number(match[1]))
        if (!pull || pull.merged) return json({ message: "Not mergeable" }, 405)
        squash(pull)
        return json({ merged: true })
      },
    ],
  ]
}

export function autoMerge() {
  return {
    data: { enablePullRequestAutoMerge: null },
    errors: [{ message: "Pull request is in clean status" }],
  }
}
