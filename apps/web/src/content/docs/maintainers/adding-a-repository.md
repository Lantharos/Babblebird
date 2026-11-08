# Add a repository

1. [Sign in](/sign-in) with GitHub.
2. In [Your projects](/dashboard), choose **Add a repository**. GitHub asks which repositories Babblebird may use; pick them and confirm.
3. GitHub sends you back to an import page that shows Babblebird reading the repository: the areas it finds, the strings and translations it reads, and how long it should take. You can close it; the progress also shows on the dashboard and the project page.

Babblebird needs no configuration. It looks for Fluent files at `**/locales/<language>/<name>.ftl`, with the source language (English unless you say otherwise) next to the others. Language folders use tags like `de`, `pt-BR` or `sr-Latn`.

After the first import, every push to the default branch that touches translation files, app manifests, `babblebird.toml`, glossaries or icons is read within a minute. Only the files that changed are read again.

To add more repositories later, choose **Add a repository** again; GitHub lets you change which repositories the app can see. Repositories you remove there disappear from Babblebird, and adding them back reconnects them with everything translated so far.

New projects start with sending turned off: Babblebird reads the repository but doesn't write to it until you choose how translations should come back. See [Sending translations back](/docs/sending-translations).
