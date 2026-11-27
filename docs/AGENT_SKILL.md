# BookWiz for your agent

Carry the writing room into the agent you use: turn an idea into an editable brief, build a chapter plan, keep character and world canon, draft in bounded passages, review revisions and export saved pages. The bundle includes original workflows, nine planning templates and an offline project CLI. It works without the BookWiz application checkout or npm packages.

[Skill instructions](../skills/bookwiz/SKILL.md) · [CLI reference](../skills/bookwiz/references/cli.md) · [Compatibility](../skills/bookwiz/references/compatibility.md)

## Install the skill

From the repository, preview the destination first:

```sh
python3 tools/install-agent-skill.py --agent codex --scope project --project /path/to/project --dry-run
python3 tools/install-agent-skill.py --agent codex --scope project --project /path/to/project
```

Choose `claude-code`, `codex`, `opencode`, `hermes`, `antigravity` or `generic`. The generic option needs an explicit `--destination /path/to/skills/bookwiz`. Use `--scope user` for your agent's user skill directory. Installation changes no agent settings, grants no trust and preserves an unrelated or modified existing installation. Reload the host after installation.

Hermes project skills require a separate trust decision: review them and use the host's `hermes skills trust` command if you choose. The installer never makes that decision for you. OpenCode and Hermes use their supported skill interface; this bundle does not invent a native plugin API for them.

## A project with room to write

```sh
python3 skills/bookwiz/scripts/bookwiz.py init ./my-book --title "The Orchard of Names" --author "A Writer"
python3 skills/bookwiz/scripts/bookwiz.py status ./my-book
python3 skills/bookwiz/scripts/bookwiz.py context ./my-book --chapter chapter-001
python3 skills/bookwiz/scripts/bookwiz.py snapshot ./my-book --label "Before revision"
python3 skills/bookwiz/scripts/bookwiz.py export ./my-book --format epub
```

The tool creates empty manuscript files, not invented chapters. Edit the brief, canon and chapter sources, then ask the agent to use BookWiz for the work you want. A context packet is local and bounded; it makes no model request. Snapshots preserve a restorable source copy, and exports include Markdown, text-first EPUB 3 and JSON that the BookWiz app can import as a new book.

The EPUB tool preserves paragraphs, line breaks and headings while escaping raw HTML. It includes navigation, a reading spine, language/direction metadata and a simple vector cover. It does not replace the app's richer cover, proof, PDF, font or native-device features. Open and inspect the actual output before publication.

## Package as a plugin

```sh
python3 tools/package-agent-skill.py --output release/bookwiz-agent-bundle.zip
python3 tools/package-agent-skill.py --output release/bookwiz-agent-bundle.zip --check
```

The reproducible ZIP contains the complete skill, root `install.py`, README, license texts, a per-file hash manifest and plugin manifests for Claude Code, portable Agent Plugins, Codex compatibility and Antigravity. A SHA-256 sidecar checks the archive. An extracted bundle can install itself using `python3 install.py` with the same options as above.

The official release workflow can name the ZIP using the prepared application version. All plugin metadata shares the release version. Explicit `--source-commit` and `--source-fingerprint` options record the verified build's provenance when the packager runs from a later publisher checkout.

For Claude Code, the repository includes a marketplace entry:

```text
/plugin marketplace add muneebwanee/BookWizOfficial
/plugin install bookwiz@bookwiz-official
```

For Codex and Antigravity, use the portable skill installer or the native plugin flow documented in the [compatibility guide](../skills/bookwiz/references/compatibility.md). Including manifests does not automatically list the plugin in a public directory. There are no hooks, MCP servers, API keys, paid calls or automatic publication steps.

## Verification and ownership

The automated suite builds and extracts the standalone bundle, installs into temporary host directories, verifies references and manifest versions, and runs init, validation, context preparation, snapshots and exports from the installed copy. These checks do not run conversations in every agent or certify each host's native plugin UI.

Software and helper scripts use BWNCL 1.0; first-party documentation and templates use CC BY 4.0. Retain the included license notice. The writer's original manuscript and output remain theirs and can be published commercially; software distribution and hosting retain the BookWiz license restrictions.

Created by [muneebwanee](https://github.com/muneebwanee).
