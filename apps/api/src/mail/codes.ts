import { code, paragraph } from "./parts.ts"
import type { Mail } from "./render.ts"

export const CODE_MINUTES = 10

export function signInCode({ email, otp }: { email: string; otp: string }): Mail {
  return {
    subject: `${otp} is your Babblebird sign-in code`,
    preview: `It works for ${CODE_MINUTES} minutes.`,
    heading: "Your sign-in code",
    body: [
      paragraph(`Enter this code on babblebird.dev to sign in as ${email}.`),
      code(otp),
      paragraph(
        `It works for ${CODE_MINUTES} minutes. If you didn't try to sign in, you can ignore this email.`,
      ),
    ],
    reason: "You got this because someone asked to sign in to Babblebird with this address.",
  }
}
