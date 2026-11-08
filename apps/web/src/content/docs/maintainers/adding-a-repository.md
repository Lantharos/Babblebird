# Add a repository

1. Choose **Add a repository**, on the home page or in [Your projects](/dashboard). You don't need to sign in first.
2. GitHub asks which repositories Babblebird may use; pick them and confirm. Adding the app also signs you in to Babblebird with that GitHub account, and connects it to an existing Babblebird account with the same email address.
3. GitHub sends you back to an import page that shows Babblebird reading the repository: the areas it finds, the strings and translations it reads, and how long it should take. You can close it; the progress also shows on the dashboard and the project page.

Babblebird only shows a repository's setup to people GitHub says can manage the app there. If you added the app from GitHub's own pages, or you're signed in with only an email address, Babblebird asks you to sign in with or link that GitHub account first.

Babblebird needs no configuration. It looks for Fluent files at `**/locales/<language>/<name>.ftl`, with the source language (English unless you say otherwise) next to the others. Language folders use tags like `de`, `pt-BR` or `sr-Latn`.

After the first import, every push to the default branch that touches translation files, app manifests, `babblebird.toml`, glossaries or icons is read within a minute. Only the files that changed are read again.

To add more repositories later, choose **Add a repository** again; GitHub lets you change which repositories the app can see. Repositories you remove there disappear from Babblebird, and adding them back reconnects them with everything translated so far.

New projects start with sending turned off: Babblebird reads the repository but doesn't write to it until you choose how translations should come back. See [Sending translations back](/docs/sending-translations).
