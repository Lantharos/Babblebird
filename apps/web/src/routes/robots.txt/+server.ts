const PRIVATE = ["/api/", "/dashboard", "/settings", "/setup", "/sign-in"]

export function GET({ url }) {
  const rules = PRIVATE.map((path) => `Disallow: ${path}`).join("\n")
  return new Response(`User-agent: *\n${rules}\n\nSitemap: ${url.origin}/sitemap.xml\n`, {
    headers: { "content-type": "text/plain", "cache-control": "public, max-age=86400" },
  })
}
