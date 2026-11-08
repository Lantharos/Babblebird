import MarkdownIt from "markdown-it"

const markdown = new MarkdownIt({ html: true, linkify: false })

const files = import.meta.glob<string>("../../content/docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
})

export interface DocPage {
  slug: string
  title: string
  html: string
}

export const sections: { name: string; slugs: string[] }[] = [
  {
    name: "Translating",
    slugs: ["translating", "editor", "plurals-and-placeables", "glossary-and-suggestions", "reviewing"],
  },
  {
    name: "Maintaining a project",
    slugs: [
      "adding-a-repository",
      "areas-and-icons",
      "babblebird-toml",
      "sending-translations",
      "screenshots",
      "people-and-roles",
      "badges",
    ],
  },
  { name: "Running Babblebird", slugs: ["self-hosting"] },
]

export function readPages(found: Record<string, string>) {
  return new Map(
    Object.entries(found).map(([path, text]) => {
      const slug = path.split("/").pop()!.replace(/\.md$/, "")
      const [heading, ...rest] = text.trim().split("\n")
      return [
        slug,
        {
          slug,
          title: heading!.replace(/^#\s+/, ""),
          html: markdown.render(rest.join("\n")),
        } satisfies DocPage,
      ]
    }),
  )
}

const pages = readPages(files)

export const docPage = (slug: string) => pages.get(slug) ?? null

export const docNav = sections.map((section) => ({
  name: section.name,
  pages: section.slugs.map((slug) => ({ slug, title: pages.get(slug)!.title })),
}))
