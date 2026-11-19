"""Verify source archives and build definitions, target isolation, manifests and regeneration."""
import hashlib,importlib.util,json,pathlib,posixpath,re,subprocess,tempfile,unittest,zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('kits',ROOT/'tools/package-platform-kits.py');kits=importlib.util.module_from_spec(spec);spec.loader.exec_module(kits)

class PlatformKits(unittest.TestCase):
    def test_all_archives_are_self_contained_and_platform_specific(self):
        for target,meta in kits.PLATFORMS.items():
            with self.subTest(target=target):
                files=kits.selected_files(target)
                manifest=json.loads(files['SOURCE-MANIFEST.json'])
                self.assertEqual(manifest['platform'],target)
                self.assertEqual(set(files)-{'SOURCE-MANIFEST.json'},set(manifest['files']))
                for name,digest in manifest['files'].items():self.assertEqual(hashlib.sha256(files[name]).hexdigest(),digest)
                native={name.split('/')[1]for name in files if name.startswith('native/')}
                self.assertEqual(native,{meta['native']}if meta['native']else set())
                self.assertTrue(all(not name.endswith(('.jks','.p12','.keystore','.mobileprovision'))for name in files))
                self.assertIn('LICENSE',files);self.assertIn('PRIVACY.md',files);self.assertIn('tools/ci-release.mjs',files);self.assertIn('tools/sync-source-archives.py',files);self.assertIn('tests/source-archives.test.py',files)
                if target=='android':
                    self.assertIn('tools/android_bundletool.py',files)
                    self.assertIn('tests/android-bundletool.test.py',files)
                    self.assertIn(b'from android_bundletool import ensure_bundletool',files['tools/build-aab.py'])
                self.assertEqual(json.loads(files['package.json'])['scripts']['check'],'node tools/check-source.mjs')
                for name,content in files.items():
                    if not name.endswith('.md'):continue
                    text=re.sub(r'```.*?```','',content.decode(),flags=re.S)
                    for href in re.findall(r'\]\(([^)\s]+)\)',text):
                        if re.match(r'^(?:[A-Za-z][A-Za-z0-9+.-]*:|#)',href):continue
                        linked=posixpath.normpath(posixpath.join(posixpath.dirname(name),href.split('#')[0]))
                        self.assertTrue(linked in files, f'{target}: {name} links to missing archive file {linked} ({href})')
                studio=files['docs/STUDIO_README.md'].decode()
                if 'screenshots/'in (ROOT/'README.md').read_text():
                    self.assertIn('https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/screenshots/README.md',studio)
                    self.assertIn('https://raw.githubusercontent.com/muneebwanee/BookWizOfficial/HEAD/screenshots/',studio)
                self.assertFalse(any(name.startswith('screenshots/')for name in files))
    def test_markdown_relocation_preserves_payment_and_other_absolute_uri_schemes(self):
        text='[Support](bitcoin:bc1qfixture?label=BookWiz) [Email](mailto:writer@example.test) [Guide](GETTING_STARTED.md) <a href="bitcoin:bc1qfixture">Bitcoin</a>'
        relocated=kits.relocate_markdown_links(text,'docs/BUILDING.md','README.md')
        self.assertIn('](bitcoin:bc1qfixture?label=BookWiz)',relocated)
        self.assertIn('](mailto:writer@example.test)',relocated)
        self.assertIn('](docs/GETTING_STARTED.md)',relocated)
        self.assertIn('href="bitcoin:bc1qfixture"',relocated)
    def test_web_source_has_no_nested_installers_and_uses_portable_download_links(self):
        files=kits.selected_files('web');self.assertFalse(any(n.startswith('dist/downloads/')for n in files));self.assertIn(b'bundledAndroid=false',files['dist/devices.js'])
        with tempfile.TemporaryDirectory()as temp:
            output=pathlib.Path(temp)/'source-web.zip';kits.make_zip(output,files);self.assertLess(output.stat().st_size,8*1024*1024)
            self.assertEqual(output.stat().st_mode&0o777,0o644)
    def test_extraction_and_regeneration_use_only_the_source_zip(self):
        # Workflow extraction code is deliberately stdlib-only; no app source is checked out outside the ZIP.
        import yaml
        for target in kits.PLATFORMS:
            with self.subTest(target=target),tempfile.TemporaryDirectory(prefix='bookwiz-pair-')as temp:
                root=pathlib.Path(temp);files=kits.selected_files(target);source=root/('source-'+target+'.zip');kits.make_zip(source,files)
                workflow=yaml.safe_load((ROOT/'packaging/github'/('build-'+target+'.yml')).read_text())
                step=next(x for x in workflow['jobs']['build']['steps']if x.get('name')=='Verify the source archive')
                subprocess.run(['bash','-c',step['run']],cwd=root,check=True,capture_output=True)
                self.assertTrue((root/'bookwiz/package.json').is_file())
                subprocess.run(['node','tools/check-source.mjs'],cwd=root/'bookwiz',check=True,capture_output=True)
                if target=='web':
                    before=(root/'bookwiz/dist/sw.js').read_bytes()
                    subprocess.run(['node','tools/version-cache.mjs'],cwd=root/'bookwiz',check=True,capture_output=True)
                    self.assertEqual(before,(root/'bookwiz/dist/sw.js').read_bytes())
                if target in ['android','web']:
                    subprocess.run(['python3','tools/package-platform-kits.py','--target',target,'--output',str(root/'regenerated')],cwd=root/'bookwiz',check=True,capture_output=True)
                    self.assertTrue((root/'regenerated'/('source-'+target+'.zip')).is_file())
    def test_full_repository_builds_edited_source_without_reading_a_retained_zip(self):
        import yaml
        with tempfile.TemporaryDirectory(prefix='bookwiz-current-')as temp:
            root=pathlib.Path(temp)
            for name,data in kits.selected_files('android').items():
                dest=root/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
            edited=(root/'dist/app.js').read_bytes()+b'\n// Current repository edit.\n'
            (root/'dist/app.js').write_bytes(edited)
            snapshot=b'A retained snapshot is deliberately not a ZIP.'
            (root/'source-android.zip').write_bytes(snapshot)
            workflow=yaml.safe_load((ROOT/'packaging/github/build-android.yml').read_text())
            step=next(x for x in workflow['jobs']['build']['steps']if x.get('name')=='Verify the source archive')
            subprocess.run(['bash','-c',step['run']],cwd=root,check=True,capture_output=True)
            self.assertEqual((root/'bookwiz/dist/app.js').read_bytes(),edited)
            self.assertEqual((root/'source-android.zip').read_bytes(),snapshot)
            manifest=json.loads((root/'bookwiz/SOURCE-MANIFEST.json').read_text())
            self.assertEqual(manifest['source_mode'],'repository')
            self.assertEqual(manifest['files']['dist/app.js'],hashlib.sha256(edited).hexdigest())
            self.assertFalse((root/'bookwiz/native/apple').exists())

    def test_corrupted_or_wrong_source_is_rejected_before_building(self):
        import yaml
        workflow=yaml.safe_load((ROOT/'packaging/github/build-android.yml').read_text());step=next(x for x in workflow['jobs']['build']['steps']if x.get('name')=='Verify the source archive')
        for scenario in ['wrong-target','corrupt','traversal']:
            with self.subTest(scenario=scenario),tempfile.TemporaryDirectory()as temp:
                root=pathlib.Path(temp);files=kits.selected_files('web'if scenario=='wrong-target'else'android')
                if scenario=='corrupt':files['dist/app.js']+=b'changed'
                if scenario=='traversal':files['..\\outside.txt']=b'bad'
                kits.make_zip(root/'source-android.zip',files)
                result=subprocess.run(['bash','-c',step['run']],cwd=root,capture_output=True)
                self.assertNotEqual(result.returncode,0)
                self.assertFalse((root/'outside.txt').exists())
    def test_web_output_has_a_hostable_root(self):
        with tempfile.TemporaryDirectory()as temp:
            root=pathlib.Path(temp)
            kits.make_zip(root/'source-web.zip',kits.selected_files('web'))
            with zipfile.ZipFile(root/'source-web.zip')as archive:archive.extractall(root/'site')
            subprocess.run(['python3','tools/build-web.py'],cwd=root/'site',check=True,capture_output=True)
            output=next((root/'site/release').glob('*.zip'))
            with zipfile.ZipFile(output)as archive:
                self.assertIn('index.html',archive.namelist());self.assertIn('sw.js',archive.namelist());self.assertIn('LICENSE',archive.namelist())
                self.assertEqual(archive.read('app.js'),(ROOT/'dist/app.js').read_bytes())
                self.assertFalse(any(name.startswith('dist/')for name in archive.namelist()))
    def test_source_pushes_build_affected_editions_and_active_workflows_match_templates(self):
        import fnmatch,yaml
        for target,meta in kits.PLATFORMS.items():
            with self.subTest(target=target):
                active=yaml.safe_load((ROOT/'.github/workflows'/('build-'+target+'.yml')).read_text())
                template=yaml.safe_load((ROOT/'packaging/github'/('build-'+target+'.yml')).read_text())
                self.assertEqual(active,template)
                paths=active['on']['push']['paths']
                self.assertIn('source-'+target+'.zip',paths)
                self.assertEqual(active['jobs']['build']['needs'],'source-mode')
                central=yaml.safe_load((ROOT/'.github/workflows/sync-source-archives.yml').read_text())
                for name in ['dist/app.js','tools/release-version.py','docs/WIDGETS.md','package.json']:
                    self.assertTrue(any(fnmatch.fnmatchcase(name,p)for p in central['on']['push']['paths']if not p.startswith('!')),(target,name))
                mode=active['jobs']['source-mode']['steps'][-1]['run']
                with tempfile.TemporaryDirectory()as temp:
                    root=pathlib.Path(temp);(root/'tools').mkdir();[(root/'native'/n).mkdir(parents=True,exist_ok=True)for n in ['android','apple','desktop']];(root/'package.json').write_text('{}');(root/'tools/prepare-build-source.py').write_text('')
                    import os
                    output=root/'output'
                    subprocess.run(['bash','-c',mode],cwd=root,env={**os.environ,'GITHUB_OUTPUT':str(output),'BOOKWIZ_EVENT':'push','BOOKWIZ_REF_TYPE':'branch'},check=True,capture_output=True)
                    self.assertEqual(dict(line.split('=',1)for line in output.read_text().splitlines()),{'build':'false','combined':'true'})
                    output.unlink();subprocess.run(['bash','-c',mode],cwd=root,env={**os.environ,'GITHUB_OUTPUT':str(output),'BOOKWIZ_EVENT':'workflow_dispatch','BOOKWIZ_REF_TYPE':'tag'},check=True,capture_output=True)
                    self.assertEqual(dict(line.split('=',1)for line in output.read_text().splitlines()),{'build':'true','combined':'true'})
                self.assertIn('workflow_dispatch',active['on'])
                self.assertIn('default_branch',active['jobs']['build']['if'])

    def test_archive_automation_follows_trusted_bot_jobs_without_following_itself(self):
        import yaml
        workflow=yaml.safe_load((ROOT/'.github/workflows/sync-source-archives.yml').read_text())
        self.assertEqual(workflow['permissions']['contents'],'write');self.assertEqual(workflow['permissions']['actions'],'write')
        self.assertEqual(set(workflow['on']['workflow_run']['workflows']),{'Star history','Add full source'})
        self.assertNotIn(workflow['name'],workflow['on']['workflow_run']['workflows'])
        self.assertIn('head_repository.full_name == github.repository',workflow['jobs']['refresh']['if'])
        self.assertIn('conclusion',workflow['jobs']['refresh']['if'])
        step=next(s for s in workflow['jobs']['refresh']['steps']if s.get('name')=='Refresh and commit only generated source downloads')
        self.assertIn('git reset --hard FETCH_HEAD',step['run'])
        self.assertIn('tools/sync-source-archives.py --check',step['run'])
        self.assertNotIn('workflow_dispatch',step['run'])
        checkout=workflow['jobs']['refresh']['steps'][0]
        self.assertNotIn('token',checkout['with'])
        self.assertIn('default_branch',checkout['with']['ref'])

    def test_android_version_metadata_is_shared_by_apk_and_aab(self):
        import os
        from unittest.mock import patch
        module=importlib.util.spec_from_file_location('android_version',ROOT/'tools/android_version.py');version=importlib.util.module_from_spec(module);module.loader.exec_module(version)
        with patch.dict(os.environ,{'BOOKWIZ_VERSION_CODE':'100101','BOOKWIZ_VERSION_NAME':'1.2.3'}):self.assertEqual(version.version_info(ROOT),('100101','1.2.3'))
        with patch.dict(os.environ,{'BOOKWIZ_VERSION_CODE':'999999999999'}):
            with self.assertRaises(ValueError):version.version_info(ROOT)

if __name__=='__main__':unittest.main()
