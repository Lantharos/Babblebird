import { API_BASE } from "@babblebird/protocol"

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

async function send<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return undefined as T
  const json = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok)
    throw new ApiError(json?.error ?? "That didn't work. Try again in a moment.", response.status)
  return json as T
}

export const api = {
  get: <T>(path: string) => send<T>("GET", path),
  post: <T>(path: string, body?: unknown) => send<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => send<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => send<T>("PATCH", path, body),
  delete: <T = void>(path: string) => send<T>("DELETE", path),
}
