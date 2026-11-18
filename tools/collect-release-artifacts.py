#!/usr/bin/env python3
"""Collect all eight verified builds for the current immutable source tag. BWNCL-1.0."""
from __future__ import annotations
import argparse,hashlib,io,json,os,re,stat,urllib.request,urllib.error,zipfile
from pathlib import Path,PurePosixPath
TARGETS=['android','ios','watchos','tvos','windows','macos','linux','web']
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None

def api_client(repository,token,api='https://api.github.com'):
 if not re.fullmatch(r'[-\w.]+/[-\w.]+',repository)or not token:raise ValueError('The workflow repository and token are required.')
 if not api.startswith('https://'):raise ValueError('Use an HTTPS GitHub API.')
 base=api.rstrip('/')+'/repos/'+repository
 headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
 def get(path,binary=False):
  request=urllib.request.Request(base+path,headers=headers)
  if not binary:
   with urllib.request.urlopen(request,timeout=90)as response:return json.load(response)
  try:
   with urllib.request.build_opener(NoRedirect).open(request,timeout=90)as response:return response.read(1024*1024*1024+1)
  except urllib.error.HTTPError as error:
   if error.code not in [301,302,303,307,308]:raise
   location=error.headers.get('Location','')
   if not location.startswith('https://'):raise ValueError('GitHub did not return a secure artifact download.')
   # The signed artifact URL must never receive the GitHub API token.
   with urllib.request.urlopen(location,timeout=180)as response:return response.read(1024*1024*1024+1)
 return get

def extract(data,directory):
 if len(data)>1024*1024*1024:raise ValueError('The artifact is too large.')
 with zipfile.ZipFile(io.BytesIO(data))as archive:
  entries=archive.infolist();seen=set()
  if len(entries)>100 or sum(e.file_size for e in entries)>2*1024*1024*1024:raise ValueError('Artifact contents exceed the package limit.')
  for entry in entries:
   name=entry.filename;p=PurePosixPath(name)
   if name in seen or p.is_absolute()or '..'in p.parts or '\\'in name or ':'in name or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unsafe artifact path: '+name)
   seen.add(name)
  for entry in entries:
   if entry.is_dir():continue
   p=directory/entry.filename;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(archive.read(entry))

def collect(root,get):
 root=Path(root);state=json.loads((root/'release-state.json').read_text());version=state['version']
 if not re.fullmatch(r'\d+\.\d+\.\d+',version):raise ValueError('Use a prepared stable version.')
 tag='bookwiz-v'+version;ref=get('/git/ref/tags/'+tag);commit=ref['object']['sha']
 if ref['object'].get('type')!='commit' or not re.fullmatch(r'[0-9a-f]{40,64}',commit):raise ValueError('The prepared version tag must point directly to its source commit.')
 ready={};missing=[]
 for target in TARGETS:
  runs=get('/actions/workflows/build-'+target+'.yml/runs?event=workflow_dispatch&head_sha='+commit+'&per_page=100')['workflow_runs']
  runs=sorted((r for r in runs if r.get('head_sha')==commit and r.get('status')=='completed'and r.get('conclusion')=='success'),key=lambda r:r['id'],reverse=True)
  found=None
  for run in runs:
   artifacts=get('/actions/runs/'+str(run['id'])+'/artifacts?per_page=100')['artifacts']
   matches=[a for a in artifacts if a['name']=='BookWiz-packages-'+target+'-'+str(run['id'])and not a.get('expired')]
   if len(matches)==1:found=matches[0];break
  if found:ready[target]=found
  else:missing.append(target)
 if missing:return {'ready':False,'version':version,'commit':commit,'missing':missing}
 for target,artifact in ready.items():
  if artifact.get('size_in_bytes',0)>1024*1024*1024:raise ValueError('The '+target+' artifact is too large.')
  data=get('/actions/artifacts/'+str(artifact['id'])+'/zip',binary=True)
  if artifact.get('digest')and artifact['digest']!='sha256:'+hashlib.sha256(data).hexdigest():raise ValueError('Artifact digest mismatch: '+target)
  extract(data,root/'release'/target)
 return {'ready':True,'version':version,'commit':commit,'missing':[]}

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=p.parse_args()
 try:
  result=collect(a.root,api_client(os.environ.get('GITHUB_REPOSITORY',''),os.environ.get('GITHUB_TOKEN',''),os.environ.get('GITHUB_API_URL','https://api.github.com')))
  print(json.dumps(result))
  if os.environ.get('GITHUB_OUTPUT'):
   with open(os.environ['GITHUB_OUTPUT'],'a')as output:
    for key in ['ready','version','commit']:output.write(key+'='+str(result[key]).lower()+'\n')
  if os.environ.get('GITHUB_STEP_SUMMARY'):
   with open(os.environ['GITHUB_STEP_SUMMARY'],'a')as summary:summary.write('BookWiz '+result['version']+(': all eight platform packages are ready.'if result['ready']else': waiting for successful builds: '+', '.join(result['missing']))+'\n')
 except (ValueError,OSError,KeyError,zipfile.BadZipFile)as error:p.exit(1,str(error)+'\n')
