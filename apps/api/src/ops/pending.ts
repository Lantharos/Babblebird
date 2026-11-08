import type { Pult } from "@lantharos/pult"
import { and, eq, isNull, lt, notInArray } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { deliverMail } from "../inbox/deliver.ts"
import { sendNewProject } from "./items.ts"

const MAIL_SETTLES_MS = 5 * 60_000

export async function deliverPending(pult: Pult) {
  const settled = new Date(Date.now() - MAIL_SETTLES_MS)
  const [mail, projects] = await Promise.all([
    db
      .select()
      .from(schema.mail)
      .where(
        and(
          eq(schema.mail.direction, "in"),
          isNull(schema.mail.pultItem),
          lt(schema.mail.createdAt, settled),
        ),
      ),
    db
      .select({ id: schema.project.id })
      .from(schema.project)
      .where(and(isNull(schema.project.pultItem), notInArray(schema.project.state, ["scanning", "removed"]))),
  ])
  await Promise.all([
    ...mail.map((row) => deliverMail(pult, row)),
    ...projects.map((project) => sendNewProject(pult, project.id)),
  ])
}
