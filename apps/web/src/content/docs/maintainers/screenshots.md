# Screenshots

Translators see where a string appears when your CI sends screenshots along with the keys that were on screen. Add the action to a workflow that takes them:

```yaml
jobs:
  screenshots:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v6
      - run: ./capture-screenshots.sh
      - uses: Lantharos/Babblebird/action@main
        with:
          manifest: screenshots/manifest.json
```

The action proves it runs in your repository with GitHub's own workflow token, so there's no secret to store. It only works for repositories with the app installed.

The manifest lists the images, relative to the manifest, and the strings on each:

```json
{
  "screenshots": [
    {
      "file": "window-menu.png",
      "name": "Window menu on the taskbar",
      "lang": "en",
      "strings": [
        { "key": "window-menu-close", "box": [612, 380, 180, 32] },
        { "key": "window-menu-pin", "file": "kestrel/ui/locales/en/desktop.ftl" }
      ]
    }
  ]
}
```

| Field            | Meaning                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `file`           | The image, PNG or WebP, up to 10 MB.                                                                                  |
| `name`           | What it shows. A new upload with the same name and language replaces the old one.                                     |
| `lang`           | The language it was taken in. Translators see their own language's screenshots when there are some. Defaults to `en`. |
| `strings[].key`  | A message key on screen.                                                                                              |
| `strings[].file` | Only needed when the same key is in more than one file.                                                               |
| `strings[].box`  | Where the string is, as `[x, y, width, height]` in the image's pixels, to mark it.                                    |

The action sends forty screenshots at a time and warns about keys the project doesn't have.
