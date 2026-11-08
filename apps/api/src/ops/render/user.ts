import { englishName } from "@babblebird/protocol"
import { b } from "@lantharos/pult"
import { ACTIVITY, PROVIDER, ROLE } from "../data/labels.ts"
import { emailHint, githubLink } from "../data/links.ts"
import { projects } from "../data/projects.ts"
import { type UserView, users } from "../data/users.ts"

function device(userAgent: string | null) {
  if (!userAgent) return "Unknown"
  const browser = /(Firefox|Edg|Chrome|Safari)\/[\d.]+/.exec(userAgent)?.[1]
  const system = /(Windows|Mac OS X|Android|iPhone|Linux)/.exec(userAgent)?.[1]
  return (
    [browser === "Edg" ? "Edge" : browser, system?.replace("Mac OS X", "macOS")]
      .filter(Boolean)
      .join(" on ") || userAgent.slice(0, 60)
  )
}

export async function userBlocks(user: UserView) {
  const [accounts, passkeys, sessions, memberships, work, recent, suggestions] = await Promise.all([
    users.accounts(user.id),
    users.passkeys(user.id),
    users.sessions(user.id),
    users.memberships(user.id),
    users.work(user.id),
    users.recent(user.id),
    users.suggestions(user.id),
  ])
  const slugs = await projects.slugs([
    ...work.map((row) => row.projectId),
    ...recent.map((row) => row.projectId),
  ])
  return [
    b.stats({
      Edits: work.reduce((sum, row) => sum + row.edits, 0),
      Projects: work.length,
      Suggestions: suggestions,
      Sessions: sessions.length,
    }),
    b.fields({
      name: user.name || undefined,
      email: b.sensitive(user.email, { hint: emailHint(user.email) }),
      github: githubLink(user.githubLogin),
      "signs in with": [
        ...accounts.map((account) => PROVIDER[account.provider] ?? account.provider),
        "Email code",
        ...(passkeys.length ? ["Passkey"] : []),
      ].join(", "),
      languages: user.languages.map(englishName).join(", ") || undefined,
      suspended: user.suspendedAt
        ? `${user.suspendedAt.toISOString().slice(0, 10)}: ${user.suspendedReason}`
        : undefined,
      joined: user.createdAt,
    }),
    b.table(
      memberships.map(({ member, slug }) => ({
        project: b.ref("project", member.projectId, slug),
        role: ROLE[member.role],
        languages: member.languages?.join(", ") ?? "All",
        from: member.fromGithub ? "GitHub access" : "Added by a maintainer",
      })),
      { title: "Member of" },
    ),
    b.table(
      work.map((row) => ({
        project: b.ref("project", row.projectId, slugs.get(row.projectId)),
        edits: row.edits,
        last: new Date(row.last),
      })),
      { title: "Translated in" },
    ),
    b.table(
      sessions.map((session) => ({
        device: device(session.userAgent),
        address: session.ipAddress ? b.sensitive(session.ipAddress) : "",
        "signed in": session.createdAt,
        "last seen": session.updatedAt,
        expires: session.expiresAt,
      })),
      { title: "Signed in" },
    ),
    b.table(
      passkeys.map((passkey) => ({
        passkey: passkey.name ?? "Unnamed",
        kind: passkey.kind,
        added: passkey.added ?? "",
      })),
      { title: "Passkeys" },
    ),
    ...(recent.length
      ? [
          b.markdown("**Recent work**"),
          b.timeline(
            recent.map((row) => ({
              at: new Date(row.at),
              text: [
                ACTIVITY[row.kind] ?? row.kind,
                row.key,
                row.lang && `in ${englishName(row.lang)}`,
                slugs.get(row.projectId) && `on ${slugs.get(row.projectId)}`,
              ]
                .filter(Boolean)
                .join(" "),
            })),
          ),
        ]
      : []),
  ]
}
