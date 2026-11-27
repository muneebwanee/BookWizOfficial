# From saved pages to a reader file

Run `validate` or `status` before export. Report the actual word count, empty chapters, absent author/premise fields and any unsupported front matter. A planned chapter is not a written chapter. Exporting unfinished work is the writer's choice; the agent should describe the file honestly.

## Opening pages and metadata

Check the title and subtitle, author spelling, language and reading direction, imprint if supplied, dedication, preface, rights statement and chapter order. Do not invent an ISBN, publisher, review quotation, copyright holder or permissions grant. The template in `publication/checklist.md` records unresolved items.

## Included formats

- **Markdown:** a portable reading/editing copy with supplied front matter and saved chapters.
- **EPUB 3:** a ZIP with the required mimetype entry, navigation, reading spine, language/direction metadata, a simple vector cover and escaped XHTML. It uses a text-first Markdown subset: headings and paragraph/line breaks are preserved, while raw HTML remains text. This is not the BookWiz app's richer layout or cover engine.
- **BookWiz backup JSON:** saved book metadata, chapters and canon suitable for the app's import-preview flow. It contains no model connections or API keys. Import adds a copy; review it in the app before continuing.
- **Snapshot ZIP:** editable project metadata, chapters and planning notes with per-file hashes. Restore into a separate empty directory, verify `SNAPSHOT.json`, then run `validate`. Do not extract it over the only manuscript copy.

Exports go to `exports/` by default. Existing output files are preserved unless the user explicitly selects `--force`; manuscript sources remain protected. A reader export is not the only copy of the work: retain project files and an independent backup.

## Human checks

Open the actual EPUB in at least one reader. Confirm navigation, paragraph order, script rendering, direction and the first and last lines of each chapter. A valid XML structure is useful evidence, not a certification of typography, accessibility, originality, factual accuracy or rights clearance.

For commercial printing, choose the printer and its actual trim, bleed, margins, cover dimensions and PDF requirements. The standalone skill does not include a PDF/TeX engine, font library or native printing bridge. Use the BookWiz application's proof/print/LaTeX tools when available, or another explicitly chosen production workflow. Never claim a platform/store upload or publication occurred when only local files were made.

The writer's original output is excluded from the BookWiz software license and can be published commercially. The software and helper scripts themselves remain subject to BWNCL 1.0. Model and third-party asset terms remain separate.
