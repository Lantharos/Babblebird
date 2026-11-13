export * from "./languages.ts"
export * from "./live.ts"
export * from "./projects.ts"
export * from "./states.ts"
export * from "./strings.ts"

export const API_BASE = "/api"
export const OIDC_AUDIENCE = "https://babblebird.dev"
export const GITHUB_APP_URL = "https://github.com/apps/babblebird-translate"
export const GITHUB_INSTALL_URL = `${GITHUB_APP_URL}/installations/new`
export const INSTALL_URL = `${API_BASE}/auth/github/install`
