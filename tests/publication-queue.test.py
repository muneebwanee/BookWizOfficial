"""Test the actual platform-to-publication workflow handshake. BWNCL-1.0."""
import contextlib,io,json,os,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch,MagicMock
import yaml
ROOT=Path(__file__).resolve().parents[1]
TARGETS=['android','ios','watchos','tvos','windows','macos','linux','web']
def definition(target):return yaml.safe_load((ROOT/'.github/workflows'/('build-'+target+'.yml')).read_text())
def python_body(block):return '\n'.join(block.splitlines()[1:-1])
class PublicationQueue(unittest.TestCase):
 def test_every_platform_explicitly_dispatches_the_default_branch_publisher(self):
  for target in TARGETS:
   with self.subTest(target=target):
    workflow=definition(target);template=yaml.safe_load((ROOT/'packaging/github'/('build-'+target+'.yml')).read_text());self.assertEqual(workflow,template)
    job=workflow['jobs']['publish-ready'];self.assertEqual(job['permissions'],{'actions':'write'});self.assertEqual(set(job['needs']),{'source-mode','build'})
    script=python_body(job['steps'][0]['run']);reply=MagicMock();reply.__enter__.return_value.status=204
    with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo','BOOKWIZ_DEFAULT_BRANCH':'main','GITHUB_TOKEN':'test-queue-token'},clear=True),patch('urllib.request.urlopen',return_value=reply)as send,contextlib.redirect_stdout(io.StringIO()):exec(compile(script,target,'exec'),{})
    self.assertEqual(send.call_count,1);request=send.call_args.args[0]
    self.assertEqual(request.full_url,'https://api.github.com/repos/owner/repo/actions/workflows/publish-current-release.yml/dispatches');self.assertEqual(request.method,'POST');self.assertEqual(json.loads(request.data),{'ref':'main'});self.assertEqual(request.get_header('Authorization'),'Bearer test-queue-token')
 def test_publication_requires_a_full_repository_and_a_successful_build(self):
  for target in TARGETS:
   job=definition(target)['jobs']['publish-ready'];expr=job['if'].removeprefix('${{').removesuffix('}}').strip()
   for full in [True,False]:
    for result in ['success','failure','cancelled','skipped']:
     condition=expr.replace('needs.source-mode.outputs.combined',repr(str(full).lower())).replace('needs.build.result',repr(result)).replace('&&','and')
     with self.subTest(target=target,full=full,result=result):self.assertEqual(eval(condition,{'__builtins__':{}}),full and result=='success')
 def test_the_actual_source_mode_reports_full_and_zip_only_inputs(self):
  for full in [True,False]:
   with tempfile.TemporaryDirectory()as tmp:
    root=Path(tmp);output=root/'output'
    if full:
     for name in ['package.json','tools/prepare-build-source.py']:
      p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.touch()
     for name in ['native/android','native/apple','native/desktop']:(root/name).mkdir(parents=True,exist_ok=True)
    script=python_body(definition('android')['jobs']['source-mode']['steps'][1]['run']);previous=Path.cwd()
    try:
     os.chdir(root)
     with patch.dict(os.environ,{'BOOKWIZ_EVENT':'workflow_dispatch','BOOKWIZ_REF_TYPE':'tag','GITHUB_OUTPUT':str(output)},clear=True),contextlib.redirect_stdout(io.StringIO()):exec(compile(script,'mode','exec'),{})
    finally:os.chdir(previous)
    self.assertIn('build=true\n',output.read_text());self.assertIn('combined='+str(full).lower()+'\n',output.read_text())
 def test_dispatch_failures_are_visible_without_exposing_the_token(self):
  script=python_body(definition('android')['jobs']['publish-ready']['steps'][0]['run'])
  with patch.dict(os.environ,{'GITHUB_REPOSITORY':'owner/repo','BOOKWIZ_DEFAULT_BRANCH':'master','GITHUB_TOKEN':'never-log-this'},clear=True),patch('urllib.request.urlopen',side_effect=urllib.error.HTTPError('https://api.github.com',403,'Forbidden',None,None)):
   with self.assertRaises(SystemExit)as error:exec(compile(script,'queue','exec'),{})
  self.assertIn('Actions write permission',str(error.exception));self.assertNotIn('never-log-this',str(error.exception))
if __name__=='__main__':unittest.main()
