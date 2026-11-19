"""All-platform artifact readiness and extraction checks. BWNCL-1.0."""
import hashlib,importlib.util,io,json,tempfile,unittest,zipfile
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'tools/collect-release-artifacts.py');collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
def archive(files):
 data=io.BytesIO()
 with zipfile.ZipFile(data,'w')as z:
  for name,value in files.items():z.writestr(name,value)
 return data.getvalue()
class Artifacts(unittest.TestCase):
 def test_a_prepared_version_waits_for_its_tag_without_an_exception(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);(root/'release-state.json').write_text('{"version":"1.0.5"}')
   result=collector.collect(root,lambda path:None)
   self.assertFalse(result['ready']);self.assertEqual(result['missing'],collector.TARGETS)
 def test_notification_handoff_waits_for_completion_and_remains_bounded(self):
  now=[0];attempts=[]
  def clock():return now[0]
  def pause(seconds):now[0]+=seconds
  def collect(root,get):
   attempts.append(now[0]);return {'ready':len(attempts)==3}
  with patch.object(collector,'collect',side_effect=collect):result=collector.collect_when_ready(None,None,30,clock,pause)
  self.assertTrue(result['ready']);self.assertEqual(attempts,[0,5,10])
  now[0]=0;attempts.clear()
  with patch.object(collector,'collect',return_value={'ready':False}):result=collector.collect_when_ready(None,None,12,clock,pause)
  self.assertFalse(result['ready']);self.assertEqual(now[0],12)
  with self.assertRaises(ValueError):collector.collect_when_ready(None,None,121,clock,pause)
 def test_waits_for_all_editions_from_the_exact_commit_before_downloading(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);(root/'release-state.json').write_text('{"version":"1.0.2"}');downloads=[]
   def get(path,binary=False):
    if path.startswith('/git/'):return {'object':{'type':'commit','sha':'a'*40}}
    if '/workflows/'in path:return {'workflow_runs':[{'id':1,'head_sha':'b'*40,'status':'completed','conclusion':'success'}]}
    downloads.append(path);raise AssertionError(path)
   result=collector.collect(root,get);self.assertFalse(result['ready']);self.assertEqual(result['missing'],collector.TARGETS);self.assertEqual(downloads,[])
 def test_collects_only_successful_complete_artifacts_and_checks_the_zip_digest(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);(root/'release-state.json').write_text('{"version":"1.0.2"}');data=archive({'BUILD-INFO.json':'{}','BookWiz.zip':'package'});digest='sha256:'+hashlib.sha256(data).hexdigest()
   def get(path,binary=False):
    if path.startswith('/git/'):return {'object':{'type':'commit','sha':'a'*40}}
    if '/workflows/'in path:return {'workflow_runs':[{'id':collector.TARGETS.index(path.split('build-')[1].split('.yml')[0])+1,'head_sha':'a'*40,'status':'completed','conclusion':'success'}]}
    if '/runs/'in path:
     run=int(path.split('/runs/')[1].split('/')[0]);return {'artifacts':[{'id':run,'name':'BookWiz-packages-'+collector.TARGETS[run-1]+'-'+str(run),'expired':False,'digest':digest}]}
    self.assertTrue(binary);return data
   self.assertTrue(collector.collect(root,get)['ready']);self.assertTrue(all((root/'release'/t/'BUILD-INFO.json').exists()for t in collector.TARGETS))
 def test_rejects_unsafe_duplicate_and_oversized_archive_paths(self):
  with tempfile.TemporaryDirectory()as tmp:
   for path in ['../outside','/absolute','C:/absolute','a\\b']:
    with self.subTest(path=path),self.assertRaises(ValueError):collector.extract(archive({path:'x'}),Path(tmp))
   data=io.BytesIO()
   with zipfile.ZipFile(data,'w')as z:
    z.writestr('duplicate','1');z.writestr('duplicate','2')
   with self.assertRaises(ValueError):collector.extract(data.getvalue(),Path(tmp))
if __name__=='__main__':unittest.main()
