# Plurals and placeables

Projects on Babblebird use [Fluent](https://projectfluent.org). You don't need to write Fluent syntax: the editor turns each message into plain fields and puts the syntax back together for you.

## Placeables

Anything in curly braces, such as `{ $count }` or `{ $name }`, is filled in by the app. Keep it, move it to where it belongs in your sentence, and don't translate what's inside. The chips under the fields insert one where your cursor is.

The checks tell you when a placeable from the English is missing, and stop you from saving one the English doesn't have, since the app has no value for it.

## Plural forms

When a message depends on a number, you get one field for every form your language has, not just the ones English needs. English has two forms; Croatian has three:

| Form  | Used for     | Croatian            |
| ----- | ------------ | ------------------- |
| one   | 1, 21, 31…   | Još { $count } sat  |
| few   | 2, 3, 4, 22… | Još { $count } sata |
| other | 0, 5, 6, 11… | Još { $count } sati |

The numbers next to each field show which counts use it, and the preview shows the text for a few real numbers. Fill in every form, even if two of them look the same in your language.

Some messages also have a field for an exact number, such as `0`, when the English says something special for it ("No files").

## Other choices

Messages can also change with something other than a number, such as the kind of device. You get one field per case, named after it, and the one marked as the default is used for anything else.
