import { serbianLatin } from "./serbian.ts"

export const TRANSFORMS = {
  "serbian-cyrillic-to-latin": serbianLatin,
} satisfies Record<string, (text: string) => string>

export type Transform = keyof typeof TRANSFORMS

export interface GeneratedLanguage {
  lang: string
  from: string
  transform: Transform
}

export const transformNames = Object.keys(TRANSFORMS) as [Transform, ...Transform[]]

export const applyTransform = (transform: Transform, text: string) => TRANSFORMS[transform](text)
