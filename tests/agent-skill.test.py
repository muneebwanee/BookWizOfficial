"""Exercise the portable writing project, agent installer and official bundle. BWNCL 1.0."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/bookwiz'
CLI = SKILL / 'scripts/bookwiz.py'
INSTALL = SKILL / 'scripts/install_skill.py'
spec = importlib.util.spec_from_file_location('bookwiz_agent_package', ROOT / 'tools/package-agent-skill.py')
package = importlib.util.module_from_spec(spec); spec.loader.exec_module(package)


class AgentSkill(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='bookwiz-agent-')
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.project = self.base / 'manuscript'

    def run_cli(self, *args, script=CLI, ok=True):
        result = subprocess.run([sys.executable, str(script), *map(str, args)], capture_output=True, text=True)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        return result

    def create(self, **options):
        arguments = []
        for key, value in options.items(): arguments.extend(['--' + key.replace('_', '-'), str(value)])
        return self.run_cli('init', self.project, '--title', 'The Orchard & the Sea', '--author', 'A Writer', *arguments)

    def metadata(self): return json.loads((self.project / 'bookwiz.json').read_text())

    def save_metadata(self, value): (self.project / 'bookwiz.json').write_text(json.dumps(value, ensure_ascii=False))

    def test_empty_foundation_has_templates_and_counts_saved_prose_without_replacing_work(self):
        result = self.create(); self.assertEqual(result['chapters'], 3)
        self.assertEqual(len(list(self.project.glob('chapters/*.md'))), 3)
        self.assertEqual(len(list(self.project.glob('planning/*.md'))), 3)
        self.assertTrue((self.project / 'canon/evidence.md').is_file())
        self.assertTrue((self.project / 'publication/checklist.md').is_file())
        first = self.project / self.metadata()['chapters'][0]['file']; self.assertEqual(first.read_text(), '')
        first.write_text('The sea kept its promise.\n\nMara opened the letter.')
        status = self.run_cli('status', self.project); self.assertEqual(status['words'], 9)
        self.assertEqual(len(status['chapters']), 3); self.assertTrue(any('2 chapter(s)' in w for w in status['warnings']))
        self.run_cli('init', self.project, '--title', 'An unwanted replacement', ok=False)
        self.assertIn('Mara opened', first.read_text())
        added = self.run_cli('add-chapter', self.project, '--title', 'The gate', '--summary', 'Mara accepts the cost.')
        self.assertEqual(added['chapter']['id'], 'chapter-004'); self.assertEqual(first.read_text().splitlines()[0], 'The sea kept its promise.')

    def test_context_uses_canon_and_previous_summary_and_refuses_an_exceeded_budget(self):
        self.create(); data = self.metadata(); data['book']['premise'] = 'A gardener finds names on the trees.'
        data['chapters'][0]['summary'] = 'Mara receives a letter.'
        data['canon']['facts'] = ['The orchard gate opens at dusk.']; self.save_metadata(data)
        (self.project / data['chapters'][1]['file']).write_text('She waited by the locked gate.')
        packet = self.run_cli('context', self.project, '--chapter', 'chapter-002')
        self.assertFalse(packet['sentToModel']); self.assertTrue(packet['containsManuscript'])
        self.assertEqual(packet['context']['previousChapterSummary'], 'Mara receives a letter.')
        self.assertEqual(packet['context']['canon']['facts'], data['canon']['facts'])
        data['canon']['facts'] = ['A very long accepted fact. ' * 500]; self.save_metadata(data)
        self.assertIn('exceeds', self.run_cli('context', self.project, '--chapter', 'chapter-002', '--max-chars', '1000', ok=False).stderr)

    def test_project_validation_rejects_unsafe_duplicate_and_missing_chapter_sources(self):
        self.create(); original = self.metadata()
        for path in ['../outside.md', 'chapters/../../outside.md', 'chapters\\outside.md', '/tmp/outside.md']:
            with self.subTest(path=path):
                value = json.loads(json.dumps(original)); value['chapters'][0]['file'] = path; self.save_metadata(value)
                self.run_cli('validate', self.project, ok=False)
        duplicate = json.loads(json.dumps(original)); duplicate['chapters'][1]['id'] = duplicate['chapters'][0]['id']; self.save_metadata(duplicate)
        self.run_cli('validate', self.project, ok=False)
        self.save_metadata(original); (self.project / original['chapters'][0]['file']).unlink()
        self.run_cli('validate', self.project, ok=False)

    def test_reader_exports_preserve_unicode_and_source_and_refuse_silent_overwrites(self):
        self.create(chapters=1); data = self.metadata(); text = 'مرحبا بالعالم.\n\nA <script>alert("draft")</script> stays text & nothing executes.'
        source = self.project / data['chapters'][0]['file']; source.write_text(text)
        markdown = self.run_cli('export', self.project, '--format', 'markdown'); saved = Path(markdown['output']).read_text()
        self.assertIn(text, saved); self.assertIn('# The Orchard & the Sea', saved)
        self.run_cli('export', self.project, '--format', 'markdown', ok=False)
        self.run_cli('export', self.project, '--format', 'markdown', '--force')
        self.run_cli('export', self.project, '--format', 'markdown', '--output', source, '--force', ok=False)
        backup = self.run_cli('export', self.project, '--format', 'backup'); value = json.loads(Path(backup['output']).read_text())
        self.assertEqual(value['version'], 1); self.assertEqual(len(value['projects']), 1)
        body = value['projects'][0]['chapters'][0]['text']; self.assertIn('مرحبا', body); self.assertIn('&lt;script&gt;', body); self.assertNotIn('<script>', body)
        self.assertNotIn('connections', value); self.assertEqual(source.read_text(), text)

    def test_epub_has_xml_navigation_spine_cover_and_real_multilingual_pages(self):
        self.create(chapters=2, language='Arabic'); data = self.metadata(); data['publication']['preface'] = 'An introduction & a promise.'; self.save_metadata(data)
        passage = 'مرحبا بالعالم.\n\nEvery saved line belongs to the reader.'
        for c in data['chapters']: (self.project / c['file']).write_text(passage)
        result = self.run_cli('export', self.project, '--format', 'epub')
        with zipfile.ZipFile(result['output']) as archive:
            info = archive.infolist()[0]; self.assertEqual(info.filename, 'mimetype'); self.assertEqual(info.compress_type, zipfile.ZIP_STORED)
            self.assertEqual(archive.read('mimetype'), b'application/epub+zip')
            for name in archive.namelist():
                if name.endswith(('.xml', '.xhtml', '.opf', '.svg')): ET.fromstring(archive.read(name))
            opf = ET.fromstring(archive.read('OEBPS/package.opf')); ns = {'o': 'http://www.idpf.org/2007/opf'}
            self.assertEqual(opf.find('o:spine', ns).get('page-progression-direction'), 'rtl')
            self.assertEqual(len(opf.findall('o:spine/o:itemref', ns)), 6)
            self.assertIn('chapter-2.xhtml', archive.read('OEBPS/nav.xhtml').decode())
            self.assertIn('مرحبا', archive.read('OEBPS/chapter-1.xhtml').decode()); self.assertIn('Every saved line', archive.read('OEBPS/chapter-2.xhtml').decode())

    def test_default_exports_cannot_follow_a_directory_link_into_manuscript_sources(self):
        self.run_cli('init', self.project, '--title', '001 Chapter', '--chapters', 1)
        data = self.metadata(); source = self.project / data['chapters'][0]['file']; original = 'Original saved manuscript.\n'; source.write_text(original)
        try:
            (self.project / 'exports').symlink_to(self.project / 'chapters', target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest('This host does not permit directory symbolic links.')
        result = self.run_cli('export', self.project, '--format', 'markdown', '--force', ok=False)
        self.assertIn('symbolic link', result.stderr); self.assertEqual(source.read_text(), original)
        (self.project / 'exports').unlink()
        output = self.run_cli('export', self.project, '--format', 'markdown')
        self.assertTrue(Path(output['output']).is_file()); self.assertEqual(source.read_text(), original)

    def test_backup_import_retains_language_direction_and_script_fonts_in_the_real_app(self):
        cases = [('Arabic', 'ar', 'rtl', 'مرحبا بالعالم', 'BookArabic'), ('ur', 'ur', 'rtl', 'یہ ایک کہانی ہے', 'BookArabic'), ('Hebrew', 'he', 'rtl', 'שלום עולם', ''), ('Bengali', 'bn', 'ltr', 'একটি গল্প', 'BookBengali'), ('Hindi', 'hi', 'ltr', 'एक कहानी', 'BookDevanagari'), ('Turkish', 'tr', 'ltr', 'Bir öykü', ''), ('Persian', 'fa', 'rtl', 'یک داستان', '')]
        node = shutil.which('node')
        code = ("import {readFileSync} from 'node:fs';import {validateBackup} from " + json.dumps((ROOT / 'dist/core.js').as_uri()) + ";import {localeOf,bookCSS} from " + json.dumps((ROOT / 'dist/book.js').as_uri()) + ";const p=validateBackup(JSON.parse(readFileSync(process.argv[1],'utf8'))).projects[0],l=localeOf(p);console.log(JSON.stringify({code:l.code,dir:l.dir,css:bookCSS(p)}));")
        for language, expected_code, direction, passage, font in cases:
            with self.subTest(language=language):
                self.project = self.base / expected_code
                self.create(chapters=1, language=language)
                data = self.metadata(); (self.project / data['chapters'][0]['file']).write_text(passage)
                result = self.run_cli('export', self.project, '--format', 'backup'); output = Path(result['output']); book = json.loads(output.read_text())['projects'][0]
                self.assertEqual(book['languageCode'], expected_code); self.assertEqual(book['direction'], direction); self.assertIn(passage, book['chapters'][0]['text'])
                if node:
                    actual = subprocess.run([node, '--input-type=module', '-e', code, str(output)], capture_output=True, text=True)
                    self.assertEqual(actual.returncode, 0, actual.stderr); locale = json.loads(actual.stdout)
                    self.assertEqual(locale['code'], expected_code); self.assertEqual(locale['dir'], direction)
                    if font: self.assertIn(font, locale['css'])
        self.project = self.base / 'explicit-direction'; self.create(chapters=1, language='Arabic', direction='ltr')
        result = self.run_cli('export', self.project, '--format', 'backup'); self.assertEqual(json.loads(Path(result['output']).read_text())['projects'][0]['direction'], 'ltr')

    def test_snapshots_retain_each_source_hash_and_do_not_prune_previous_versions(self):
        self.create(); original = self.metadata(); source = self.project / original['chapters'][0]['file']; source.write_text('The first page.')
        first = self.run_cli('snapshot', self.project, '--label', 'Before the revision')
        source.write_text('The revised page.'); second = self.run_cli('snapshot', self.project, '--label', 'After the revision')
        self.assertNotEqual(first['snapshot'], second['snapshot']); self.assertTrue(Path(first['snapshot']).is_file())
        with zipfile.ZipFile(first['snapshot']) as archive:
            record = json.loads(archive.read('SNAPSHOT.json'))
            for name, sha in record['files'].items(): self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), sha)
            self.assertEqual(archive.read(original['chapters'][0]['file']), b'The first page.')
            restored = self.base / 'restored'; archive.extractall(restored)
        self.assertTrue(self.run_cli('validate', restored)['valid'])

    def test_all_host_install_paths_support_dry_run_and_preserve_existing_edits(self):
        expected = {'claude-code': '.claude/skills/bookwiz', 'codex': '.agents/skills/bookwiz', 'opencode': '.opencode/skills/bookwiz', 'hermes': '.hermes/skills/bookwiz', 'antigravity': '.agents/skills/bookwiz'}
        for host, suffix in expected.items():
            with self.subTest(agent=host):
                project = self.base / host
                dry = self.run_cli('--agent', host, '--project', project, '--dry-run', script=INSTALL)
                self.assertEqual(Path(dry['destination']), project / suffix); self.assertFalse(project.exists())
                result = self.run_cli('--agent', host, '--project', project, script=INSTALL); dest = Path(result['destination'])
                self.assertTrue((dest / 'SKILL.md').is_file()); self.assertTrue((dest / 'licenses/CC-BY-4.0.txt').is_file())
                self.assertEqual(self.run_cli('--agent', host, '--project', project, script=INSTALL)['status'], 'unchanged')
                note = dest / 'references/workflow.md'; note.write_text('My local skill changes.')
                self.run_cli('--agent', host, '--project', project, script=INSTALL, ok=False); self.assertEqual(note.read_text(), 'My local skill changes.')
        user = self.run_cli('--agent', 'opencode', '--scope', 'user', '--home', self.base / 'home', script=INSTALL)
        self.assertEqual(Path(user['destination']), self.base / 'home/.config/opencode/skills/bookwiz')
        foreign = self.base / 'foreign/bookwiz'; foreign.mkdir(parents=True); (foreign / 'mine.txt').write_text('Retain me.')
        self.run_cli('--agent', 'generic', '--destination', foreign, script=INSTALL, ok=False)
        self.assertEqual((foreign / 'mine.txt').read_text(), 'Retain me.')

    def test_standalone_bundle_is_reproducible_and_runs_without_repository_sources(self):
        out = self.base / 'bundle.zip'; second = self.base / 'again.zip'
        source_commit, fingerprint = 'a' * 40, 'b' * 64
        first = package.package(out, ROOT, source_commit=source_commit, source_fingerprint=fingerprint)
        package.package(second, ROOT, source_commit=source_commit, source_fingerprint=fingerprint)
        self.assertEqual(out.read_bytes(), second.read_bytes()); self.assertGreater(first['files'], 20)
        self.assertEqual(package.package(out, ROOT, check=True, source_commit=source_commit, source_fingerprint=fingerprint)['status'], 'current')
        with zipfile.ZipFile(out) as archive:
            manifest = json.loads(archive.read('MANIFEST.json')); self.assertEqual(manifest['sourceCommit'], source_commit); self.assertEqual(manifest['sourceFingerprint'], fingerprint)
            for name, sha in manifest['files'].items(): self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), sha)
            self.assertNotIn('dist/app.js', archive.namelist()); extracted = self.base / 'bundle'; archive.extractall(extracted)
        installed = self.run_cli('--agent', 'generic', '--destination', self.base / 'portable/bookwiz', script=extracted / 'install.py')
        portable = Path(installed['destination']) / 'scripts/bookwiz.py'
        shutil.rmtree(extracted)
        self.run_cli('init', self.project, '--title', 'A portable book', '--chapters', 1, script=portable)
        self.assertTrue(self.run_cli('validate', self.project, script=portable)['valid'])
        self.assertTrue(Path(self.run_cli('export', self.project, '--format', 'epub', script=portable)['output']).is_file())

    def test_bundle_detects_inconsistent_versions_and_corrupt_payloads(self):
        out = self.base / 'bundle.zip'; package.package(out)
        with zipfile.ZipFile(out, 'a') as archive: archive.writestr('unexpected.txt', 'not an official input')
        with self.assertRaises(ValueError): package.package(out, check=True)
        root = self.base / 'source'; root.mkdir(); shutil.copytree(SKILL, root / 'skills/bookwiz')
        for name in package.MANIFESTS:
            dest = root / name; dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / name, dest)
        version = json.loads((root / 'plugin.json').read_text())['version']
        (root / 'package.json').write_text(json.dumps({'version': version + '-incorrect'}))
        with self.assertRaisesRegex(ValueError, 'version differs'): package.bundle_files(root)


if __name__ == '__main__': unittest.main()
