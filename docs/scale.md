# Scale and cost

Babblebird is built to stay cheap at hundreds of thousands of strings per project. The numbers below come from loading Luft's real repository locally through the same code that runs in production, with `tools/local-github` standing in for GitHub.

## Luft

|                     |                               |
| ------------------- | ----------------------------- |
| English messages    | 5,474 in 46 files, 33 areas   |
| Languages           | 35 besides English            |
| Translations stored | 119,383 (of 191,590 possible) |
| Glossary terms      | 4,428 across 35 TBX files     |
| Project storage     | 13 MB                         |
| Shared memory       | about 0.5 MB per language     |

### A first import

|              |                                    |
| ------------ | ---------------------------------- |
| Files read   | 1,665, fetched a hundred at a time |
| Queue jobs   | 34, one per area                   |
| Rows read    | 2.7 million                        |
| Rows written | 323,000                            |

The largest job, Settings with 7 files in 37 languages, takes a few seconds of CPU; most of its wall time is reading `git blame` for the credits.

### Pushes

The last 30 commits on Luft's main branch, replayed one by one:

- 11 didn't touch translations and cost nothing beyond the webhook.
- The other 19 each read the tree once and compared blob hashes: about 1,900 rows read and 2 written.
- Each changed area then read between 1,000 and 130,000 rows (recounting a big area after an English change) and wrote between 10 and 810.
- All 19 together: 0.8 million rows read, 8,640 written.

### The editor

Measured locally, warm:

| Request                                                                              | Time  |
| ------------------------------------------------------------------------------------ | ----- |
| A page of 50 strings with their translations                                         | 12 ms |
| One string with glossary, earlier translations, suggestions, screenshots and history | 23 ms |
| Saving a translation                                                                 | 40 ms |

Saving is one round trip to the project's storage, which writes the translation, its activity entry, the pending file and the area's progress in one transaction, and two small writes to the main database: the project's progress and the translator's contribution. The project page, the project list and badges read progress from the main database and never touch the strings.

## Cost per month

On the Workers Paid plan ($5 a month, shared with every other Worker on the account), SQLite in Durable Objects includes 25 billion rows read, 50 million rows written, 5 GB of storage and a million requests; D1 includes the same rows and storage again for the main database; Queues include a million operations; R2 includes 10 GB.

|                           | Luft                             | Ten times Luft                        |
| ------------------------- | -------------------------------- | ------------------------------------- |
| Storage                   | 30 MB                            | 300 MB                                |
| First import              | 323,000 writes, once             | 3.2 million writes, once              |
| 300 relevant pushes       | 0.4 million reads, 50,000 writes | 4 million reads, 500,000 writes       |
| 20,000 saved translations | 40 million reads, 160,000 writes | 400 million reads, 1.6 million writes |
| Queue messages            | about 1,000                      | about 10,000                          |
| **Extra cost**            | **$0**                           | **$0**                                |

Even at ten times Luft every number stays well inside what the plan includes. Past the included amounts, a million extra rows written costs $1, a million extra rows read $0.001, and a gigabyte stored $0.20 a month.

## Room to grow

Every project keeps its strings in its own SQLite database inside a Durable Object, so nothing is shared between projects and there's nothing to provision as more arrive. Each one holds up to 10 GB, about 750 times Luft. Translation memory for public projects lives in one object per language pair, like English to German, which fits about 20,000 projects of Luft's size per pair.

Translations are stored compactly: the value last read from the repository is only kept when it differs from the translation, and credits are stored once per project and referenced. A translation takes about 90 bytes, against 156 before.
