import { englishName, type LanguageProgress } from "@babblebird/protocol"
import { b } from "@lantharos/pult"
import { peopleById } from "../../editor/people.ts"
import { counted, DELIVERY, PROJECT_STATE, ROLE, SYNC_REASON, WHO_TRANSLATES } from "../data/labels.ts"
import { commitLink, projectPage, pullLink, repositoryLink } from "../data/links.ts"
import { type ProjectView, projects } from "../data/projects.ts"

const percent = (part: number, whole: number) => (whole ? `${Math.floor((part / whole) * 100)}%` : "0%")

export function projectState(project: ProjectView) {
  if (project.pausedAt) return "Paused"
  if (project.state === "scanning" && project.importTotal)
    return `Importing, ${project.importDone} of ${project.importTotal} files`
  return PROJECT_STATE[project.state]
}

function languageRows(project: ProjectView, languages: LanguageProgress[]) {
  return languages.map((language) => ({
    language: `${englishName(language.lang)} (${language.lang})`,
    translated: `${language.translated} (${percent(language.translated, project.strings)})`,
    approved: language.approved,
    "needs review": language.review,
    problems: language.problems,
    suggested: language.suggested,
  }))
}

function deliveryFields(project: ProjectView, waitingFiles: number) {
  if (project.delivery === "off") return { delivery: DELIVERY.off }
  const sent = project.sent
  return {
    delivery: DELIVERY[project.delivery],
    "waiting to send": counted(waitingFiles, "file"),
    "open pull request": pullLink(project, project.openPull),
    "last sent": sent?.sentAt ?? undefined,
    "last merged": sent?.mergedAt ?? undefined,
    "closed unmerged": sent?.closedAt ?? undefined,
    checks: sent?.checks ?? undefined,
    "delivery problem": sent?.problem ?? undefined,
  }
}

export async function projectBlocks(project: ProjectView) {
  const [languages, members, translators, reads, counts] = await Promise.all([
    projects.languages(project),
    projects.members(project.id),
    projects.translators(project),
    projects.reads(project),
    projects.counts(project),
  ])
  const people = await peopleById(translators.map((row) => row.user_id))
  return [
    b.stats({
      Strings: project.strings,
      Words: project.words,
      Languages: project.languages.length,
      Translators: translators.length,
    }),
    b.fields({
      repository: repositoryLink(project),
      installation: b.ref("installation", String(project.installationId), project.account ?? undefined),
      visibility: project.private ? "Private" : "Public",
      state: projectState(project),
      problem: project.problem ?? undefined,
      paused: project.pausedAt
        ? `${project.pausedAt.toISOString().slice(0, 10)}: ${project.pausedReason}`
        : undefined,
      "default branch": project.defaultBranch,
      "source language": englishName(project.sourceLang),
      "who translates": WHO_TRANSLATES[project.whoTranslates],
      "last read": project.syncedAt ?? undefined,
      commit: commitLink(project, project.headSha),
      ...deliveryFields(project, counts.waitingFiles),
      "glossary terms": counts.glossaryTerms,
      added: project.createdAt,
      page:
        project.state === "removed"
          ? undefined
          : b.link(projectPage(project), `babblebird.dev/p/${project.slug}`),
    }),
    b.table(languageRows(project, languages), { title: "Languages" }),
    b.table(
      members.map(({ member, user }) => ({
        person: b.ref("user", user.id, user.name || user.githubLogin || "Someone"),
        role: ROLE[member.role],
        languages: member.languages?.join(", ") ?? "All",
        areas: member.areas?.join(", ") ?? "All",
        from: member.fromGithub ? "GitHub access" : "Added by a maintainer",
      })),
      { title: "Members" },
    ),
    b.table(
      translators.map((row) => ({
        person: b.ref("user", row.user_id, people.get(row.user_id)?.name),
        edits: row.edits,
        last: new Date(row.last),
      })),
      { title: "Translators" },
    ),
    b.table(
      reads.map((read) => ({
        when: new Date(read.at),
        why: SYNC_REASON[read.reason],
        by: read.by ?? "",
        commit: commitLink(project, read.sha),
        "source files": read.sourceFiles,
        "translation files": read.translationFiles,
      })),
      { title: "Recent reads" },
    ),
  ]
}
