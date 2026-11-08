import { englishName } from "@babblebird/protocol"
import { inArray } from "drizzle-orm"
import { db, schema } from "../db/core.ts"

function list(items: string[]) {
  return new Intl.ListFormat("en", { type: "conjunction" }).format(items)
}

export async function commitMessage(langs: string[], userIds: string[]) {
  const languages = [...new Set(langs)].map((lang) => englishName(lang)).sort()
  const title =
    languages.length > 3
      ? `Update translations for ${languages.length} languages`
      : `Update ${list(languages)} translations`
  const people = userIds.length
    ? await db
        .select({ name: schema.user.name, login: schema.user.githubLogin, id: schema.user.githubId })
        .from(schema.user)
        .where(inArray(schema.user.id, userIds))
    : []
  const trailers = people
    .filter((person) => person.login && person.id)
    .map(
      (person) =>
        `Co-authored-by: ${person.name || person.login} <${person.id}+${person.login}@users.noreply.github.com>`,
    )
  const body = languages.length > 3 ? `\n\n${list(languages)}.` : ""
  return `${title}${body}${trailers.length ? `\n\n${trailers.join("\n")}` : ""}`
}
