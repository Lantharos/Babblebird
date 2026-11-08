import { env } from "cloudflare:workers"

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: string,
  ) {
    super(`GitHub answered ${status} for ${path}`)
  }
}

interface GitHubInit {
  token: string
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  accept?: string
}

export async function github<T>(
  path: string,
  { token, method = "GET", body, accept }: GitHubInit,
): Promise<T> {
  const response = await fetch(`${env.GITHUB_API}${path}`, {
    method,
    headers: {
      accept: accept ?? "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "babblebird.dev",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new GitHubError(response.status, path, await response.text())
  if (response.status === 204) return null as T
  return (accept?.includes("raw") ? await response.arrayBuffer() : await response.json()) as T
}

export async function maybe<T>(request: Promise<T>) {
  try {
    return await request
  } catch (error) {
    if (error instanceof GitHubError && (error.status === 404 || error.status === 409)) return null
    throw error
  }
}

export async function graphql<T>(token: string, query: string, variables: Record<string, unknown> = {}) {
  const result = await github<{ data: T; errors?: { message: string }[] }>("/graphql", {
    token,
    method: "POST",
    body: { query, variables },
  })
  if (result.errors?.length && !result.data) throw new Error(result.errors[0]!.message)
  return result.data
}
