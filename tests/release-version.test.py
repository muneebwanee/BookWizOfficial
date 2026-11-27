"""Shared release versions and immutable platform dispatch (BWNCL-1.0)."""
import base64,importlib.util,json,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/'tools'/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
version=module('release_version','release-version.py');releases=module('release_dispatch','dispatch-releases.py')

def fixture(root):
 for name,data in {'package.json':{'name':'bookwiz','version':'1.0.0'},'package-lock.json':{'version':'1.0.0','packages':{'':{'version':'1.0.0'}}},'native/desktop/runtime/package.json':{'name':'bookwiz-desktop','version':'1.0.0'}}.items():
  p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data))
 (root/'native/apple').mkdir();(root/'native/apple/project.yml').write_text('settings:\n  MARKETING_VERSION: "1.0.0"\n  CURRENT_PROJECT_VERSION: 14\n')
 (root/'CITATION.cff').write_text('version: 1.0.0\ndate-released: 2026-01-01\n');(root/'dist').mkdir();(root/'dist/app.js').write_text('export const text="current";')

class VersionTests(unittest.TestCase):
 def test_agent_plugin_versions_share_the_release_and_skill_edits_prepare_one_new_patch(self):
  with tempfile.TemporaryDirectory()as temp:
   root=Path(temp);fixture(root)
   for name in version.PLUGIN_FILES:
    path=root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps({'name':'bookwiz','version':'0.1.0','skills':'./skills/'}))
   (root/version.MARKETPLACE).write_text(json.dumps({'name':'bookwiz-official','plugins':[{'name':'bookwiz','version':'0.1.0','source':'./'}]}))
   skill=root/'skills/bookwiz/SKILL.md';skill.parent.mkdir(parents=True);skill.write_text('---\nmetadata:\n  version: \"0.1.0\"\n---\nOriginal BookWiz workflow.\n')
   prepared=version.prepare(root);self.assertEqual(prepared['version'],'1.0.1');version.check(root)
   for name in version.PLUGIN_FILES:self.assertEqual(json.loads((root/name).read_text())['version'],'1.0.1')
   self.assertEqual(json.loads((root/version.MARKETPLACE).read_text())['plugins'][0]['version'],'1.0.1');self.assertFalse(version.prepare(root)['changed'])
   skill.write_text(skill.read_text()+'New publishing step.\n')
   with self.assertRaises(ValueError):version.check(root)
   self.assertEqual(version.prepare(root)['version'],'1.0.2');self.assertFalse(version.prepare(root)['changed'])
   path=root/version.PLUGIN_FILES[0];data=json.loads(path.read_text());data['version']='0.1.0';path.write_text(json.dumps(data))
   with self.assertRaisesRegex(ValueError,'Plugin version mismatch'):version.check(root)
 def test_one_patch_version_updates_every_metadata_file_and_rebuilds_keep_it(self):
  with tempfile.TemporaryDirectory()as temp:
   root=Path(temp);fixture(root);state=version.prepare(root);self.assertEqual(state['version'],'1.0.1');self.assertEqual(state['build'],15);version.check(root)
   for name in ['package.json','package-lock.json','native/desktop/runtime/package.json']:self.assertEqual(json.loads((root/name).read_text())['version'],'1.0.1')
   self.assertFalse(version.prepare(root)['changed']);self.assertEqual(version.prepare(root)['version'],'1.0.1')
   (root/'dist/app.js').write_text('export const text="next";')
   with self.assertRaises(ValueError):version.check(root)
   self.assertEqual(version.prepare(root)['version'],'1.0.2');self.assertEqual(version.check(root)['build'],16)
 def test_star_counts_and_source_snapshots_do_not_increment_app_version(self):
  with tempfile.TemporaryDirectory()as temp:
   root=Path(temp);fixture(root);version.prepare(root);p=root/'docs/assets';p.mkdir(parents=True);(p/'star-history.json').write_text('{"stars":2}');(root/'source-web.zip').write_bytes(b'archive');(root/'SOURCE-ORIGINS.json').write_text('{}')
   self.assertFalse(version.prepare(root)['changed']);version.check(root)
 def test_explicit_minor_version_is_respected_and_inconsistent_metadata_is_detected(self):
  with tempfile.TemporaryDirectory()as temp:
   root=Path(temp);fixture(root);version.prepare(root);p=root/'package.json';d=json.loads(p.read_text());d['version']='1.1.0';p.write_text(json.dumps(d));self.assertEqual(version.prepare(root)['version'],'1.1.0')
   d=json.loads((root/'native/desktop/runtime/package.json').read_text());d['version']='1.0.0';(root/'native/desktop/runtime/package.json').write_text(json.dumps(d))
   with self.assertRaises(ValueError):version.check(root)
 def test_windows_crlf_checkouts_keep_the_same_fingerprint_and_binary_changes_are_detected(self):
  with tempfile.TemporaryDirectory()as temp:
   root=Path(temp);fixture(root);(root/'dist/style.css').write_bytes(b'body {color:black;}\n')
   (root/'dist/font.ttf').write_bytes(b'font\0\r\ndata');version.prepare(root);fingerprint=version.fingerprint(root)
   for path in root.rglob('*'):
    if path.is_file()and path.suffix in ['.json','.yml','.cff','.css','.js']:path.write_bytes(path.read_bytes().replace(b'\n',b'\r\n'))
   self.assertEqual(version.fingerprint(root),fingerprint);version.check(root)
   (root/'dist/font.ttf').write_bytes(b'font\0\ndata')
   with self.assertRaises(ValueError):version.check(root)
 def test_dispatches_all_platforms_from_exactly_one_version_tag(self):
  calls=[];sha='a'*40
  def request(method,path,data=None):
   calls.append((method,path,data))
   if method=='GET'and '/git/ref/'in path:return None
   if method=='POST'and path.endswith('/git/refs'):return {'ref':data['ref']}
   if method=='GET':return {'workflow_runs':[]}
  result=releases.dispatch('owner/repo',sha,'1.0.1','fingerprint',request)
  self.assertEqual(result['tag'],'bookwiz-v1.0.1');dispatches=[c for c in calls if c[1].endswith('/dispatches')];self.assertEqual(len(dispatches),8);self.assertTrue(all(c[2]=={'ref':'bookwiz-v1.0.1'}for c in dispatches))
 def test_repeat_dispatch_skips_successful_and_running_editions_and_retries_failures(self):
  calls=[];sha='a'*40
  def request(method,path,data=None):
   if '/git/ref/'in path:return {'object':{'sha':sha,'type':'commit'}}
   if '/artifacts?'in path:
    target=releases.PLATFORMS[int(path.split('/runs/')[1].split('/')[0])-1];return {'artifacts':[{'name':'BookWiz-packages-'+target+'-'+str(releases.PLATFORMS.index(target)+1),'expired':False}]}
   if method=='GET'and '/workflows/'in path:
    target=path.split('build-')[1].split('.yml')[0];return {'workflow_runs':[{'id':releases.PLATFORMS.index(target)+1,'head_sha':sha,'status':'completed','conclusion':'failure'if target=='android'else'success'}]}
   if method=='GET':return None
   calls.append(path)
  releases.dispatch('owner/repo',sha,'1.0.1','fp',request);self.assertEqual(len(calls),1);self.assertIn('build-android.yml',calls[0])
 def test_expired_or_missing_artifacts_rebuild_successful_editions_before_publication(self):
  calls=[];sha='a'*40
  def request(method,path,data=None):
   if '/git/ref/'in path:return {'object':{'sha':sha,'type':'commit'}}
   if method=='GET'and '/workflows/'in path:return {'workflow_runs':[{'id':1,'head_sha':sha,'status':'completed','conclusion':'success'}]}
   if method=='GET':return {'artifacts':[]}
   calls.append(path)
  releases.dispatch('owner/repo',sha,'1.0.2','fp',request);self.assertEqual(len(calls),8)
 def test_an_existing_version_cannot_be_reused_for_different_source(self):
  def request(method,path,data=None):
   if '/git/ref/'in path:return {'object':{'sha':'b'*40,'type':'commit'}}
   if '/contents/'in path:return {'content':base64.b64encode(json.dumps({'fingerprint':'old'}).encode()).decode()}
  with self.assertRaises(ValueError):releases.dispatch('owner/repo','a'*40,'1.0.1','new',request)

if __name__=='__main__':unittest.main()
