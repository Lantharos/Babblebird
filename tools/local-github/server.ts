import { parseArgs } from "node:util"
import { blame } from "./blame.ts"
import { Git } from "./git.ts"
import { autoMerge, writeRoutes } from "./writes.ts"

const { values } = parseArgs({
  options: {
    repo: { type: "string" },
    owner: { type: "string", default: "Lantharos" },
    name: { type: "string", default: "Luft" },
    login: { type: "string", default: "kristof" },
    port: { type: "string", default: "8790" },
  },
})

export const git = new Git(values.repo!)
export const repo = { owner: values.owner!, name: values.name! }
const REPO_ID = 4242
const prefix = `/repos/${repo.owner}/${repo.name}`

const json = (data: unknown, status = 200) => Response.json(data, { status })

function graphql(query: string, variables: Record<string, string>) {
  const blobs = [...query.matchAll(/(b\d+): object\(oid: "([0-9a-f]{40})"\)/g)]
  if (blobs.length) {
    const found = git.blobs(blobs.map((match) => match[2]!))
    return {
      repository: Object.fromEntries(
        blobs.map(([, alias, sha]) => [
          alias,
          { text: found.get(sha!)?.toString("utf8") ?? null, isTruncated: false },
        ]),
      ),
    }
  }
  const paths = [...query.matchAll(/(b\d+): object\(expression: ("(?:[^"\\]|\\.)*")\)/g)]
  if (paths.length) {
    const show = (expression: string) => {
      const result = Bun.spawnSync(["git", "-C", git.dir, "show", expression])
      return result.exitCode === 0 ? { text: result.stdout.toString() } : null
    }
    return {
      repository: Object.fromEntries(
        paths.map(([, alias, expression]) => [alias, show(JSON.parse(expression!))]),
      ),
    }
  }
  const blames = [...query.matchAll(/(f\d+): blame\(path: ("(?:[^"\\]|\\.)*")\)/g)]
  return {
    repository: {
      object: Object.fromEntries(
        blames.map(([, alias, path]) => [alias, blame(git, variables.sha!, JSON.parse(path!))]),
      ),
    },
  }
}

const routes: [
  RegExp,
  string,
  (match: RegExpExecArray, request: Request, url: URL) => Response | Promise<Response>,
][] = [
  [
    /^\/app\/installations\/(\d+)\/access_tokens$/,
    "POST",
    () =>
      json({ token: "local-installation-token", expires_at: new Date(Date.now() + 3_600_000).toISOString() }),
  ],
  [/^\/user$/, "GET", () => json({ id: 1, login: values.login })],
  [
    new RegExp(`^${prefix}$`),
    "GET",
    () =>
      json({
        id: REPO_ID,
        name: repo.name,
        private: false,
        description: "Local copy",
        default_branch: "main",
        owner: { login: repo.owner },
      }),
  ],
  [
    new RegExp(`^${prefix}/branches/([^/]+)$`),
    "GET",
    (match) => json({ commit: { sha: git.resolve(decodeURIComponent(match[1]!)) } }),
  ],
  [
    new RegExp(`^${prefix}/collaborators/([^/]+)/permission$`),
    "GET",
    (match) => json({ permission: match[1] === values.login ? "admin" : "read" }),
  ],
  [
    new RegExp(`^${prefix}/git/trees/([0-9a-f]{40})$`),
    "GET",
    (match) => json({ sha: match[1], truncated: false, tree: git.tree(match[1]!) }),
  ],
  [
    new RegExp(`^${prefix}/git/blobs/([0-9a-f]{40})$`),
    "GET",
    (match) => new Response(git.blobs([match[1]!]).get(match[1]!)),
  ],
  [
    /^\/graphql$/,
    "POST",
    async (_, request) => {
      const { query, variables } = (await request.json()) as {
        query: string
        variables: Record<string, string>
      }
      if (query.includes("enablePullRequestAutoMerge")) return json(autoMerge())
      return json({ data: graphql(query, variables) })
    },
  ],
  ...writeRoutes(prefix),
]

Bun.serve({
  port: Number(values.port),
  idleTimeout: 120,
  async fetch(request) {
    const url = new URL(request.url)
    for (const [pattern, method, handle] of routes) {
      const match = pattern.exec(url.pathname)
      if (match && request.method === method) return handle(match, request, url)
    }
    console.log("unhandled", request.method, url.pathname)
    return json({ message: "Not Found" }, 404)
  },
})

console.log(`Serving ${values.repo} as ${repo.owner}/${repo.name} on http://localhost:${values.port}`)
