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

Locale files are found at `**/locales/<lang>/*.ftl`. Files belong to the nearest folder above them with a `Sabine.toml` or `extension.toml`, which gives the area its name and icon. Other folders become one area if they have one file, or one area per file if they have several, the way Kestrel's `desktop.ftl`, `surfaces.ftl` and so on each become their own area. `babblebird.toml` can name, group or skip anything; see [babblebird.toml](https://babblebird.dev/docs/babblebird-toml).

## Getting started

Signing in comes first and leads to the dashboard, which lists the repositories you can push to that have the app, the projects you translate for and your recent work. Adding a repository goes to GitHub's install page; GitHub sends you back to `/setup`, which waits for the installation to arrive and then shows that repository's import as it happens: areas as they're found, strings and translations read in, and the time left. The import's progress is kept on the project, so the project page, the public list and the dashboard all show it until it's done.

Each project has a manage page for its maintainers: syncing and its history, how translations go back, who can translate, people and invitations, and removing it. Invitations by GitHub name or email turn into memberships when that person signs in. A project whose sync failed is read again on the next ten-minute run, picking up only the files it hadn't finished.

## Translating

Anyone signed in can translate public projects unless the project limits it to members; everyone else can suggest. Maintainers are whoever has write access to the repository, checked through the app and remembered for six hours. Maintainers add translators and reviewers, each for some or all languages and areas.

A translation is `translated`, `review` (its English changed, or it was imported from a changed source) or `approved`. Saving runs the checks: broken syntax, variables or terms the source doesn't have, missing attributes and tags that differ from the source are errors and block the save; missing variables, missing plural forms or ones the language doesn't use, punctuation, spacing, glossary terms and untranslated copies are warnings.

Earlier translations come from the same text anywhere in the strings database (an indexed hash lookup) and from similar text (MinHash bands, compared by trigram similarity). Only public projects share them.

## Sending translations back

Each project chooses whether translations go back: not at all, through a `babblebird/translations` branch whose pull request merges itself when the checks pass, or straight to the default branch. Every save records the file and language as pending. Every ten minutes the cron builds the changed files from the files at the head of the default branch, changing only the messages that differ so comments and layout stay, and commits them with the Git Data API in one tree and one commit. People who saved translations with a GitHub account are credited as co-authors.

Every translation row keeps `base`, the value Babblebird last read from the repository. Syncing and sending both merge each message three ways: base, the repository now and the value here. A message changed on one side takes that side; changed differently on both, the repository wins and Babblebird's value becomes a suggestion marked as a conflict. A `pending` file and language stays until the repository holds what was translated here, which is checked by comparing values, so merges, squashes, rebases and force pushes all just work. Renamed messages are matched by their English, moved files by their English file's blob.

Turning sending on is a deliberate step on the project's manage page, since another tool writing the same files would fight with it.
