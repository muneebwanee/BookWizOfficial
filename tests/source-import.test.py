"""Source import preserves repository files and rejects inconsistent archives."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('source_import', ROOT / 'scripts/import_platform_sources.py')
source = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source)


def make_archive(folder, platform, changes=None, corrupt=False):
    package = {'name': 'bookwiz', 'version': '1.0.0', 'dependencies': {}, 'scripts': {'test': 'platform script'}}
    native = 'apple' if platform in ['ios', 'watchos', 'tvos'] else 'desktop' if platform in ['windows', 'macos', 'linux'] else 'android'
    files = {'README.md': platform.encode(), 'package.json': json.dumps(package).encode(), '.gitignore': b'node_modules/\n*.zip\n', 'dist/app.js': b'export const room = true;'}
    if platform != 'web':
        files[f'native/{native}/host.txt'] = native.encode()
    files.update(changes or {})
    manifest = {'platform': platform, 'version': '1.0.0', 'files': {n: hashlib.sha256(b).hexdigest() for n, b in files.items()}}
    if corrupt:
        files['dist/app.js'] += b'corrupt'
    with zipfile.ZipFile(folder / f'source-{platform}.zip', 'w') as archive:
        for name, data in files.items():
            archive.writestr(name, data)
        archive.writestr('SOURCE-MANIFEST.json', json.dumps(manifest))


class SourceImport(unittest.TestCase):
    def test_all_platforms_share_one_tree_and_archives_stay_unchanged(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for platform in source.PLATFORMS:
                make_archive(root, platform)
            before = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.zip')}
            (root / 'README.md').write_text('my published README and video')
            (root / 'screenshots').mkdir()
            (root / 'screenshots/original.mp4').write_bytes(b'original film')
            source.import_sources(root)
            self.assertTrue(all((root / f'native/{target}/host.txt').is_file() for target in ['android', 'apple', 'desktop']))
            self.assertEqual((root / 'README.md').read_text(), 'my published README and video')
            self.assertEqual((root / 'screenshots/original.mp4').read_bytes(), b'original film')
            self.assertEqual(before, {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.zip')})
            self.assertIn('!/source-*.zip', (root / '.gitignore').read_text())
            package = json.loads((root / 'package.json').read_text())
            self.assertIn('native:android', package['scripts'])
            self.assertIn('native:desktop', package['scripts'])
            self.assertIn('build', package['scripts'])

    def test_repeat_import_preserves_editable_changes_and_origin_record(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for platform in source.PLATFORMS:
                make_archive(root, platform)
            source.import_sources(root)
            origins = (root / 'SOURCE-ORIGINS.json').read_bytes()
            (root / 'dist/app.js').write_text('a contribution')
            report = source.import_sources(root)
            self.assertEqual((root / 'dist/app.js').read_text(), 'a contribution')
            self.assertIn('dist/app.js', report['preserved_existing'])
            self.assertEqual(origins, (root / 'SOURCE-ORIGINS.json').read_bytes())

    def test_unsafe_corrupt_or_disagreeing_sources_fail_before_writing(self):
        for case in ['corrupt', 'traversal', 'conflict', 'wrong-target', 'workflow-path']:
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temp:
                root = Path(temp)
                for platform in source.PLATFORMS:
                    changes = None
                    if platform == 'web':
                        changes = {'../outside.txt': b'bad'} if case == 'traversal' else {'.github/workflows/evil.yml': b'bad'} if case == 'workflow-path' else {'dist/app.js': b'different'} if case == 'conflict' else None
                    make_archive(root, platform, changes, corrupt=case == 'corrupt' and platform == 'web')
                if case == 'wrong-target':
                    (root / 'source-web.zip').write_bytes((root / 'source-android.zip').read_bytes())
                with self.assertRaises(ValueError):
                    source.import_sources(root)
                self.assertFalse((root / 'dist').exists())
                self.assertFalse((root.parent / 'outside.txt').exists())


if __name__ == '__main__':
    unittest.main()
