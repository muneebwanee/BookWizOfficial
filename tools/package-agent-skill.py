#!/usr/bin/env python3
"""Create a deterministic, self-contained BookWiz agent/plugin ZIP. BWNCL 1.0."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
MANIFESTS = ['plugin.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.codex-plugin/plugin.json', '.antigravity-plugin/plugin.json']


def bundle_files(root=ROOT, source_commit=None, source_fingerprint=None):
    root = Path(root).resolve(); payload = {}
    folder = root / 'skills/bookwiz'
    for path in sorted(folder.rglob('*')):
        if path.is_symlink(): raise ValueError('Bundle sources cannot be symbolic links.')
        if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc' and path.name != 'BOOKWIZ-INSTALL.json':
            payload[path.relative_to(root).as_posix()] = path.read_bytes()
    for name in MANIFESTS:
        payload[name] = (root / name).read_bytes()
        json.loads(payload[name])
    for name in ['SKILL.md', 'scripts/bookwiz.py', 'scripts/install_skill.py', 'references/workflow.md', 'references/compatibility.md', 'templates/planning--brief.md', 'LICENSE', 'licenses/BWNCL-1.0.txt', 'licenses/CC-BY-4.0.txt']:
        if 'skills/bookwiz/' + name not in payload: raise ValueError('Missing bundle input: ' + name)
    payload['install.py'] = (folder / 'scripts/install_skill.py').read_bytes()
    payload['LICENSE'] = (folder / 'LICENSE').read_bytes()
    for name in ['BWNCL-1.0.txt', 'CC-BY-4.0.txt']:
        payload['licenses/' + name] = (folder / 'licenses' / name).read_bytes()
    readme = (folder / 'BUNDLE-README.md').read_text().replace('(references/', '(skills/bookwiz/references/').replace('(SKILL.md)', '(skills/bookwiz/SKILL.md)')
    payload['README.md'] = readme.encode()
    version = json.loads(payload['plugin.json'])['version']
    if (root / 'package.json').is_file() and json.loads((root / 'package.json').read_text())['version'] != version:
        raise ValueError('Agent bundle version differs from the application. Prepare the shared release version first.')
    for name in MANIFESTS:
        value = json.loads(payload[name])
        declared = next(p['version'] for p in value['plugins'] if p['name'] == 'bookwiz') if name.endswith('marketplace.json') else value['version']
        if declared != version: raise ValueError('Plugin version differs: ' + name)
    try:
        base_commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
        modified = bool(subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=normal'], cwd=root, stderr=subprocess.DEVNULL).strip())
    except (OSError, subprocess.CalledProcessError): base_commit = None; modified = False
    commit = source_commit or (base_commit if not modified else None)
    if commit is not None and not re.fullmatch(r'[0-9a-f]{40}', commit): raise ValueError('Source commit must be a complete lowercase Git SHA.')
    if source_fingerprint is None and not modified and (root / 'release-state.json').is_file(): source_fingerprint = json.loads((root / 'release-state.json').read_text()).get('fingerprint')
    if source_fingerprint is not None and not re.fullmatch(r'[0-9a-f]{64}', source_fingerprint): raise ValueError('Source fingerprint must be a SHA-256 digest.')
    manifest = {'format': 1, 'name': 'bookwiz', 'bundleVersion': version, 'sourceCommit': commit, 'baseCommit': base_commit, 'workingTreeModified': modified, 'sourceFingerprint': source_fingerprint, 'source': 'https://github.com/muneebwanee/BookWizOfficial', 'codeLicense': 'BWNCL-1.0', 'contentLicense': 'CC-BY-4.0', 'files': {n: hashlib.sha256(d).hexdigest() for n, d in sorted(payload.items())}}
    payload['MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    return payload


def package(output, root=ROOT, check=False, source_commit=None, source_fingerprint=None):
    payload = bundle_files(root, source_commit, source_fingerprint); output = Path(output)
    if check:
        with zipfile.ZipFile(output) as archive:
            if len(archive.namelist()) != len(payload) or set(archive.namelist()) != set(payload) or archive.testzip(): raise ValueError('Bundle ZIP entries differ from source.')
            for name, data in payload.items():
                if archive.read(name) != data: raise ValueError('Stale bundle entry: ' + name)
        expected = hashlib.sha256(output.read_bytes()).hexdigest() + '  ' + output.name + '\n'
        if output.with_suffix(output.suffix + '.sha256').read_text() != expected: raise ValueError('Bundle checksum is stale.')
        return {'output': str(output), 'files': len(payload), 'status': 'current'}
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(payload.items()):
            entry = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0)); entry.compress_type = zipfile.ZIP_DEFLATED; entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compresslevel=9)
    output.chmod(0o644)
    if zipfile.ZipFile(output).testzip(): raise ValueError('The completed bundle failed its CRC check.')
    sha = hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix(output.suffix + '.sha256').write_text(sha + '  ' + output.name + '\n')
    return {'output': str(output), 'files': len(payload), 'bytes': output.stat().st_size, 'sha256': sha}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--output', type=Path, default=ROOT / 'release/bookwiz-agent-bundle.zip'); p.add_argument('--root', type=Path, default=ROOT); p.add_argument('--check', action='store_true'); p.add_argument('--source-commit'); p.add_argument('--source-fingerprint'); args = p.parse_args()
    try: print(json.dumps(package(args.output, args.root, args.check, args.source_commit, args.source_fingerprint), indent=2))
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as error: p.exit(1, str(error) + '\n')
