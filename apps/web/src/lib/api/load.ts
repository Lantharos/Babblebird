import { API_BASE } from "@babblebird/protocol"
import { error } from "@sveltejs/kit"

export async function fetchApi<T>(fetch: typeof globalThis.fetch, path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  const json = await response.json()
  if (!response.ok) error(response.status, json.error)
  return json
}
