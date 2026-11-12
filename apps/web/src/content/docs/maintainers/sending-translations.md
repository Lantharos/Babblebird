# Sending translations back

Choose how translations reach the repository on the project's manage page, under **Sending translations back**:

- **Don't send**: Babblebird reads the repository but never writes to it. Use this while another tool still owns the translation files. Translations made here wait and go out in the first batch once you turn sending on.
- **A pull request you merge**: changes go to a `babblebird/translations` branch with one pull request that stays open until you merge it. Babblebird keeps it up to date and shows on the manage page whether the repository's checks passed. Once it's merged, the next translations open a new one.
- **After the checks pass**: changes go to a `babblebird/translations` branch with a pull request that merges itself once the repository's required checks pass (with GitHub's auto-merge), or right away if there are none.
- **Straight to the default branch**: changes are committed to the default branch. If it's protected, they go through the pull request instead.

Babblebird waits until nobody has translated anything in the project for twenty minutes, so a long session goes out as one batch instead of a new one every few minutes. Work still goes out at least every six hours while people keep translating. Each batch is one commit that changes only the messages translated here, leaving comments, layout and everything else in the files as they were. Everyone who translated something in it with a GitHub account is a co-author, and stays one when the pull request is squashed.

If you turn off auto-merge on a translations pull request, Babblebird leaves it for you to merge however you like.

## How changes on both sides are merged

Babblebird never holds on to a branch of its own. Every batch is rebuilt on top of the current default branch, so there's nothing to rebase or resolve, and it doesn't matter how a pull request lands: merge, squash or rebase all work, and so does force-pushing the default branch. Babblebird compares the messages themselves, not commits.

Each message is merged on its own, against what Babblebird last read from the repository:

- Only the repository changed it (someone edited the file by hand): the repository's version is taken, and the change shows in the string's history.
- Only Babblebird changed it: it goes out in the next batch.
- Both changed it to the same thing: nothing to do.
- Both changed it differently: the repository wins, and the version made here is kept as a suggestion marked "changed in the repository meanwhile", for a reviewer to pick up or dismiss.

Different messages never conflict, even in the same file, and a conflict never holds up the rest. When the default branch moves while a translations pull request is open, Babblebird checks it again: if its messages changed or were removed in the repository it's rebuilt without them, and if nothing is left it's closed with a note saying why.

Messages deleted from the English disappear with their translations. Messages renamed without changing their text, and files moved or renamed without changing their English, keep their translations.

## When something goes wrong

The manage page says what happened and Babblebird carries on:

- **A pull request was closed without merging**: nothing new is sent until there are new translations, then a fresh pull request opens.
- **Checks failed**: the manage page says so and links the pull request. It stays as it is until the next batch replaces it with a fresh one built on the default branch.
- **The default branch is protected**: translations go through a pull request instead.
- **GitHub refused the write or couldn't be reached**: Babblebird tries again on its next run, ten minutes later.
