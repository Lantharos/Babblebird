# babblebird.toml

An optional `babblebird.toml` at the root of the repository changes how Babblebird reads it. Everything in it is optional.

```toml
source = "en"
icon = "web/site/public/favicon.svg"
ignore = ["tools/fixtures/**"]
glossary = "packages/i18n/glossary/{lang}.tbx"

[[generated]]
lang = "sr-Latn"
from = "sr"
transform = "serbian-cyrillic-to-latin"

[[areas]]
name = "Desktop"
files = ["kestrel/ui/locales/{lang}/desktop.ftl"]

[[areas]]
name = "Website"
files = ["web/site/locales/{lang}/*.ftl"]
icon = "web/site/public/favicon.svg"
```

| Key                   | What it does                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `source`              | The language the project is written in. Defaults to `en`.                                                 |
| `icon`                | The project's icon, shown next to its name. Areas don't use it.                                           |
| `ignore`              | Paths to skip, added to the ones always skipped.                                                          |
| `glossary`            | Where the glossary for each language lives, as TBX. Found on its own at `**/glossary/<language>.tbx`.     |
| `[[generated]]`       | Languages whose files are made from another language's, so nobody translates them twice.                  |
| `generated.lang`      | The language that's generated, such as `sr-Latn`.                                                         |
| `generated.from`      | The language it's made from, such as `sr`.                                                                |
| `generated.transform` | How it's made. `serbian-cyrillic-to-latin` writes Serbian Cyrillic in Latin letters.                      |
| `[[areas]]`           | Areas you name yourself, in the order you list them.                                                      |
| `areas.name`          | The area's name.                                                                                          |
| `areas.files`         | The files that belong to it. `{lang}` stands for the language folder; `*` and `**` work as usual.         |
| `areas.icon`          | The area's icon. Without it, an area whose files all belong to one app or extension uses that one's icon. |

## Generated languages

A generated language doesn't show up for translators. Whenever Babblebird sends a file in the language it's made from, the same commit carries that file again in the generated language, made from the whole file, so the two never drift apart. A transform Babblebird doesn't know stops `babblebird.toml` from being read, and the project's manage page says why.

Files no area claims are grouped as described in [Areas and icons](/docs/areas-and-icons). Changes to `babblebird.toml` are picked up with the next push.
