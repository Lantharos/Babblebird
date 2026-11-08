export const SITE = "https://babblebird.dev"

export type Scheme = "light" | "dark"

export const SCHEMES: { scheme: Scheme; label: string }[] = [
  { scheme: "light", label: "For light backgrounds" },
  { scheme: "dark", label: "For dark backgrounds" },
]

export const file = (name: string) => `/brand/babblebird-${name}`

export type Colour = { name: string; use: string; hex: string; dark?: string }

export const COLOURS: Colour[] = [
  { name: "Coral", use: "The app icon’s tile", hex: "#ff5f45" },
  { name: "Cream", use: "The bird on the app icon", hex: "#fff7f2" },
  { name: "Peach", use: "The beak on the app icon", hex: "#ffbf9f" },
  { name: "Bird", use: "The bird on its own", hex: "#e8611c", dark: "#ff8b52" },
  { name: "Beak", use: "Its beak and feet", hex: "#f0a315", dark: "#ffbe3d" },
  { name: "Ink", use: "Text and the wordmark", hex: "#12161b", dark: "#e9ecef" },
  { name: "Paper", use: "Backgrounds", hex: "#f7f8f9", dark: "#101316" },
]

export type BadgeKind = "translated" | "help" | "compact"

export const BADGES: { kind: BadgeKind; label: string; alt: string }[] = [
  { kind: "translated", label: "Translated on", alt: "Translated on Babblebird" },
  { kind: "help", label: "Help translate", alt: "Help translate on Babblebird" },
  { kind: "compact", label: "Compact", alt: "Babblebird" },
]

export const badgeUrl = (kind: BadgeKind, scheme: Scheme, origin = "") =>
  `${origin}/api/badge/${kind}.svg${scheme === "dark" ? "?theme=dark" : ""}`
