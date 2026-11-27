# BookWiz agent bundle

A writing room an agent can carry with it: an original book-development workflow, editable brief and canon templates, bounded context preparation, local snapshots and reader exports. The skill works without the BookWiz application checkout or npm dependencies.

## Install

Extract this complete ZIP, then run:

```sh
python3 install.py --agent codex --scope project --project /path/to/project --dry-run
python3 install.py --agent codex --scope project --project /path/to/project
```

Replace `codex` with `claude-code`, `opencode`, `hermes`, `antigravity` or `generic` as needed. Generic hosts need `--destination /path/to/skills/bookwiz`. Restart or reload the host after installation. The installer preserves existing work and changes no agent settings.

[Compatibility and plugin paths](references/compatibility.md) · [Skill](SKILL.md) · [CLI](references/cli.md)

## Try it

```sh
python3 skills/bookwiz/scripts/bookwiz.py init ./my-book --title "The Orchard of Names" --author "A Writer"
python3 skills/bookwiz/scripts/bookwiz.py status ./my-book
```

Ask the agent to use BookWiz to shape the supplied idea, write a scene or review a chapter. The tool creates empty project files; drafting remains the agent's work under your direction. Before a revision, take a snapshot. Markdown, EPUB and BookWiz-backup JSON exports use the prose actually saved.

The manifests support native plugin discovery where the host implements those formats. They install no hooks, MCP servers or model credentials, and do not publish your work. Public marketplace listing is not automatic.

## License

Copyright © 2026 muneebwanee. Software is BWNCL 1.0; first-party documentation and templates are CC BY 4.0. Retain [LICENSE](LICENSE). Your own manuscript and original output remain yours and can be published commercially. Software distribution and commercial hosting remain governed by the included BookWiz license.
