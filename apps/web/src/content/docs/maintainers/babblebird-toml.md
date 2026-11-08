# babblebird.toml

An optional `babblebird.toml` at the root of the repository changes how Babblebird reads it. Everything in it is optional.

```toml
source = "en"
icon = "web/site/public/favicon.svg"
ignore = ["tools/fixtures/**"]
glossary = "packages/i18n/glossary/{lang}.tbx"

[[areas]]
name = "Desktop"
files = ["kestrel/ui/locales/{lang}/desktop.ftl"]

[[areas]]
name = "Website"
files = ["web/site/locales/{lang}/*.ftl"]
icon = "web/site/public/favicon.svg"
```

| Key           | What it does                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `source`      | The language the project is written in. Defaults to `en`.                                                 |
| `icon`        | The project's icon, shown next to its name. Areas don't use it.                                           |
| `ignore`      | Paths to skip, added to the ones always skipped.                                                          |
| `glossary`    | Where the glossary for each language lives, as TBX. Found on its own at `**/glossary/<language>.tbx`.     |
| `[[areas]]`   | Areas you name yourself, in the order you list them.                                                      |
| `areas.name`  | The area's name.                                                                                          |
| `areas.files` | The files that belong to it. `{lang}` stands for the language folder; `*` and `**` work as usual.         |
| `areas.icon`  | The area's icon. Without it, an area whose files all belong to one app or extension uses that one's icon. |

Files no area claims are grouped as described in [Areas and icons](/docs/areas-and-icons). Changes to `babblebird.toml` are picked up with the next push.
