# Agent compatibility and installation

The portable interface is a folder named `bookwiz` containing `SKILL.md`, references, templates, scripts and licenses. The Python tool runs independently of the agent. Plugin discovery and skill reload behavior depend on the installed host version.

## Install only the skill

From the repository:

```sh
python3 tools/install-agent-skill.py --agent codex --scope project --project /path/to/project --dry-run
python3 tools/install-agent-skill.py --agent codex --scope project --project /path/to/project
```

From the extracted standalone bundle, use `python3 install.py` with the same options. From a copied skill folder, use `python3 scripts/install_skill.py`. Installation copies only this skill and never changes agent configuration, enables plugins, grants project trust or replaces an unrelated existing folder. An identical managed installation is unchanged; modified or foreign installations are preserved.

| Host | `--agent` | Project destination | User destination |
| :--- | :--- | :--- | :--- |
| Claude Code | `claude-code` | `.claude/skills/bookwiz` | `~/.claude/skills/bookwiz` |
| OpenAI Codex CLI | `codex` | `.agents/skills/bookwiz` | `~/.agents/skills/bookwiz` |
| OpenCode | `opencode` | `.opencode/skills/bookwiz` | `~/.config/opencode/skills/bookwiz` |
| Hermes Agent | `hermes` | `.hermes/skills/bookwiz` | `~/.hermes/skills/bookwiz` |
| Google Antigravity | `antigravity` | `.agents/skills/bookwiz` | `~/.gemini/config/skills/bookwiz` |
| Other Agent Skills hosts | `generic` | Use `--destination /path/to/skills/bookwiz` | Use the host's documented path |

Choose `--scope user` for the user destination. `--home` supplies an alternate home root for portable environments or testing. On Windows, the home directory comes from Python's `Path.home()`; use `python` or `py -3` if `python3` is unavailable. The installer accepts an explicit `--destination` for hosts whose configuration uses another supported path.

Hermes requires project skills to be trusted before loading them. Review the installed files and, if you choose, run `hermes skills trust` in that project. The installer does not grant trust. Start a fresh agent session or use its reload command, then ask it to use the BookWiz skill. Codex commonly accepts `$bookwiz`; other hosts also discover it from its description.

## Native plugin layouts

The repository and standalone ZIP contain:

- Root `plugin.json` in Agent Plugins 1.0 format, with conventional `skills/bookwiz` discovery.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for a Claude Code marketplace/plugin.
- `.codex-plugin/plugin.json` as the Codex compatibility overlay.
- `.antigravity-plugin/plugin.json` for Antigravity's manifest format.

There are no lifecycle hooks, MCP servers, credentials or external-service requirements. The optional plugin layer packages the same skill; it does not add capabilities the host lacks. OpenCode and Hermes use the portable skill path rather than a fabricated native plugin API.

For Claude Code, after reviewing the repository:

```text
/plugin marketplace add muneebwanee/BookWizOfficial
/plugin install bookwiz@bookwiz-official
```

For Antigravity, validate the extracted plugin directory using `agy plugin validate` according to the installed CLI's help, then install it using that host's documented plugin flow. For Codex, add the plugin to a supported local/repository marketplace or use the simpler skill installer above. Marketplace publication and directory approval are separate actions; including manifests does not mean this bundle is listed in a public directory.

## Scope of verification

Automated checks validate manifests and references, build/extract the bundle, install it into temporary destinations, and exercise actual init, context, snapshots and exports from an installed copy. They do not run conversations in every named agent or certify host-specific plugin UI. Verify native loading in the host versions you intend to support.

Official references checked for this layout:

- [Agent Skills specification](https://agentskills.io/specification)
- [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference)
- [Codex skills](https://developers.openai.com/codex/skills)
- [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)
- [OpenCode skills](https://opencode.ai/docs/skills/)
- [Hermes skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/)
- [Antigravity skills](https://antigravity.google/docs/skills)
- [Antigravity plugins](https://antigravity.google/docs/build-plugins/)
