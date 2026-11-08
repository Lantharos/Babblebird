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
| `PULT_KEY`                                 | The key of the Pult environment Babblebird is run from; without it mail is only stored              |

`bun scripts/github-app.ts` in `apps/api` creates the GitHub App from `scripts/github-app.json` and stores its four secrets in the Worker: open the page it prints, confirm on GitHub, and it does the rest.

Sign-in codes are sent with Cloudflare's Email Service from `no-reply@babblebird.dev`, which needs the domain set up for sending in the dashboard.

Adding the app asks GitHub to authorize the person installing it too, so they arrive signed in. The app's first callback URL must be `/api/auth/github/installed`, with "Request user authorization (OAuth) during installation" ticked; `/api/auth/callback/github` stays as the second for ordinary sign-ins.

## Running the service

Babblebird is run from the Pult project `babblebird`. Its definitions live in `apps/api/src/ops/define`: the people, projects and GitHub installations, what can be done to them, the inboxes, the overview page and the flags.

Each project shows its repository, installation, state, delivery and open pull request, its languages with their progress, its members and translators, and its recent reads. From there it can be read again, sent now, have its delivery or who translates changed, be paused and resumed, removed and brought back, and have one person's work taken out. Pausing stops reading pushes and sending translations, and the project page tells its visitors it can't be translated for now.

Each person shows their email (hidden until revealed), GitHub account, sign-in methods, open sessions, memberships, where they translated and what they did last. A person can be suspended, which signs them out, refuses new sign-ins and blocks everything they'd change straight away; signed out everywhere; removed from a project; have their work removed; or have their account deleted. Removing someone's work puts back what the repository has for every translation they last changed that isn't in the repository yet, and deletes their suggestions; what's already merged stays, since that's in the repository's history. Deleting an account keeps its translations, credited to a translator without a name.

An installation lists its projects and can add the repositories GitHub covers that Babblebird never heard about.

The inboxes:

- `failures` gets an item when reading a repository or sending translations fails, one per project and kind, counting each new failure and reopening once it's marked fixed. Babblebird retries on its own every ten minutes, so an item that stops counting up has usually sorted itself out.
- `new-projects` gets every repository once its first read is done, for a look over; triage tags the ones that look like spam.
- `mail` is described below.

The overview page has the totals and lists the projects that fail to read or send, are importing or are paused, and the suspended people. The flags: `deliveries` holds every pull request and commit while it's off, and `new-accounts` refuses new sign-ups while it's off.

The public status page is at status.pult.sh/<organization>/babblebird. Pult checks the website itself and follows the Worker through its pings, and alerts the owner when either goes down. GitHub syncing and email are set by hand from Status in the Pult console, where incidents are posted too.

`pult build` in `apps/api` turns the definitions into `.pult/`, which is committed. The deployed Worker publishes them to the `prod` environment by itself on its next scheduled run, within ten minutes, so deploying the Worker is enough; the `dev` environment takes them with `bunx pult deploy` and its own key.

## Email

Mail to `hello@`, `privacy@` and `security@babblebird.dev` reaches the API Worker through Cloudflare Email Routing, with a rule per address plus one for `no-reply@`, and the catch-all sent to the Worker too. Plus-addressing (subaddressing) is on in Email Routing's settings so replies to `hello+<item>@` find their conversation. Mail to `no-reply@` and to anyone else is refused with a note saying where to write instead.

Each new conversation becomes an item in the `mail` inbox of the Pult project `babblebird`, tagged with its address, with the original message and attachments as files; the raw message is kept in R2 under `mail/`. Replies written in Pult go out from the address the mail came to, and answers thread back onto the same item. Mail failing its sender's DMARC policy is refused, mail failing SPF without DKIM is only kept in `mail/quarantine/`, and one sender can send ten messages a minute. If Pult can't be reached, the message waits and goes on the next scheduled run.
