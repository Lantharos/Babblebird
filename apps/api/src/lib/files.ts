import { env } from "cloudflare:workers"

const TOO_FAST = "10058"
const ATTEMPTS = 4

export async function putOnce(key: string, body: ArrayBuffer, type: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      await env.FILES.put(key, body, { httpMetadata: { contentType: type } })
      return
    } catch (error) {
      if (attempt === ATTEMPTS || !String(error).includes(TOO_FAST)) throw error
      if (await env.FILES.head(key)) return
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 400 + Math.random() * 600))
    }
  }
}
