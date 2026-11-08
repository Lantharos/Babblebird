import { GITHUB_INSTALL_URL } from "@babblebird/protocol"
import type { BetterAuthPlugin } from "better-auth"
import { createAuthEndpoint } from "better-auth/api"
import { expireCookie, setSessionCookie } from "better-auth/cookies"
import { handleOAuthUserInfo } from "better-auth/oauth2"
import { z } from "zod"

const STATE_COOKIE = "install_state"
const STATE_MINUTES = 30

const returned = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  installation_id: z.string().regex(/^\d+$/).optional(),
})

const landingFor = (installation: string | undefined) =>
  installation ? `/setup?installation_id=${installation}` : "/dashboard"

export const installFlow = () =>
  ({
    id: "github-install",
    endpoints: {
      startInstall: createAuthEndpoint("/github/install", { method: "GET" }, async (c) => {
        const state = crypto.randomUUID()
        const cookie = c.context.createAuthCookie(STATE_COOKIE, { maxAge: STATE_MINUTES * 60 })
        await c.setSignedCookie(cookie.name, state, c.context.secret, cookie.attributes)
        throw c.redirect(`${GITHUB_INSTALL_URL}?state=${state}`)
      }),
      finishInstall: createAuthEndpoint(
        "/github/installed",
        { method: "GET", query: returned },
        async (c) => {
          const { code, state, installation_id } = c.query
          const landing = landingFor(installation_id)
          const cookie = c.context.createAuthCookie(STATE_COOKIE)
          const expected = await c.getSignedCookie(cookie.name, c.context.secret)
          expireCookie(c, cookie)
          if (!code || !state || state !== expected) throw c.redirect(landing)

          const github = c.context.socialProviders.find((provider) => provider.id === "github")!
          const tokens = await github.validateAuthorizationCode({
            code,
            redirectURI: `${c.context.baseURL}/github/installed`,
          })
          const info = tokens && (await github.getUserInfo(tokens))
          if (!tokens || !info?.user.email) throw c.redirect(landing)

          const profile = info.data as { id: number }
          const accountId = String(profile.id)
          const result = await handleOAuthUserInfo(c, {
            userInfo: { ...info.user, id: accountId, email: info.user.email, name: info.user.name ?? "" },
            account: { providerId: "github", accountId, ...tokens, scope: tokens.scopes?.join(",") },
            callbackURL: landing,
            source: { method: "oauth", oauth: { providerId: "github", profile } },
          })
          if (result.data) await setSessionCookie(c, result.data)
          throw c.redirect(landing)
        },
      ),
    },
  }) satisfies BetterAuthPlugin
