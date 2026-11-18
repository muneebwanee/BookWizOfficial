#!/usr/bin/env python3
"""Add one editable source tree from BookWiz's platform ZIPs, without changing them."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import stat
import tempfile
import zipfile

PLATFORMS = ('android', 'ios', 'watchos', 'tvos', 'windows', 'macos', 'linux', 'web')
RESOLVED = {'README.md', 'package.json', 'SOURCE-MANIFEST.json'}


def read_archive(path: Path, platform: str) -> tuple[dict, dict]:
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 10000 or sum(e.file_size for e in entries) > 256 * 1024 * 1024:
            raise ValueError(f'{path.name}: archive exceeds the source size limit.')
        names = set()
        for entry in entries:
            name, parts = entry.filename, PurePosixPath(entry.filename)
            if name in names or parts.is_absolute() or '..' in parts.parts or '\\' in name or ':' in name or stat.S_ISLNK(entry.external_attr >> 16) or entry.is_dir():
                raise ValueError(f'{path.name}: unsafe or duplicate source path: {name}')
            if parts.parts[0] in {'.git', '.github', 'node_modules'}:
                raise ValueError(f'{path.name}: unexpected source path: {name}')
            names.add(name)
        manifest = json.loads(archive.read('SOURCE-MANIFEST.json'))
        if manifest.get('platform') != platform or not isinstance(manifest.get('files'), dict):
            raise ValueError(f'{path.name}: platform manifest does not match.')
        if names != set(manifest['files']) | {'SOURCE-MANIFEST.json'}:
            raise ValueError(f'{path.name}: archive contents differ from the manifest.')
        files = {}
        for name in names - {'SOURCE-MANIFEST.json'}:
            data = archive.read(name)
            if hashlib.sha256(data).hexdigest() != manifest['files'][name]:
                raise ValueError(f'{path.name}: checksum mismatch: {name}')
            files[name] = data
    return files, manifest


def merged_sources(root: Path) -> tuple[dict, dict, dict]:
    union, origins, packages = {}, {}, {}
    for platform in PLATFORMS:
        path = root / f'source-{platform}.zip'
        files, manifest = read_archive(path, platform)
        package = json.loads(files['package.json'])
        packages[platform] = package
        origins[platform] = {'archive': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'files': len(files), 'version': manifest.get('version')}
        for name, data in files.items():
            if name in RESOLVED:
                continue
            if name in union and union[name] != data:
                raise ValueError(f'The platform archives disagree about shared source: {name}. Resolve this before importing.')
            union.setdefault(name, data)
    reference = dict(packages['android'])
    reference.pop('scripts', None)
    for platform, package in packages.items():
        compare = dict(package)
        compare.pop('scripts', None)
        if compare != reference:
            raise ValueError(f'{platform} has different package metadata or dependencies; resolve the difference before importing.')
    package = dict(packages['android'])
    package['scripts'] = {
        'check': 'node tools/check-source.mjs',
        'test': 'node --test tests/*.test.mjs',
        'compiler': 'node tools/latex-service.mjs',
        'native:prepare': 'node tools/prepare-native.mjs',
        'native:android': 'python3 tools/build-android.py && python3 tools/build-aab.py',
        'native:desktop': 'npm run native:prepare && electron-builder --config native/desktop/electron-builder.yml --publish never',
        'vendor:pdf': 'node tools/sync-pdf-assets.mjs',
        'build': 'python3 tools/build-web.py',
        'package:source': 'python3 tools/package-platform-kits.py --output build/platform-sources',
    }
    union['package.json'] = (json.dumps(package, indent=2) + '\n').encode()
    return union, origins, package


def write_new(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(data)
    temporary.chmod(0o644)
    temporary.replace(path)


def import_sources(root: Path) -> dict:
    root = root.resolve()
    union, origins, package = merged_sources(root)
    # Read and validate every archive before creating or changing any source file.
    created, kept, identical = [], [], []
    for name, data in sorted(union.items()):
        if name == '.gitignore':
            continue
        path = root / name
        if path.is_symlink() or not path.resolve().is_relative_to(root):
            raise ValueError(f'The source destination is not a regular repository path: {name}')
        if path.exists():
            if not path.is_file():
                raise ValueError(f'The source destination is already a directory: {name}')
            (identical if path.read_bytes() == data else kept).append(name)
            continue
        created.append(name)
    for name in created:
        write_new(root / name, union[name])
    ignore = root / '.gitignore'
    text = ignore.read_text() if ignore.exists() else union.get('.gitignore', b'').decode()
    rules = '\n# Keep the public platform source archives tracked.\n!/source-*.zip\n'
    if '!/source-*.zip' not in text:
        write_new(ignore, (text.rstrip() + '\n' + rules).encode())
    origin = {'format': 1, 'application': 'BookWiz', 'layout': 'one shared editable tree', 'archives': origins}
    write_new(root / 'SOURCE-ORIGINS.json', (json.dumps(origin, indent=2) + '\n').encode())
    return {**origin, 'created': created, 'preserved_existing': kept}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    report = import_sources(args.root)
    print(f'Added {len(report["created"])} editable files. All eight source ZIPs and existing repository files were preserved.')


if __name__ == '__main__':
    main()
