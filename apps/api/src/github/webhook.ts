import { env } from "cloudflare:workers"
import { fail } from "../lib/http.ts"

const encoder = new TextEncoder()
let key: Promise<CryptoKey> | null = null

export async function verifiedPayload(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")?.replace(/^sha256=/, "")
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) fail(401, "Missing signature")
  key ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(env.GITHUB_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  const valid = await crypto.subtle.verify(
    "HMAC",
    await key,
    Uint8Array.fromHex(signature),
    encoder.encode(body),
  )
  if (!valid) fail(401, "Wrong signature")
  return {
    event: request.headers.get("x-github-event") ?? "",
    payload: JSON.parse(body) as Record<string, any>,
  }
}
