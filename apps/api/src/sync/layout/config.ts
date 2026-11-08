import { parse } from "smol-toml"
import { z } from "zod"

export const CONFIG_PATH = "babblebird.toml"

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
      problem: `${CONFIG_PATH} couldn't be read: ${(error as Error).message}`,
    }
  }
}
