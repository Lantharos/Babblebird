# Sending translations back

Choose how translations reach the repository on the project's manage page, under **Sending translations back**:

- **Don't send**: Babblebird reads the repository but never writes to it. Use this while another tool still owns the translation files. Translations made here wait and go out in the first batch once you turn sending on.
- **After the checks pass**: changes go to a `babblebird/translations` branch with a pull request that merges itself once the repository's required checks pass (with GitHub's auto-merge), or right away if there are none.
- **Straight to the default branch**: changes are committed to the default branch. If it's protected, they go through the pull request instead.

Batches go out every ten minutes. Each is one commit that changes only the messages translated here, leaving comments, layout and everything else in the files as they were. Everyone who translated something in it with a GitHub account is a co-author.

## How changes on both sides are merged

Babblebird never holds on to a branch of its own. Every batch is rebuilt on top of the current default branch, so there's nothing to rebase or resolve, and it doesn't matter how a pull request lands: merge, squash or rebase all work, and so does force-pushing the default branch. Babblebird compares the messages themselves, not commits.

Each message is merged on its own, against what Babblebird last read from the repository:

- Only the repository changed it (someone edited the file by hand): the repository's version is taken, and the change shows in the string's history.
- Only Babblebird changed it: it goes out in the next batch.
- Both changed it to the same thing: nothing to do.
- Both changed it differently: the repository wins, and the version made here is kept as a suggestion marked "changed in the repository meanwhile", for a reviewer to pick up or dismiss.

Different messages never conflict, even in the same file, and a conflict never holds up the rest.

Messages deleted from the English disappear with their translations. Messages renamed without changing their text, and files moved or renamed without changing their English, keep their translations.

## When something goes wrong

The manage page says what happened and Babblebird carries on:

- **A pull request was closed without merging**: nothing new is sent until there are new translations, then a fresh pull request opens.
- **Checks failed**: the pull request stays as it is; the next batch replaces it with a fresh one built on the default branch.
- **The default branch is protected**: translations go through a pull request instead.
- **GitHub refused the write or couldn't be reached**: Babblebird tries again on its next run, ten minutes later.
