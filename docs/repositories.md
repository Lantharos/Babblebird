# Repositories

Babblebird needs nothing in a repository beyond Fluent files at `**/locales/<lang>/<name>.ftl`, with English (or the source language) next to the others. Language folders use BCP 47 tags such as `de`, `pt-BR` or `sr-Latn`.

## How files become areas

- A folder with a `Sabine.toml` makes everything below it one area, named after `[app] name` with the icon from `[app] icon`.
- A folder with an `extension.toml` does the same with its `name` and the `icon.svg` beside it.
- Any other folder with locales becomes one area if it has one file, named after the folder, or one area per file if it has several.
- Files under `node_modules`, `fixtures`, `dist`, `build` and `vendor` are skipped.
- A glossary at `**/glossary/<lang>.tbx` is read as the glossary for that language. Terms marked "Translation needed: No" are kept as they are.

## babblebird.toml

An optional `babblebird.toml` at the root of the repository changes any of this:

```toml
source = "en"
ignore = ["kestrel/tools/fixtures/**"]
glossary = "packages/i18n/glossary/{lang}.tbx"

[[areas]]
name = "Website"
files = ["web/site/locales/{lang}/*.ftl"]

[[areas]]
name = "Desktop"
files = ["kestrel/ui/locales/{lang}/desktop.ftl"]
icon = "kestrel/ui/icons/desktop.svg"
```

`files` takes patterns with `{lang}` where the language folder is, and `*` and `**` as usual. Areas listed here come first, in this order; files they don't claim are grouped as above.

## What gets written

Translations go to the same path with the language folder swapped in. Babblebird only changes the messages that differ from the file in the repository: comments, group comments and blank lines stay where they are, new messages go after the message that comes before them in English, and messages whose translation was removed are taken out.
