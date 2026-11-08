import { person, status } from "@lantharos/pult"

const css = `
@font-face { font-family: "Open Runde"; font-weight: 400; src: url("https://babblebird.dev/fonts/OpenRunde-Regular.woff2") format("woff2"); }
@font-face { font-family: "Open Runde"; font-weight: 500; src: url("https://babblebird.dev/fonts/OpenRunde-Medium.woff2") format("woff2"); }
@font-face { font-family: "Open Runde"; font-weight: 600; src: url("https://babblebird.dev/fonts/OpenRunde-Semibold.woff2") format("woff2"); }
:root { --bg: #f7f8f9; --panel: #ffffff; --raised: #edf0f2; --line: rgb(18 22 27 / 0.09); --text: #12161b; --muted: #3c4550; --faint: #5c6570; --signal: #23794a; --warn: #8f5c06; --danger: #b8352a; --info: #b8430a; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #101316; --panel: #171b1f; --raised: #22272c; --line: rgb(233 236 239 / 0.09); --text: #e9ecef; --muted: #b9c0c7; --faint: #9aa3ad; --signal: #67cf95; --warn: #f0b44c; --danger: #ff8f80; --info: #ff8b52; }
}
body { font-family: "Open Runde", system-ui, sans-serif; }
`

export const statusPage = status({
  title: "Babblebird",
  website: "https://babblebird.dev",
  css,
  components: {
    website: { label: "Website and editor", check: "https://babblebird.dev" },
    api: { label: "Sign-in and saving translations", monitored: true },
    github: {
      label: "Reading from and sending to GitHub",
      description: "Syncing repositories and opening pull requests",
    },
    mail: { label: "Email", description: "Sign-in codes and notifications" },
  },
  alert: [person("kristof@lanth.me")],
})
