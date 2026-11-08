import { OIDC_AUDIENCE } from "@babblebird/protocol"
import { createRemoteJWKSet, jwtVerify } from "jose"

const ISSUER = "https://token.actions.githubusercontent.com"
const keys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`), {
  cacheMaxAge: 60 * 60_000,
  cooldownDuration: 30_000,
})

export interface WorkflowClaims {
  repository: string
  repository_id: string
  ref: string
  sha: string
}

export async function verifyWorkflow(token: string) {
  const { payload } = await jwtVerify<WorkflowClaims>(token, keys, {
    issuer: ISSUER,
    audience: OIDC_AUDIENCE,
    algorithms: ["RS256"],
  })
  return payload
}
