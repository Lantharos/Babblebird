import type { SitemapProject } from "@babblebird/protocol"
import { fetchApi } from "#lib/api/load.ts"
import { docNav } from "#lib/docs/pages.ts"

const PAGES = ["/", "/projects", "/docs", "/privacy", "/terms", "/brand"]
const DOCS = docNav.flatMap((section) => section.pages.map((page) => `/docs/${page.slug}`))

const entry = (origin: string, path: string, lastmod?: string) =>
  `<url><loc>${origin}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`

function projectEntries(origin: string, project: SitemapProject) {
  const base = `/p/${project.slug}`
  return [base, `${base}/status`, ...project.languages.map((lang) => `${base}/${lang}`)].map((path) =>
    entry(origin, path, project.updatedAt),
  )
}

export async function GET({ fetch, url }) {
  const projects = await fetchApi<SitemapProject[]>(fetch, "/projects/sitemap")
  const urls = [
    ...[...PAGES, ...DOCS].map((path) => entry(url.origin, path)),
    ...projects.flatMap((project) => projectEntries(url.origin, project)),
  ]
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>\n`,
    { headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" } },
  )
}
