import type { Pult } from "@lantharos/pult"
import { eq } from "drizzle-orm"
import { db, schema } from "../db/core.ts"
import { mail as mailInbox } from "../ops/define/mail.ts"
import type { Mailbox } from "./addresses.ts"
import { attachmentsOf, readStored } from "./stored.ts"

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
