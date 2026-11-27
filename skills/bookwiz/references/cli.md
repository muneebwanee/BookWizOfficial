# Offline project CLI

Requires Python 3.10 or newer and only its standard library. The tool sends no requests, loads no API keys and needs no BookWiz application checkout. Run it by its absolute installed path.

```sh
python3 /path/to/bookwiz/scripts/bookwiz.py --help
python3 /path/to/bookwiz/scripts/bookwiz.py init ./my-book --title "The Orchard of Names" --author "A Writer" --chapters 3 --target 50000
python3 /path/to/bookwiz/scripts/bookwiz.py add-chapter ./my-book --title "The gate opens" --summary "Mara accepts the letter."
python3 /path/to/bookwiz/scripts/bookwiz.py validate ./my-book
python3 /path/to/bookwiz/scripts/bookwiz.py context ./my-book --chapter chapter-001 --max-chars 16000
python3 /path/to/bookwiz/scripts/bookwiz.py snapshot ./my-book --label "Before the gate revision"
python3 /path/to/bookwiz/scripts/bookwiz.py export ./my-book --format markdown
python3 /path/to/bookwiz/scripts/bookwiz.py export ./my-book --format epub
python3 /path/to/bookwiz/scripts/bookwiz.py export ./my-book --format backup
```

## Editable project layout

`bookwiz.json` has `format: "bookwiz-agent-project"`, `version: 1`, a `book` object, a `chapters` array, `canon` and `publication`. JSON must remain valid JSON: write notes in Markdown files, not comments inside JSON.

| Field | Required values |
| :--- | :--- |
| `book` | `id`, `title`, `author`, `genre`, `language`, `premise`, `voice` as text; `direction` as `ltr` or `rtl`; positive integer `wordTarget` up to 2,000,000 |
| `chapters[]` | Unique `id` and `file`, text `title` and `summary`, `status` as `planned`, `drafting`, `revising` or `ready` |
| Chapter files | Relative `.md` files under `chapters/`, no traversal or symlinks; at most 4 MiB each |
| `canon` | `characters` and `worlds`: arrays of objects with text `name` and optional `detail`; `facts` and `timeline`: arrays of strings |
| `publication` | Optional text `subtitle`, `imprint`, `dedication`, `preface`, `rights` |

Initialization fills these fields and creates empty chapters. Edit titles, summaries and canonical facts in JSON, and write prose in the corresponding Markdown files. Keep sources in UTF-8. `status` counts saved text, not model tokens or deleted words. It reports absent prose as a warning, not a fabricated chapter.

`context` includes the chosen book fields, accepted canon, the selected chapter, its preceding summary and up to the last 6,000 characters of current prose. The packet must fit the chosen 1,000–100,000-character budget. If it does not, the tool stops and asks for a smaller packet; it never silently drops canon or sends it elsewhere.

`snapshot` retains known project sources under `versions/`; previous snapshots are not pruned. Reader exports default to `exports/<title>.<extension>`. `--output` can name another export location; an output inside the project must remain under `exports/`. `--force` applies only to the selected export and is never needed for a fresh path.

The CLI does not generate model text. The agent provides drafting and editorial work through its host, under the writer's sharing choices. It does not automatically install image tools, enable plugins, grant trust, publish a book or schedule jobs.
