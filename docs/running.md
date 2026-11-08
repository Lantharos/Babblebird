# Running Babblebird

## Locally

Everything runs on your machine, with a local git repository standing in for GitHub:

```sh
bun install
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Fill in `.dev.vars` with a long random `BETTER_AUTH_SECRET`, a random `GITHUB_WEBHOOK_SECRET`, an RSA key for `GITHUB_APP_PRIVATE_KEY` (any `openssl genrsa 2048` key works locally), and add `GITHUB_API=http://localhost:8790` and `PUBLIC_URL=http://localhost:5180`. Then:

```sh
git clone --bare --shared ../luft /tmp/luft.git
bun tools/local-github/server.ts --repo /tmp/luft.git
cd apps/api && bun run db:migrate && bun run dev
cd apps/web && bun run dev
bun tools/local-github/send.ts install
```

`send.ts push <before> <after> --repo /tmp/luft.git` sends a push for a range of commits. The local server also takes commits, branches and pull requests, so sending translations back writes real commits into the bare repository. Sign-in codes show up in the API's log.

## On Cloudflare

```sh
cd apps/api && bun run deploy
cd apps/web && bun run deploy
```

The API Worker needs these secrets, set with `bunx wrangler secret put <name>` in `apps/api`:

| Secret                                     | What it is                                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                       | A long random string for sessions                                                                   |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | The GitHub App's client ID and secret, used for signing in with GitHub and for the app's own tokens |
| `GITHUB_APP_PRIVATE_KEY`                   | The GitHub App's private key, as downloaded                                                         |
| `GITHUB_WEBHOOK_SECRET`                    | The GitHub App's webhook secret                                                                     |

`bun scripts/github-app.ts` in `apps/api` creates the GitHub App from `scripts/github-app.json` and stores its four secrets in the Worker: open the page it prints, confirm on GitHub, and it does the rest.

Sign-in codes are sent with Cloudflare's Email Service from `no-reply@babblebird.dev`, which needs the domain set up for sending in the dashboard.
