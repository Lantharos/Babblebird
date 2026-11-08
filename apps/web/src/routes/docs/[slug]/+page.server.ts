import { error } from "@sveltejs/kit"
import { docNav, docPage, sections } from "#lib/docs/pages.ts"

export const prerender = true

export const entries = () => sections.flatMap((section) => section.slugs.map((slug) => ({ slug })))

export function load({ params }) {
  const page = docPage(params.slug)
  if (!page) error(404, "There’s no such page")
  return { page, nav: docNav }
}
