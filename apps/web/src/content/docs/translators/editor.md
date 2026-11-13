# The editor

The editor has three columns: the list of strings on the left, the string you're translating in the middle, and what helps you translate it on the right.

## The list

The filter at the top picks what you see:

- **To do**: strings with no translation yet.
- **Review**: translations whose English changed since, or that someone flagged.
- **Problems**: translations a check is unhappy with.
- **All**: everything in the area.

The dot in front of each string says where it stands: empty for missing, green for translated, amber for needs review, red for a problem. Search with <kbd>Ctrl</kbd> <kbd>K</kbd>; it looks at keys, English and translations across every area of the project.

## Translating a string

Above the fields you see the key, the file it comes from, the developers' comment if there is one, and the English. Glossary terms in the English are underlined; hover one to see how it's usually translated.

If someone else is translating the same language, you see them next to the strings they have open, and their work shows up as they save. When they save the string you're on, it updates if you haven't typed yet; otherwise a note lets you look at theirs when you're ready.

Messages with attributes, such as a button's label and its tooltip, get one field per attribute. Messages that change with a number get one field per plural form of your language; see [Plurals and placeables](/docs/plurals-and-placeables).

Under the fields you see what's wrong while you type, and a preview of the finished text with sample values filled in.

## Keys

| Keys                                                      | What they do                                           |
| --------------------------------------------------------- | ------------------------------------------------------ |
| <kbd>Ctrl</kbd> <kbd>Enter</kbd>                          | Save and go to the next string                         |
| <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Enter</kbd>         | Approve and go on (reviewers)                          |
| <kbd>Alt</kbd> <kbd>↓</kbd> / <kbd>Alt</kbd> <kbd>↑</kbd> | Next or previous string without saving                 |
| <kbd>Alt</kbd> <kbd>1</kbd>…<kbd>5</kbd>                  | Use one of the earlier translations shown on the right |
| <kbd>Alt</kbd> <kbd>I</kbd>                               | Start from the English                                 |
| <kbd>Ctrl</kbd> <kbd>K</kbd>                              | Search                                                 |
| <kbd>?</kbd>                                              | Show these keys                                        |

On a Mac, <kbd>Cmd</kbd> works in place of <kbd>Ctrl</kbd>.

## Next to the string

- **Where it shows**: screenshots from the project with the string marked, when the project sends them. Click one to see it larger.
- **Glossary**: the agreed translations for terms in this string.
- **Seen before**: translations of the same or similar English from this project and other public ones, with how close they are.
- **Discussion**: questions and notes about the string, either for your language or about the English. Anyone can resolve a discussion once it's settled, and a string with an open one shows a speech bubble in the list. When someone replies to a discussion you took part in, you get an email.
- **Suggestions**: what others proposed.
- **History**: who changed the translation and when, including changes made directly in the repository.
