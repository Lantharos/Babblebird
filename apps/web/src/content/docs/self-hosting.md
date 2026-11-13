# Running Babblebird yourself

Babblebird is open source under the AGPL. It runs on Cloudflare: two Workers, D1, Durable Objects, R2 and Queues.

## Locally

You need [Bun](https://bun.sh). Everything runs on your machine, with a local git repository standing in for GitHub.

```sh
git clone https://github.com/Lantharos/Babblebird
cd Babblebird
bun install
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

In `apps/api/.dev.vars`, set a long random `BETTER_AUTH_SECRET` and `GITHUB_WEBHOOK_SECRET`, any RSA key as `GITHUB_APP_PRIVATE_KEY` (`openssl genrsa 2048`), and add `GITHUB_API=http://localhost:8790` and `PUBLIC_URL=http://localhost:5180`. Then, in separate terminals:

```sh
git clone --bare --shared ../your-project /tmp/project.git
bun tools/local-github/server.ts --repo /tmp/project.git --owner you --name project
cd apps/api && bun run db:migrate && bun run dev
cd apps/web && bun run dev
bun tools/local-github/send.ts install --owner you --name project
```

Open http://localhost:5180. Sign-in codes appear in the API's output. `send.ts push <before> <after> --repo /tmp/project.git` sends a push for a range of commits, and translations sent back become real commits in the bare repository.

## On Cloudflare

Create the D1 database, the R2 bucket and the two queues named in `apps/api/wrangler.jsonc`, then:

```sh
cd apps/api && bun run deploy
cd apps/web && bun run deploy
```

`bun scripts/github-app.ts` in `apps/api` creates a GitHub App from `scripts/github-app.json` and stores its secrets in the Worker. Set `BETTER_AUTH_SECRET` yourself with `bunx wrangler secret put BETTER_AUTH_SECRET`. Sign-in codes are sent with Cloudflare's Email Service, which needs your domain set up for sending.

How it works inside is in [docs/design.md](https://github.com/Lantharos/Babblebird/blob/main/docs/design.md).
