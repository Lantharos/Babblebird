import manifest from "./github-app.json" with { type: "json" }

const PORT = 3555
const ORGANIZATION = process.argv[2] ?? "Lantharos"
const state = crypto.randomUUID()
const here = `http://localhost:${PORT}`

interface Conversion {
  id: number
  slug: string
  html_url: string
  client_id: string
  client_secret: string
  webhook_secret: string
  pem: string
}

async function putSecret(name: string, value: string) {
  const child = Bun.spawn(["bunx", "wrangler", "secret", "put", name], {
    cwd: `${import.meta.dir}/..`,
    stdin: "pipe",
    stdout: "ignore",
  })
  child.stdin.write(value)
  await child.stdin.end()
  if ((await child.exited) !== 0) throw new Error(`wrangler couldn't store ${name}`)
  console.log(`Stored ${name}`)
}

const page = `<!doctype html><meta charset="utf-8"><title>Create the Babblebird GitHub App</title>
<body style="font: 16px system-ui; max-width: 32rem; margin: 15vh auto">
<form method="post" action="https://github.com/organizations/${ORGANIZATION}/settings/apps/new?state=${state}">
<p>This creates the Babblebird GitHub App under ${ORGANIZATION}. GitHub asks you to confirm the name, then sends you back here.</p>
<input type="hidden" name="manifest" value='${JSON.stringify({ ...manifest, redirect_url: `${here}/done` }).replace(/'/g, "&#39;")}'>
<button style="font: inherit; padding: .6rem 1.2rem">Create the app on GitHub</button>
</form></body>`

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== "/done") return new Response(page, { headers: { "content-type": "text/html" } })
    if (url.searchParams.get("state") !== state)
      return new Response("That didn't come from this setup.", { status: 400 })
    const response = await fetch(
      `https://api.github.com/app-manifests/${url.searchParams.get("code")}/conversions`,
      {
        method: "POST",
        headers: { accept: "application/vnd.github+json" },
      },
    )
    if (!response.ok) return new Response(`GitHub answered ${response.status}`, { status: 502 })
    const app = (await response.json()) as Conversion
    await putSecret("GITHUB_CLIENT_ID", app.client_id)
    await putSecret("GITHUB_CLIENT_SECRET", app.client_secret)
    await putSecret("GITHUB_WEBHOOK_SECRET", app.webhook_secret)
    await putSecret("GITHUB_APP_PRIVATE_KEY", app.pem)
    console.log(
      `Created ${app.html_url} (slug ${app.slug}). If the slug isn't "babblebird-translate", update GITHUB_APP_URL in packages/protocol.`,
    )
    setTimeout(() => server.stop(), 500)
    return new Response(
      "Done. The app is created and its keys are stored in the babblebird Worker. You can close this tab.",
    )
  },
})

console.log(`Open ${here} to create the GitHub App.`)
