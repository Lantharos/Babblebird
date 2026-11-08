import type { Pult } from "@lantharos/pult"
import { and, eq, isNull, lt } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import type { Mailbox } from "./addresses.ts"
import { mail as mailInbox } from "./define/mail.ts"
import { attachmentsOf, readStored } from "./stored.ts"

const MAIL_SETTLES_MS = 5 * 60_000

export type MailRow = typeof schema.mail.$inferSelect

type Stored = NonNullable<Awaited<ReturnType<typeof readStored>>>

async function deliveredTo(row: MailRow, item: string) {
  await db.update(schema.mail).set({ pultItem: item }).where(eq(schema.mail.id, row.id))
}

export async function deliverMail(pult: Pult, row: MailRow, given?: Stored) {
  const stored = given ?? (row.rawKey ? await readStored(row.rawKey) : null)
  if (!stored) return
  const { mail, raw } = stored
  const received =
    row.thread &&
    (await pult.receive({
      thread: row.thread,
      from: mail.from,
      subject: mail.subject,
      text: mail.text,
      attachments: attachmentsOf(mail, raw),
    }))
  if (received) return deliveredTo(row, received.item)
  const sent = await pult.send(mailInbox, {
    fingerprint: row.messageId ?? row.id,
    tags: [row.mailbox, ...row.tags],
    data: {
      mailbox: row.mailbox as Mailbox,
      from: mail.from,
      name: mail.name,
      replyTo: mail.replyTo,
      subject: mail.subject.slice(0, 300),
      text: mail.text,
      raw: row.rawKey!,
    },
  })
  await deliveredTo(row, sent.id)
}

export async function deliverPending(pult: Pult) {
  const waiting = await db
    .select()
    .from(schema.mail)
    .where(
      and(
        eq(schema.mail.direction, "in"),
        isNull(schema.mail.pultItem),
        lt(schema.mail.createdAt, new Date(Date.now() - MAIL_SETTLES_MS)),
      ),
    )
  await Promise.all(waiting.map((row) => deliverMail(pult, row)))
}
