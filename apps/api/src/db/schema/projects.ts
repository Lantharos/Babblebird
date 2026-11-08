import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { user } from "./auth.ts"
import { createdAt, updatedAt } from "./columns.ts"

export const DELIVERIES = ["off", "branch", "direct"] as const
export const PROJECT_STATES = ["scanning", "ready", "empty", "failed", "removed"] as const
export const ROLES = ["translator", "reviewer", "admin"] as const
export const WHO_TRANSLATES = ["anyone", "members"] as const

export const installation = sqliteTable("installation", {
  id: integer("id").primaryKey(),
  account: text("account").notNull(),
  suspended: integer("suspended", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
})

export const project = sqliteTable(
  "project",
  {
    id: text("id").primaryKey(),
    repoId: integer("repo_id").notNull().unique(),
    installationId: integer("installation_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    layoutVersion: integer("layout_version").notNull().default(0),
    private: integer("private", { mode: "boolean" }).notNull(),
    defaultBranch: text("default_branch").notNull(),
    sourceLang: text("source_lang").notNull().default("en"),
    languages: text("languages", { mode: "json" }).$type<string[]>().notNull().default([]),
    delivery: text("delivery", { enum: DELIVERIES }).notNull().default("off"),
    whoTranslates: text("who_translates", { enum: WHO_TRANSLATES }).notNull().default("anyone"),
    shard: integer("shard").notNull().default(0),
    state: text("state", { enum: PROJECT_STATES }).notNull().default("scanning"),
    problem: text("problem"),
    headSha: text("head_sha"),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" }),
    importTotal: integer("import_total").notNull().default(0),
    importDone: integer("import_done").notNull().default(0),
    importStartedAt: integer("import_started_at", { mode: "timestamp_ms" }),
    strings: integer("strings").notNull().default(0),
    words: integer("words").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("project_slug").on(table.slug),
    index("project_installation").on(table.installationId),
  ],
)

export const member = sqliteTable(
  "member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    languages: text("languages", { mode: "json" }).$type<string[] | null>(),
    areas: text("areas", { mode: "json" }).$type<string[] | null>(),
    fromGithub: integer("from_github", { mode: "boolean" }).notNull().default(false),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("member_user").on(table.userId),
  ],
)

export const delivery = sqliteTable("delivery", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => project.id, { onDelete: "cascade" }),
  branchSha: text("branch_sha"),
  baseSha: text("base_sha"),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  pullNumber: integer("pull_number"),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  mergedAt: integer("merged_at", { mode: "timestamp_ms" }),
  problem: text("problem"),
})

export const invitation = sqliteTable(
  "invitation",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    who: text("who").notNull(),
    role: text("role", { enum: ROLES }).notNull(),
    languages: text("languages", { mode: "json" }).$type<string[] | null>(),
    areas: text("areas", { mode: "json" }).$type<string[] | null>(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.who] }), index("invitation_who").on(table.who)],
)
