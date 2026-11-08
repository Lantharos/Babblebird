import { and, eq } from "drizzle-orm"
import { auth } from "../auth/auth.ts"
import { db, schema } from "../db/core.ts"
import { github } from "./api.ts"

async function userToken(userId: string) {
  const account = await db.query.account.findFirst({
    where: and(eq(schema.account.userId, userId), eq(schema.account.providerId, "github")),
  })
  if (!account) return null
  try {
    const { accessToken } = await auth.api.getAccessToken({ body: { accountId: account.id, userId } })
    return accessToken ?? null
  } catch {
    return null
  }
}

export async function userInstallations(userId: string) {
  const token = await userToken(userId)
  if (!token) return []
  const found = await github<{ installations: { id: number }[] }>("/user/installations?per_page=100", {
    token,
  })
  return found.installations.map((installation) => installation.id)
}
