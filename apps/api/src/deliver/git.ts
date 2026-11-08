import { GitHubError, github, maybe } from "../github/api.ts"
import type { Repo } from "../github/repo.ts"

export const BRANCH = "babblebird/translations"

const path = (repo: Repo, rest: string) => `/repos/${repo.owner}/${repo.name}${rest}`

export async function headOf(repo: Repo, branch: string) {
  const ref = await maybe(
    github<{ object: { sha: string } }>(path(repo, `/git/ref/heads/${branch}`), { token: repo.token }),
  )
  return ref?.object.sha ?? null
}

export async function commitFiles(
  repo: Repo,
  parent: string,
  files: { path: string; content: string }[],
  message: string,
) {
  const { token } = repo
  const base = await github<{ tree: { sha: string } }>(path(repo, `/git/commits/${parent}`), { token })
  const tree = await github<{ sha: string }>(path(repo, "/git/trees"), {
    token,
    method: "POST",
    body: {
      base_tree: base.tree.sha,
      tree: files.map((file) => ({ path: file.path, mode: "100644", type: "blob", content: file.content })),
    },
  })
  if (tree.sha === base.tree.sha) return null
  const commit = await github<{ sha: string }>(path(repo, "/git/commits"), {
    token,
    method: "POST",
    body: { message, tree: tree.sha, parents: [parent] },
  })
  return commit.sha
}

export async function moveBranch(repo: Repo, branch: string, sha: string, force: boolean) {
  try {
    await github(path(repo, `/git/refs/heads/${branch}`), {
      token: repo.token,
      method: "PATCH",
      body: { sha, force },
    })
    return true
  } catch (error) {
    if (!(error instanceof GitHubError) || error.status !== 422) throw error
    if (force && /does not exist/i.test(error.body)) {
      await github(path(repo, "/git/refs"), {
        token: repo.token,
        method: "POST",
        body: { ref: `refs/heads/${branch}`, sha },
      })
      return true
    }
    return false
  }
}

interface Pull {
  number: number
  node_id: string
}

export async function openPull(repo: Repo, base: string, languages: string) {
  const open = await github<Pull[]>(path(repo, `/pulls?state=open&head=${repo.owner}:${BRANCH}`), {
    token: repo.token,
  })
  if (open[0]) return open[0]
  return github<Pull>(path(repo, "/pulls"), {
    token: repo.token,
    method: "POST",
    body: {
      title: `Update ${languages} translations`,
      head: BRANCH,
      base,
      body: "Translations from Babblebird. This merges itself once the checks pass.",
    },
  })
}

function squashed(message: string, number: number) {
  const [title = "", ...body] = message.split("\n")
  return { title: `${title} (#${number})`, body: body.join("\n").trim() }
}

export async function messageOf(repo: Repo, sha: string) {
  const commit = await github<{ message: string }>(path(repo, `/git/commits/${sha}`), { token: repo.token })
  return commit.message
}

export async function mergeWhenReady(repo: Repo, pull: Pull, message: string) {
  const { title, body } = squashed(message, pull.number)
  const result = await github<{ errors?: { message: string }[] }>("/graphql", {
    token: repo.token,
    method: "POST",
    body: {
      query:
        "mutation($id: ID!, $title: String!, $body: String!) { enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $title, commitBody: $body }) { clientMutationId } }",
      variables: { id: pull.node_id, title, body },
    },
  })
  if (!result.errors?.length) return false
  return mergeNow(repo, pull.number, message)
}

export async function mergeNow(repo: Repo, number: number, message: string) {
  const { title, body } = squashed(message, number)
  try {
    await github(path(repo, `/pulls/${number}/merge`), {
      token: repo.token,
      method: "PUT",
      body: { merge_method: "squash", commit_title: title, commit_message: body },
    })
    return true
  } catch (error) {
    if (error instanceof GitHubError && (error.status === 405 || error.status === 409)) return false
    throw error
  }
}
