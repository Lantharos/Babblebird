import { fetchApi } from "#lib/api/load.ts"
import { LANGUAGE_COOKIE, type Me } from "#lib/api/session.svelte.ts"

export async function load({ fetch, cookies }) {
  return {
    me: await fetchApi<Me | null>(fetch, "/me"),
    language: cookies.get(LANGUAGE_COOKIE) ?? null,
  }
}
