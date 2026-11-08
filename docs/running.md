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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google OAuth client for "Continue with Google"; leave them unset to hide it                     |
| `PULT_KEY`                                 | The key of the Pult environment that receives Babblebird's mail; without it mail is only stored     |

`bun scripts/github-app.ts` in `apps/api` creates the GitHub App from `scripts/github-app.json` and stores its four secrets in the Worker: open the page it prints, confirm on GitHub, and it does the rest.

Sign-in codes are sent with Cloudflare's Email Service from `no-reply@babblebird.dev`, which needs the domain set up for sending in the dashboard.

Adding the app asks GitHub to authorize the person installing it too, so they arrive signed in. The app's first callback URL must be `/api/auth/github/installed`, with "Request user authorization (OAuth) during installation" ticked; `/api/auth/callback/github` stays as the second for ordinary sign-ins.

## Email

Mail to `hello@`, `privacy@` and `security@babblebird.dev` reaches the API Worker through Cloudflare Email Routing, with a rule per address plus one for `no-reply@`, and the catch-all sent to the Worker too. Plus-addressing (subaddressing) is on in Email Routing's settings so replies to `hello+<item>@` find their conversation. Mail to `no-reply@` and to anyone else is refused with a note saying where to write instead.

Each new conversation becomes an item in the `mail` inbox of the Pult project `babblebird`, tagged with its address, with the original message and attachments as files; the raw message is kept in R2 under `mail/`. Replies written in Pult go out from the address the mail came to, and answers thread back onto the same item. Mail failing its sender's DMARC policy is refused, mail failing SPF without DKIM is only kept in `mail/quarantine/`, and one sender can send ten messages a minute. If Pult can't be reached, the message waits and goes on the next scheduled run.

`pult build` in `apps/api` turns the inbox definitions in `src/inbox/define` into `.pult/`, which is committed; the Worker publishes them to Pult when they change.
