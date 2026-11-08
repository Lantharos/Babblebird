import { env } from "cloudflare:workers"
import { importPKCS8, SignJWT } from "jose"
import { github } from "./api.ts"

const RSA_OID = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]

function derLength(length: number) {
  if (length < 0x80) return [length]
  const bytes: number[] = []
  for (let rest = length; rest > 0; rest >>= 8) bytes.unshift(rest & 0xff)
  return [0x80 | bytes.length, ...bytes]
}

function derOf(tag: number, content: number[]) {
  return [tag, ...derLength(content.length), ...content]
}

function pkcs8Pem(pem: string) {
  if (pem.includes("BEGIN PRIVATE KEY")) return pem
  const pkcs1 = [...Uint8Array.fromBase64(pem.replace(/-----[^-]+-----|\s/g, ""))]
  const der = derOf(0x30, [0x02, 0x01, 0x00, ...RSA_OID, ...derOf(0x04, pkcs1)])
  return `-----BEGIN PRIVATE KEY-----\n${new Uint8Array(der).toBase64()}\n-----END PRIVATE KEY-----`
}

let signingKey: Promise<CryptoKey> | null = null

async function appToken() {
  signingKey ??= importPKCS8(pkcs8Pem(env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n")), "RS256")
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(env.GITHUB_CLIENT_ID)
    .setIssuedAt(now - 60)
    .setExpirationTime(now + 540)
    .sign(await signingKey)
}

const tokens = new Map<number, { token: string; expires: number }>()
const TOKEN_MARGIN_MS = 5 * 60_000

export async function installationToken(installation: number) {
  const cached = tokens.get(installation)
  if (cached && cached.expires - TOKEN_MARGIN_MS > Date.now()) return cached.token
  const created = await github<{ token: string; expires_at: string }>(
    `/app/installations/${installation}/access_tokens`,
    { token: await appToken(), method: "POST" },
  )
  tokens.set(installation, { token: created.token, expires: Date.parse(created.expires_at) })
  return created.token
}
