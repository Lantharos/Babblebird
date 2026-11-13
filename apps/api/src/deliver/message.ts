import { englishName } from "@babblebird/protocol"
import { inArray } from "drizzle-orm"
import { db, schema } from "../db/core.ts"

interface Credited {
  id: string
  name: string
  creditName: string | null
  credited: boolean
  githubLogin: string | null
  githubId: string | null
}

function list(items: string[]) {
  return new Intl.ListFormat("en", { type: "conjunction" }).format(items)
}

function coAuthor(person: Credited) {
  const name = (person.creditName ?? person.name).trim() || person.githubLogin
  if (!person.credited || !name) return null
  const address =
    person.githubLogin && person.githubId
      ? `${person.githubId}+${person.githubLogin}@users.noreply.github.com`
      : `${person.id}@users.noreply.babblebird.dev`
  return `Co-authored-by: ${name} <${address}>`
}

export async function commitMessage(langs: string[], userIds: string[]) {
  const languages = [...new Set(langs)].map((lang) => englishName(lang)).sort()
  const title =
    languages.length > 3
      ? `Update translations for ${languages.length} languages`
      : `Update ${list(languages)} translations`
  const people = userIds.length
    ? await db
        .select({
          id: schema.user.id,
          name: schema.user.name,
          creditName: schema.user.creditName,
          credited: schema.user.credited,
          githubLogin: schema.user.githubLogin,
          githubId: schema.user.githubId,
        })
        .from(schema.user)
        .where(inArray(schema.user.id, userIds))
    : []
  const trailers = people.map(coAuthor).filter((line) => line !== null)
  const body = languages.length > 3 ? `\n\n${list(languages)}.` : ""
  return `${title}${body}${trailers.length ? `\n\n${trailers.join("\n")}` : ""}`
}
