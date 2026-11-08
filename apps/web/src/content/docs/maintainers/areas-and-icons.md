# Areas and icons

Translators work in areas: parts of the project small enough to finish. Babblebird finds them on its own.

- A folder with a **`Sabine.toml`** makes everything below it one area, named after `[app] name`, with the icon from `[app] icon`.
- A folder with an **`extension.toml`** does the same with its `name`, and the `icon.svg` or `icon.png` beside it.
- Any **other folder** with a `locales/` folder becomes one area if it has one file, named after the folder, or one area per file if it has several. Kestrel's `desktop.ftl`, `surfaces.ftl` and `system.ftl`, for example, each become their own area.
- Files under `node_modules`, `fixtures`, `dist`, `build` and `vendor` are skipped.

Areas without an icon of their own get a coloured shape, the same one every time.

## The project's icon

The project's own icon shows next to its name, in lists and on its badge. Babblebird uses `icon` from `babblebird.toml` if you set one, otherwise the first of `.github/logo.svg`, `logo.svg`, `icon.svg`, `assets/logo.svg`, `docs/logo.svg`, `public/favicon.svg` or `static/favicon.svg` it finds, and otherwise the owner's GitHub picture.

## Changing names and grouping

Anything here can be changed with [`babblebird.toml`](/docs/babblebird-toml): name areas, group several files into one, give them icons or skip folders.
