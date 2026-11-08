# Design

The repository is the only source of truth. Babblebird never asks anyone to configure components: it reads the repository, keeps a copy of the strings that's fast to search and edit, and writes translations back as commits.

## Pieces

- `apps/api` is a Cloudflare Worker with Hono. It serves `/api/*`, receives GitHub webhooks, runs the sync and delivery queues and a ten-minute cron.
- `apps/web` is a SvelteKit app on Workers at babblebird.dev. It forwards `/api/*` to the API Worker through a service binding.
- `packages/fluent` reads and writes Fluent: it turns a file into units, a message into editable fields and back, runs the checks and renders previews. The API and the editor share it, so a translation is checked the same way in the browser and on save.
- `packages/protocol` holds the types both sides speak.
- `action` is the GitHub Action that sends screenshots.
- `tools/local-github` serves a local git repository as the GitHub API, for running everything without a GitHub App.

## Storage

There are two kinds of D1 database. `babblebird` holds accounts, installations, projects, members and deliveries. Strings live in a strings database, `babblebird-strings-0` today; every project records which one it uses, so more can be added when one fills up.

A strings database has:

| Table                                                                 | What it holds                                                                                                                             |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `area`, `file`                                                        | The areas found in a project and the file patterns in each, like `kestrel/ui/locales/{lang}/desktop.ftl`                                  |
| `blob`                                                                | The git blob each language file was last read from, so unchanged files are skipped                                                        |
| `source`                                                              | One row per English message: its body, a hash of it, its plain text, comment and group comment                                            |
| `translation`                                                         | One row per message and language, keyed by both, with the body, state, check results, who made it and the source hash it was made against |
| `progress`                                                            | Counts per area and language, recounted when something in that area changes                                                               |
| `tm_band`                                                             | MinHash bands of each public source string, for finding similar ones                                                                      |
| `glossary`, `suggestion`, `activity`, `pending`, `screenshot`, `shot` | What their names say                                                                                                                      |

## Syncing

A push to the default branch only matters if it touches a locale file, a `Sabine.toml`, `extension.toml`, `babblebird.toml`, a glossary or an icon; other pushes cost nothing. A relevant push queues a scan: one request for the tree of the new commit, then the blob hashes are compared with what was read last time. Only changed blobs are fetched, a hundred at a time through GraphQL, and processed per area on the sync queue. The English file is diffed by message hash: new messages are inserted, changed ones update and mark their translations for review, removed ones are deleted. Translation files are diffed by body, so a push writes only what changed. Writes go through `json_each` statements, hundreds of rows each.

The first import also reads `git blame` for every translation file, so each translation keeps the names of the people who wrote it, including co-authors from Weblate commits.

## Areas

Locale files are found at `**/locales/<lang>/*.ftl`. Files belong to the nearest folder above them with a `Sabine.toml` or `extension.toml`, which gives the area its name and icon. Other folders become one area if they have one file, or one area per file if they have several, the way Kestrel's `desktop.ftl`, `surfaces.ftl` and so on each become their own area. `babblebird.toml` can name, group or skip anything; see [repositories](repositories.md).

## Translating

Anyone signed in can translate public projects unless the project limits it to members; everyone else can suggest. Maintainers are whoever has write access to the repository, checked through the app and remembered for six hours. Maintainers add translators and reviewers, each for some or all languages and areas.

A translation is `translated`, `review` (its English changed, or it was imported from a changed source) or `approved`. Saving runs the checks: broken syntax, variables or terms the source doesn't have and missing attributes are errors and block the save; missing variables, missing plural forms, punctuation, spacing, glossary terms and untranslated copies are warnings.

Earlier translations come from the same text anywhere in the strings database (an indexed hash lookup) and from similar text (MinHash bands, compared by trigram similarity). Only public projects share them.

## Sending translations back

Each project chooses whether translations go back: not at all, through a `babblebird/translations` branch whose pull request merges itself when the checks pass, or straight to the default branch. Every save records the file and language as pending. Every ten minutes the cron builds the changed files from the files at the head of the default branch, changing only the messages that differ so comments and layout stay, and commits them with the Git Data API in one tree and one commit. People who saved translations with a GitHub account are credited as co-authors.

Turning sending on is a deliberate step in the project's status page, since another tool writing the same files would fight with it.
