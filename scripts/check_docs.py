#!/usr/bin/env python3
"""Check local file references in BookWiz Markdown without contacting a server."""
from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
IGNORED = {'.git', 'node_modules', 'build', 'release', '.build-tools', '__pycache__'}


class HTMLReferences(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.references = []

    def handle_starttag(self, tag, attributes):
        for name, value in attributes:
            if name in {'href', 'src'} and value:
                self.references.append(value)


def references(text: str) -> list[str]:
    # Ignore examples in fenced and inline code, then read Markdown links,
    # reference definitions, and the HTML image strips used in the gallery.
    text = re.sub(r'(?ms)^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$', '', text)
    text = re.sub(r'(`+)(?!`)(.*?)\1', '', text, flags=re.S)
    found = []
    for match in re.finditer(r'!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["\'][^\n]*?["\'])?\s*\)', text):
        found.append(match.group(1) or match.group(2))
    for match in re.finditer(r'^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))', text, re.M):
        found.append(match.group(1) or match.group(2))
    parser = HTMLReferences()
    parser.feed(text)
    return found + parser.references


def markdown_files(root: Path):
    try:
        result = subprocess.run(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root, check=True, capture_output=True)
        names = sorted(set(result.stdout.decode().split('\0')))
        return [root / name for name in names if name.endswith('.md') and (root / name).is_file() and not IGNORED.intersection(Path(name).parts)]
    except (OSError, subprocess.CalledProcessError):
        return [p for p in sorted(root.rglob('*.md')) if not IGNORED.intersection(p.relative_to(root).parts) and p.is_file()]


def check(root: Path) -> dict:
    root = root.resolve()
    files, checked, missing = markdown_files(root), 0, []
    for document in files:
        for reference in references(document.read_text(encoding='utf-8-sig')):
            parsed = urlsplit(reference)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            checked += 1
            local = unquote(parsed.path)
            destination = (root / local.lstrip('/') if local.startswith('/') else document.parent / local).resolve()
            if not destination.is_relative_to(root) or not destination.is_file():
                missing.append({'document': document.relative_to(root).as_posix(), 'reference': reference})
    return {'markdownFiles': len(files), 'localReferences': checked, 'missing': missing}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args(argv)
    result = check(args.root)
    if result['missing']:
        for entry in result['missing']:
            print(f"Missing documentation target: {entry['document']} -> {entry['reference']}", file=sys.stderr)
        return 1
    print(f"Checked {result['markdownFiles']} Markdown files and {result['localReferences']} local file references.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
