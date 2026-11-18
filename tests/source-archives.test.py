"""Exercise source refresh, idempotence and concurrent CI pushes (BWNCL-1.0)."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import textwrap
import unittest
from unittest.mock import patch
import zipfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('source_sync',ROOT/'tools/sync-source-archives.py')
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)


def fixture(root):
    for name in sync.kits.ROOT_FILES:
        dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text('# Fixture\n'if name.endswith('.md')else'fixture\n')
    (root/'.gitignore').write_text('*.zip\n!/source-*.zip\n__pycache__/\n')
    (root/'package.json').write_text(json.dumps({'name':'bookwiz','version':'1.0.0','scripts':{},'dependencies':{}}))
    (root/'dist').mkdir();(root/'dist/app.js').write_text('export const edition="current";\n')
    (root/'dist/index.html').write_text('<!doctype html><title>BookWiz</title>')
    (root/'dist/sw.js').write_text("const CACHE='bookwiz-shell-old';\nconst ASSETS=[\"./\",\"./index.html\",\"./app.js\"];\n")
    (root/'tools').mkdir();(root/'tools/ci-release.mjs').write_text('export const release=true;')
    for target in sync.kits.PLATFORMS:
        doc=root/'docs/platforms'/(target+'.md');doc.parent.mkdir(parents=True,exist_ok=True);doc.write_text('# '+target+'\n')
        workflow=root/'packaging/github'/('build-'+target+'.yml');workflow.parent.mkdir(parents=True,exist_ok=True);workflow.write_text('name: '+target+'\n')
    for native in ['android','apple','desktop']:
        host=root/'native'/native/'host.txt';host.parent.mkdir(parents=True,exist_ok=True);host.write_text(native)


class SourceArchives(unittest.TestCase):
    def test_all_eight_archives_and_metadata_are_current_then_second_run_does_nothing(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp);fixture(root);old=(root/'dist/sw.js').read_bytes()
            changed=sync.sync(root);self.assertIn('dist/sw.js',changed);self.assertNotEqual((root/'dist/sw.js').read_bytes(),old)
            origins=json.loads((root/'SOURCE-ORIGINS.json').read_text())['archives']
            for target,meta in sync.kits.PLATFORMS.items():
                archive=root/('source-'+target+'.zip');self.assertEqual(sync.digest(archive),origins[target]['sha256'])
                with zipfile.ZipFile(archive)as z:
                    manifest=json.loads(z.read('SOURCE-MANIFEST.json'))
                    for name,sha in manifest['files'].items():self.assertEqual(hashlib.sha256(z.read(name)).hexdigest(),sha)
                    native={n.split('/')[1]for n in z.namelist()if n.startswith('native/')}
                    self.assertEqual(native,{meta['native']}if meta['native']else set())
                    self.assertEqual((root/('README-'+target+'.md')).read_bytes(),z.read('README.md'))
            self.assertEqual(len((root/'SHA256SUMS.txt').read_text().splitlines()),8)
            self.assertEqual(sync.sync(root),[]);self.assertEqual(sync.sync(root,check=True),[])

    def test_check_detects_source_edits_without_writing_then_refresh_keeps_shared_payloads_equal(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp);fixture(root);sync.sync(root)
            old={p.name:p.read_bytes()for p in root.glob('source-*.zip')}
            (root/'dist/app.js').write_text('export const edition="revised";\n')
            self.assertIn('source-android.zip',sync.sync(root,check=True))
            self.assertEqual(old,{p.name:p.read_bytes()for p in root.glob('source-*.zip')})
            sync.sync(root)
            for target in sync.kits.PLATFORMS:
                with zipfile.ZipFile(root/('source-'+target+'.zip'))as z:
                    self.assertEqual(z.read('dist/app.js'),(root/'dist/app.js').read_bytes())
                    self.assertEqual(z.read('dist/sw.js'),(root/'dist/sw.js').read_bytes())
            self.assertEqual(sync.sync(root,check=True),[])

    def test_native_edits_are_isolated_and_replacing_a_zip_does_not_modify_old_hardlinks(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp);fixture(root);sync.sync(root)
            original=(root/'source-android.zip').read_bytes();os.link(root/'source-android.zip',root/'old-snapshot.zip')
            before={t:sync.digest(root/('source-'+t+'.zip'))for t in sync.kits.PLATFORMS}
            (root/'native/android/host.txt').write_text('updated Android')
            sync.sync(root)
            self.assertEqual((root/'old-snapshot.zip').read_bytes(),original)
            self.assertNotEqual(sync.digest(root/'source-android.zip'),before['android'])
            self.assertTrue(all(sync.digest(root/('source-'+t+'.zip'))==before[t]for t in before if t!='android'))

    def test_corrupt_archives_and_stale_checksums_are_repaired(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp);fixture(root);sync.sync(root)
            (root/'source-web.zip').write_bytes(b'corrupt');(root/'SHA256SUMS.txt').write_text('stale\n')
            changed=sync.sync(root,check=True);self.assertIn('source-web.zip',changed);self.assertIn('SHA256SUMS.txt',changed)
            sync.sync(root);self.assertEqual(sync.sync(root,check=True),[])

    def test_new_source_commit_is_recorded_once_without_repacking_after_a_bot_only_commit(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp);fixture(root);sync.sync(root)
            with patch.object(sync.kits,'source_commit',return_value='a'*40):sync.sync(root)
            with zipfile.ZipFile(root/'source-web.zip')as z:self.assertEqual(json.loads(z.read('SOURCE-MANIFEST.json'))['base_commit'],'a'*40)
            with patch.object(sync.kits,'source_commit',return_value='b'*40):self.assertEqual(sync.sync(root),[])
            (root/'dist/app.js').write_text('export const edition="new commit";')
            with patch.object(sync.kits,'source_commit',return_value='c'*40):sync.sync(root)
            with zipfile.ZipFile(root/'source-web.zip')as z:self.assertEqual(json.loads(z.read('SOURCE-MANIFEST.json'))['base_commit'],'c'*40)

    def test_ci_retries_from_a_newer_upstream_commit_without_overwriting_that_edit(self):
        git=shutil.which('git')
        with tempfile.TemporaryDirectory()as temp:
            folder=Path(temp);remote=folder/'remote.git';local=folder/'runner';other=folder/'writer'
            def run(*args,cwd=None,env=None):return subprocess.run([git,*args],cwd=cwd,env=env,check=True,capture_output=True,text=True)
            run('init','--bare','--initial-branch=master',str(remote));run('clone',str(remote),str(local));fixture(local)
            for name in ['tools/sync-source-archives.py','tools/package-platform-kits.py','scripts/check_docs.py']:
                dest=local/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
            run('config','user.name','Fixture',cwd=local);run('config','user.email','fixture@example.test',cwd=local)
            sync.sync(local);run('add','.',cwd=local);run('commit','-m','initial',cwd=local);run('push','origin','master',cwd=local)
            run('clone',str(remote),str(other));run('config','user.name','Writer',cwd=other);run('config','user.email','writer@example.test',cwd=other)
            # The runner's source edit needs a refresh. A second writer changes
            # source between its first generated commit and its push.
            (local/'dist/app.js').write_text('export const edition="runner source";')
            run('add','dist/app.js',cwd=local);run('commit','-m','source change',cwd=local);run('push','origin','master',cwd=local)
            (other/'native/android/host.txt').write_text('concurrent writer edit')
            run('add','native/android/host.txt',cwd=other);run('commit','-m','concurrent source',cwd=other)
            wrappers=folder/'bin';wrappers.mkdir();marker=folder/'pushed';wrapper=wrappers/'git'
            wrapper.write_text('#!/bin/bash\nset -e\nif [[ "$1" == push && ! -e "$BOOKWIZ_TEST_MARKER" ]]; then\n touch "$BOOKWIZ_TEST_MARKER"\n "$BOOKWIZ_TEST_GIT" -C "$BOOKWIZ_TEST_WRITER" pull --no-rebase --no-edit origin master >/dev/null 2>&1\n "$BOOKWIZ_TEST_GIT" -C "$BOOKWIZ_TEST_WRITER" push origin master >/dev/null 2>&1\n exit 1\nfi\nexec "$BOOKWIZ_TEST_GIT" "$@"\n');wrapper.chmod(0o755)
            workflow=(ROOT/'.github/workflows/sync-source-archives.yml').read_text();body=workflow.split('      - name: Refresh and commit only generated source downloads',1)[1].split('        run: |\n',1)[1]
            env={**os.environ,'PATH':str(wrappers)+os.pathsep+os.environ['PATH'],'BOOKWIZ_BRANCH':'master','BOOKWIZ_TEST_MARKER':str(marker),'BOOKWIZ_TEST_GIT':git,'BOOKWIZ_TEST_WRITER':str(other)}
            subprocess.run(['bash','-c',textwrap.dedent(body)],cwd=local,env=env,check=True,capture_output=True,text=True)
            self.assertTrue(marker.exists());self.assertEqual((local/'native/android/host.txt').read_text(),'concurrent writer edit');self.assertEqual((local/'dist/app.js').read_text(),'export const edition="runner source";')
            self.assertEqual(sync.sync(local,check=True),[])
            self.assertEqual(run('rev-parse','HEAD',cwd=local).stdout,run('rev-parse','refs/heads/master',cwd=remote).stdout)


if __name__=='__main__':unittest.main()
