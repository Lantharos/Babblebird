import { env } from "cloudflare:workers"
import type { Handle, HandleServerError } from "@sveltejs/kit/hooks"

export const handle: Handle = ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api/")) return env.API.fetch(event.request)
  return resolve(event)
}

export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind !== "unknown") return
  console.error(event.url.pathname, error)
  return { message: "Something went wrong on our side. Try again in a moment." }
}
