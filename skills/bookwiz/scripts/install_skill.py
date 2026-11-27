#!/usr/bin/env python3
"""Install the portable BookWiz skill without changing agent settings. BWNCL 1.0."""
from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from pathlib import Path

AGENTS = {
    'claude-code': ('.claude/skills/bookwiz', '.claude/skills/bookwiz'),
    'codex': ('.agents/skills/bookwiz', '.agents/skills/bookwiz'),
    'opencode': ('.opencode/skills/bookwiz', '.config/opencode/skills/bookwiz'),
    'hermes': ('.hermes/skills/bookwiz', '.hermes/skills/bookwiz'),
    'antigravity': ('.agents/skills/bookwiz', '.gemini/config/skills/bookwiz'),
}
RECEIPT = 'BOOKWIZ-INSTALL.json'


def find_source(explicit=None):
    if explicit:
        candidates = [Path(explicit)]
    else:
        location = Path(__file__).resolve()
        candidates = [location.parent.parent, location.parent / 'skills/bookwiz', location.parent.parent / 'skills/bookwiz']
    for candidate in candidates:
        if (candidate / 'SKILL.md').is_file() and (candidate / 'scripts/bookwiz.py').is_file():
            return candidate.resolve()
    raise ValueError('Cannot find the self-contained skill. Use --source with the folder containing SKILL.md.')


def files(source):
    result = {}
    for path in sorted(source.rglob('*')):
        if path.is_symlink():
            raise ValueError('Skill source must not contain symbolic links: ' + str(path))
        name = path.relative_to(source).as_posix()
        if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc' and path.name != RECEIPT:
            result[name] = path.read_bytes()
    for name in ['SKILL.md', 'scripts/bookwiz.py', 'scripts/install_skill.py', 'references/workflow.md', 'templates/planning--brief.md', 'LICENSE', 'licenses/BWNCL-1.0.txt', 'licenses/CC-BY-4.0.txt']:
        if name not in result:
            raise ValueError('Incomplete skill; missing ' + name)
    return result


def install(args):
    source = find_source(args.source)
    home = Path(args.home).expanduser().absolute() if args.home else Path.home()
    work = Path(args.project).expanduser().absolute() if args.project else Path.cwd()
    if args.destination:
        destination = Path(args.destination).expanduser().absolute()
    elif args.agent == 'generic':
        raise ValueError('A generic agent needs --destination with its skill directory, ending in bookwiz.')
    else:
        relative = AGENTS[args.agent][args.scope == 'user']
        destination = (home if args.scope == 'user' else work) / relative
    if destination.name != 'bookwiz':
        raise ValueError('The destination directory must be named bookwiz.')
    if destination.is_symlink():
        raise ValueError('An existing destination link is preserved; choose another destination.')
    if destination.resolve().is_relative_to(source) or source.is_relative_to(destination.resolve()):
        raise ValueError('Source and destination must be separate directories.')
    payload = files(source)
    hashes = {name: hashlib.sha256(data).hexdigest() for name, data in payload.items()}
    result = {'agent': args.agent, 'scope': args.scope, 'destination': str(destination), 'files': len(payload), 'dryRun': args.dry_run, 'status': 'would-install' if args.dry_run else 'installed'}
    if args.agent == 'hermes' and args.scope == 'project':
        result['nextStep'] = 'Review the project skill, then run hermes skills trust in the project if you choose to trust it. The installer never grants trust.'
    else:
        result['nextStep'] = 'Start a new agent session or use that agent’s skill reload command.'
    if destination.exists():
        if not destination.is_dir() or not (destination / RECEIPT).is_file():
            raise ValueError('Existing files are preserved. Back up and remove the old skill yourself before installing a replacement.')
        if any(not (destination / n).is_file() or (destination / n).is_symlink() or hashlib.sha256((destination / n).read_bytes()).hexdigest() != sha for n, sha in hashes.items()):
            raise ValueError('The installed skill differs. Existing work is preserved; back up and remove it before installing this version.')
        result['status'] = 'unchanged'
        return result
    if args.dry_run:
        return result
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent, prefix='.bookwiz-install-') as temp:
        staged = Path(temp) / 'bookwiz'; staged.mkdir()
        for name, data in payload.items():
            path = staged / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(data); path.chmod(0o644)
        (staged / RECEIPT).write_text(json.dumps({'format': 1, 'source': 'https://github.com/muneebwanee/BookWizOfficial', 'files': hashes}, indent=2) + '\n')
        if destination.exists():
            raise ValueError('Destination appeared during installation; existing work was preserved.')
        staged.rename(destination)
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--agent', choices=[*AGENTS, 'generic'], required=True)
    parser.add_argument('--scope', choices=['project', 'user'], default='project')
    parser.add_argument('--project', help='Project root; defaults to the current directory.')
    parser.add_argument('--home', help='Alternate user-home root for a portable environment or a dry run.')
    parser.add_argument('--destination', help='Explicit target directory ending in bookwiz.')
    parser.add_argument('--source', help='Skill directory containing SKILL.md.')
    parser.add_argument('--dry-run', action='store_true', help='Show the destination without creating files.')
    args = parser.parse_args(argv)
    try:
        print(json.dumps(install(args), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError) as error:
        parser.exit(1, 'BookWiz installer: ' + str(error) + '\n')


if __name__ == '__main__':
    raise SystemExit(main())
