import { env } from "cloudflare:workers"
import { db, schema } from "../db/core.ts"
import { randomId } from "../lib/ids.ts"
import { addressOf, type Mailbox } from "./addresses.ts"
import { bareMessageId } from "./parse.ts"
import { threadingHeaders } from "./threads.ts"

interface Reply {
  mailbox: Mailbox
  thread: string
  to: string
  subject: string
  text: string
}

export async function sendReply({ mailbox, thread, to, subject, text }: Reply) {
  const sent = await env.EMAIL.send({
    from: { name: "Babblebird", email: addressOf(mailbox) },
    replyTo: addressOf(mailbox, thread),
    to,
    subject,
    text,
    headers: await threadingHeaders(thread),
  })
  await db.insert(schema.mail).values({
    id: randomId(),
    direction: "out",
    mailbox,
    messageId: bareMessageId(sent.messageId),
    pultItem: thread,
  })
}
