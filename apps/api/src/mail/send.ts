import { env, waitUntil } from "cloudflare:workers"
import { type Mail, renderHtml, renderText } from "./render.ts"

export function sendNotice(to: string, mail: Mail) {
  return env.EMAIL.send({
    from: { name: "Babblebird", email: env.NOTIFY_FROM },
    to,
    subject: mail.subject,
    html: renderHtml(mail),
    text: renderText(mail),
  })
}

export function queueNotice(to: string, mail: Mail) {
  waitUntil(sendNotice(to, mail))
}
