import { readPages } from "./pages.ts"

const pages = readPages(
  import.meta.glob<string>("../../content/legal/*.md", { query: "?raw", import: "default", eager: true }),
)

export const legalPage = (slug: "privacy" | "terms") => pages.get(slug)!
