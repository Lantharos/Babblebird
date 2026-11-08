# Screenshots

Translators see a screenshot of where a string appears, with the string marked when its position is known. A project's CI sends them with the Babblebird action:

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

The action signs in with the workflow's GitHub token, so nothing needs to be stored in the repository. It only works for repositories that have the app installed.

The manifest lists the images, relative to the manifest, and the strings on each:

```json
{
  "screenshots": [
    {
      "file": "window-menu.png",
      "name": "Window menu on the taskbar",
      "lang": "en",
      "strings": [
        {
          "key": "window-menu-close",
          "file": "kestrel/ui/locales/en/desktop.ftl",
          "box": [612, 380, 180, 32]
        },
        { "key": "window-menu-pin" }
      ]
    }
  ]
}
```

- `file` and `name` are required; a new upload with the same name and language replaces the old one.
- `lang` is the language the screenshot was taken in. Translators see screenshots in their own language when there are some, and the source language's otherwise.
- `strings[].file` is only needed when the same key is in several files. `box` is `[x, y, width, height]` in the image's pixels.
- Images are PNG or WebP, up to 10 MB each. The action sends them forty at a time.

The upload API is `POST /api/projects/<owner>/<repo>/screenshots`, a multipart form with the manifest in a `manifest` field and each image in a field named after its `file`, with the GitHub Actions OIDC token for the audience `https://babblebird.dev` as the bearer token.
