import { env } from "cloudflare:workers"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { emailOTP } from "better-auth/plugins"
import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { CODE_MINUTES, signInCode } from "../mail/codes.ts"
import { queueNotice } from "../mail/send.ts"

const publicUrl = new URL(env.PUBLIC_URL)
const SESSION_CACHE_SECONDS = 5 * 60

async function rememberGitHub(account: { providerId: string; userId: string; accessToken?: string | null }) {
  if (account.providerId !== "github" || !account.accessToken) return
  const response = await fetch(`${env.GITHUB_API}/user`, {
    headers: { authorization: `Bearer ${account.accessToken}`, "user-agent": "babblebird.dev" },
  })
  if (!response.ok) return
  const profile = (await response.json()) as { id: number; login: string }
  await db
    .update(schema.user)
    .set({ githubLogin: profile.login, githubId: String(profile.id) })
    .where(eq(schema.user.id, account.userId))
}

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: publicUrl.origin,
  basePath: "/api/auth",
  trustedOrigins: [publicUrl.origin],
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  session: { cookieCache: { enabled: true, maxAge: SESSION_CACHE_SECONDS } },
  account: { accountLinking: { enabled: true, trustedProviders: ["github"] } },
  user: { deleteUser: { enabled: true } },
  databaseHooks: {
    account: {
      create: { after: rememberGitHub },
      update: { after: (account) => rememberGitHub(account as never) },
    },
  },
  socialProviders: {
    github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
  },
  plugins: [
    passkey({ rpID: publicUrl.hostname, rpName: "Babblebird", origin: publicUrl.origin }),
    emailOTP({
      expiresIn: CODE_MINUTES * 60,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp }) => queueNotice(email, signInCode({ email, otp })),
    }),
  ],
  telemetry: { enabled: false },
})
