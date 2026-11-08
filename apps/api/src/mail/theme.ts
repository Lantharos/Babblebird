const light = {
  canvas: "#f7f8f9",
  well: "#edf0f2",
  ink: "#12161b",
  inkSoft: "#3c4550",
  inkMuted: "#5c6570",
  accent: "#b8430a",
  accentInk: "#ffffff",
}

const dark: typeof light = {
  canvas: "#101316",
  well: "#22272c",
  ink: "#e9ecef",
  inkSoft: "#b9c0c7",
  inkMuted: "#9aa3ad",
  accent: "#ff8b52",
  accentInk: "#1a0d05",
}

export const colors = light

export const FONT =
  "'Open Runde', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const darkRules = (scope: string) =>
  [
    `${scope} .canvas { background-color: ${dark.canvas} !important; }`,
    `${scope} .well { background-color: ${dark.well} !important; }`,
    `${scope} .ink { color: ${dark.ink} !important; }`,
    `${scope} .ink-soft { color: ${dark.inkSoft} !important; }`,
    `${scope} .ink-muted, ${scope} .ink-muted a { color: ${dark.inkMuted} !important; }`,
    `${scope} .rule { border-color: ${dark.well} !important; }`,
    `${scope} .button { background-color: ${dark.accent} !important; }`,
    `${scope} .button a { color: ${dark.accentInk} !important; }`,
  ].join("\n")

const fontFace = (origin: string, file: string, weight: number) =>
  `@font-face { font-family: 'Open Runde'; font-weight: ${weight}; font-style: normal; src: url('${origin}/fonts/${file}.woff2') format('woff2'); }`

export function stylesheets(origin: string) {
  return [
    [
      ":root { color-scheme: light dark; supported-color-schemes: light dark; }",
      "body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }",
      "a { text-decoration: none; }",
      "@media (max-width: 480px) { .page { padding: 28px 20px !important; } .heading { font-size: 24px !important; } }",
      `@media (prefers-color-scheme: dark) {\n${darkRules(":root")}\n}`,
    ],
    [
      fontFace(origin, "OpenRunde-Regular", 400),
      fontFace(origin, "OpenRunde-Medium", 500),
      fontFace(origin, "OpenRunde-Semibold", 600),
    ],
    [darkRules("[data-ogsc]")],
  ].map((rules) => `<style>\n${rules.join("\n")}\n</style>`)
}
