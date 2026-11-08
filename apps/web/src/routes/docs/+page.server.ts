import { docNav } from "#lib/docs/pages.ts"

export const prerender = true

export const load = () => ({ nav: docNav })
