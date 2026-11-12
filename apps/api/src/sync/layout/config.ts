import { transformNames } from "@babblebird/fluent"
import { parse } from "smol-toml"
import { z } from "zod"
import { canonical } from "./lang.ts"

export const CONFIG_PATH = "babblebird.toml"

const languageTag = z.string().transform((tag, context) => {
  const found = canonical(tag)
  if (!found) context.addIssue({ code: "custom", message: `${tag} isn't a language tag` })
  return found ?? tag
})

const DEFAULT_IGNORE = ["**/node_modules/**", "**/fixtures/**", "**/dist/**", "**/build/**", "**/vendor/**"]

const schema = z.object({
  source: z.string().default("en"),
  ignore: z.array(z.string()).default([]),
  glossary: z.string().optional(),
  icon: z.string().optional(),
  areas: z
    .array(
      z.object({ name: z.string().min(1), files: z.array(z.string()).min(1), icon: z.string().optional() }),
    )
    .default([]),
  generated: z
    .array(
      z
        .object({
          lang: languageTag,
          from: languageTag,
          transform: z.enum(transformNames, {
            message: `transform must be one of ${transformNames.join(", ")}`,
          }),
        })
        .refine((language) => language.lang !== language.from, "a language can't be generated from itself"),
    )
    .default([]),
})

export type Config = z.infer<typeof schema> & { problem: string | null }

export function readConfig(text: string | undefined): Config {
  const fallback = { ...schema.parse({}), problem: null }
  if (text === undefined) return { ...fallback, ignore: DEFAULT_IGNORE }
  try {
    const config = schema.parse(parse(text))
    return { ...config, ignore: [...DEFAULT_IGNORE, ...config.ignore], problem: null }
  } catch (error) {
    return {
      ...fallback,
      ignore: DEFAULT_IGNORE,
      problem: `${CONFIG_PATH} couldn't be read: ${error instanceof z.ZodError ? z.prettifyError(error) : (error as Error).message}`,
    }
  }
}
