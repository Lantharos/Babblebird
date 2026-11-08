# Scale and cost

Babblebird is built to stay cheap at hundreds of thousands of strings per project. The numbers below come from loading Luft's real repository into a local D1 through the same code that runs in production, with `tools/local-github` standing in for GitHub.

## Luft

|                       |                               |
| --------------------- | ----------------------------- |
| English messages      | 5,140 in 49 files, 34 areas   |
| Languages             | 36 besides English            |
| Translations stored   | 125,627 (of 185,040 possible) |
| Glossary terms        | 4,464 across 36 TBX files     |
| Strings database size | 15 MB                         |

### A first import

|              |                                    |
| ------------ | ---------------------------------- |
| Files read   | 1,665, fetched a hundred at a time |
| Queue jobs   | 35, one per area                   |
| Rows read    | 1.55 million                       |
| Rows written | 341,000                            |

The largest job, Settings with 7 files in 37 languages, takes a few seconds of CPU; most of its wall time is reading `git blame` for the credits.

### Pushes

The last 30 commits on Luft's main branch, replayed one by one:

- 11 didn't touch translations and cost nothing beyond the webhook.
- The other 19 each read the tree once and compared blob hashes: about 1,900 rows read and 2 written.
- Each changed area then read between 1,000 and 130,000 rows (recounting a big area after an English change) and wrote between 10 and 810.
- All 19 together: 0.8 million rows read, 8,640 written.

### The editor

Measured against the local database, warm:

| Request                                                                              | Time        |
| ------------------------------------------------------------------------------------ | ----------- |
| A page of 50 strings with their translations                                         | 9 to 12 ms  |
| One string with glossary, earlier translations, suggestions, screenshots and history | 11 to 15 ms |
| Areas with progress for a language                                                   | 6 ms        |
| What's missing, every language and area                                              | 11 ms       |

Saving a translation writes about eight rows: the translation, its activity entry and its index, the pending file, and the area's progress.

## Cost per month

On the Workers Paid plan ($5 a month, shared with every other Worker on the account), D1 includes 25 billion rows read, 50 million rows written and 5 GB of storage; Queues include a million operations; R2 includes 10 GB.

|                           | Luft                             | Ten times Luft                        |
| ------------------------- | -------------------------------- | ------------------------------------- |
| Storage                   | 15 MB                            | 150 MB                                |
| First import              | 341,000 writes, once             | 3.4 million writes, once              |
| 300 relevant pushes       | 0.4 million reads, 50,000 writes | 4 million reads, 500,000 writes       |
| 20,000 saved translations | 40 million reads, 160,000 writes | 400 million reads, 1.6 million writes |
| Queue messages            | about 1,000                      | about 10,000                          |
| **Extra cost**            | **$0**                           | **$0**                                |

Even at ten times Luft every number stays well inside what the plan includes. Past the included amounts, a million extra rows written costs $1 and a million extra rows read $0.001.

One strings database holds about 10 GB, which is roughly 300 projects of Luft's size. New projects can be put in another strings database by adding a `STRINGS_<n>` binding and setting their `shard`.
