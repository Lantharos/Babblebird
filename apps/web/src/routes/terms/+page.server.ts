import { legalPage } from "#lib/docs/legal.ts"

export const prerender = true

export const load = () => ({ page: legalPage("terms") })
