# Design

The repository is the only source of truth. Babblebird never asks anyone to configure components: it reads the repository, keeps a copy of the strings that's fast to search and edit, and writes translations back as commits.

## Pieces

- `apps/api` is the API, with Hono. It serves `/api/*`, receives GitHub webhooks, runs the sync and delivery queues and a ten-minute cron that retries failed reads.
- `apps/web` is the SvelteKit site.

Both deploy as one Worker, `babblebird`, at babblebird.dev. Its entry sends `/api/*` straight to Hono and everything else to SvelteKit, and when a page loads data on the server, SvelteKit reaches the API in the same Worker without a network hop. In development they run apart: Vite serves the site and proxies `/api` to `wrangler dev`.

- `packages/fluent` reads and writes Fluent: it turns a file into units, a message into editable fields and back, runs the checks and renders previews. The API and the editor share it, so a translation is checked the same way in the browser and on save.
- `packages/protocol` holds the types both sides speak.
- `action` is the GitHub Action that sends screenshots.
- `tools/local-github` serves a local git repository as the GitHub API, for running everything without a GitHub App.

## Storage

The D1 database `babblebird` holds accounts, installations, projects, members, deliveries, each project's progress per language and who contributed where. Strings live apart from it: every project has its own SQLite database in a `ProjectStrings` Durable Object, named by the project's id, so projects never compete for space and nothing has to be provisioned as they're added. The object owns every write: importing an area, saving a translation, sending, removing someone's work and storing screenshots are each one RPC that runs as one transaction next to the data, so two jobs for the same project can never interleave. Anything that talks to GitHub stays in the Worker and hands the object what it read. Reads that aren't part of a change go through one `query` method.

A project's strings database has:

| Table                                                                 | What it holds                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `area`, `file`                                                        | The areas found in a project and the file patterns in each, like `kestrel/ui/locales/{lang}/desktop.ftl`                                                                                                                                                        |
| `blob`                                                                | The git blob each language file was last read from, so unchanged files are skipped                                                                                                                                                                              |
| `source`                                                              | One row per English message: its body, a hash of it, its plain text, comment and group comment                                                                                                                                                                  |
| `translation`                                                         | One row per message and language, keyed by both, with the body, state, check results, who made it and the source hash it was made against. `unsent` marks a value the repository doesn't have yet, and `base` keeps the repository's value only when it differs |
| `progress`                                                            | Counts per area and language, recounted when something in that area changes                                                                                                                                                                                     |
| `tm_band`                                                             | MinHash bands of each source string, for finding similar ones within the project                                                                                                                                                                                |
| `source_search`                                                       | A trigram full-text index of each message's key and English, so search finds any part of a word across the whole project                                                                                                                                        |
| `credit`                                                              | Names credited from the repository's history, stored once and referenced by translations                                                                                                                                                                        |
| `glossary`, `suggestion`, `activity`, `pending`, `screenshot`, `shot` | What their names say                                                                                                                                                                                                                                            |

Shared translation memory lives in `Memory` Durable Objects, one per language pair like `en:de`, holding the translations of public projects with their MinHash bands. A project's database notes which languages changed, and an alarm a minute later replaces that project's entries in each pair, writing only the rows that differ. A project that turns private or is removed empties its entries the same way.

## Syncing

A push to the default branch only matters if it touches a locale file, a `Sabine.toml`, `extension.toml`, `babblebird.toml`, a glossary or an icon; other pushes cost nothing. A relevant push queues a scan: one request for the tree of the new commit, then the blob hashes are compared with what was read last time. Only changed blobs are fetched, a hundred at a time through GraphQL, and processed per area on the sync queue. The English file is diffed by message hash: new messages are inserted, changed ones update and mark their translations for review, removed ones are deleted. Translation files are diffed by body, so a push writes only what changed. Writes go through `json_each` statements, hundreds of rows each.

The first import also reads `git blame` for every translation file, so each translation keeps the names of the people who wrote it, including co-authors from Weblate commits.

## Areas

Locale files are found at `**/locales/<lang>/*.ftl`. Files belong to the nearest folder above them with a `Sabine.toml` or `extension.toml`, which gives the area its name and icon. Other folders become one area if they have one file, or one area per file if they have several, the way Kestrel's `desktop.ftl`, `surfaces.ftl` and so on each become their own area. `babblebird.toml` can name, group or skip anything, and declare languages generated from another one, like Serbian Latin from Cyrillic, which translators never see; see [babblebird.toml](https://babblebird.dev/docs/babblebird-toml).

## Getting started

Signing in comes first and leads to the dashboard, which lists the repositories you can push to that have the app, the projects you translate for and your recent work. Adding a repository goes to GitHub's install page; GitHub sends you back to `/setup`, which waits for the installation to arrive and then shows that repository's import as it happens: areas as they're found, strings and translations read in, and the time left. The import's progress is kept on the project, so the project page, the public list and the dashboard all show it until it's done.

Each project has a manage page for its maintainers: syncing and its history, how translations go back, who can translate, people and invitations, and removing it. Invitations by GitHub name or email turn into memberships when that person signs in. A project whose sync failed is read again on the next ten-minute run, picking up only the files it hadn't finished.

## Translating

Anyone signed in can translate public projects unless the project limits it to members; everyone else can suggest. Maintainers are whoever has write access to the repository, checked through the app and remembered for six hours. Maintainers add translators and reviewers, each for some or all languages and areas.

A translation is `translated`, `review` (its English changed, or it was imported from a changed source) or `approved`. Saving runs the checks: broken syntax, variables or terms the source doesn't have, missing attributes and tags that differ from the source are errors and block the save; missing variables, missing plural forms or ones the language doesn't use, punctuation, spacing, glossary terms and untranslated copies are warnings.

Earlier translations come from the project itself, by the same text (an indexed hash lookup) or similar text (MinHash bands, compared by trigram similarity), and from the language pair's shared memory, which only public projects add to.

## Live editing

The editor keeps a WebSocket open to the project's object, one per language, using hibernation so idle connections cost nothing. It says which string each translator has open, so the list and the form show who else is there, and every save is pushed to everyone on that language with the area's new progress. A translation saved by someone else while you're on it replaces your form if you haven't typed, and otherwise waits behind a note until you choose to see it.

## Sending translations back

Each project chooses whether translations go back: not at all, through a `babblebird/translations` branch whose pull request the maintainers merge or that merges itself when the checks pass, or straight to the default branch. Every save records the file and language as pending and sets an alarm on the project's object for twenty minutes later, or six hours after the oldest change waiting, whichever comes first; another save moves it. When it goes off, the project is queued for sending, which builds the changed files from the files at the head of the default branch, changing only the messages that differ so comments and layout stay, and commits them with the Git Data API in one tree and one commit, together with each generated language's files made from them. People who saved translations with a GitHub account are credited as co-authors.

Every translation knows the value Babblebird last read from the repository: the translation itself unless it's `unsent`, otherwise `base`. Syncing and sending both merge each message three ways: base, the repository now and the value here. A message changed on one side takes that side; changed differently on both, the repository wins and Babblebird's value becomes a suggestion marked as a conflict. A `pending` file and language stays until the repository holds what was translated here, which is checked by comparing values, so merges, squashes, rebases and force pushes all just work. Renamed messages are matched by their English, moved files by their English file's blob.

Turning sending on is a deliberate step on the project's manage page, since another tool writing the same files would fight with it.
