#!/usr/bin/env python3
"""Dispatch all editions from one immutable version tag (BWNCL-1.0)."""
import argparse,base64,json,os,re,subprocess,urllib.error,urllib.parse,urllib.request
from pathlib import Path
PLATFORMS=('android','ios','watchos','tvos','windows','macos','linux','web')


def github(method,path,data=None):
    api=os.environ.get('GITHUB_API_URL','https://api.github.com').rstrip('/')
    request=urllib.request.Request(api+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'})
    try:
        with urllib.request.urlopen(request,timeout=45)as response:return json.load(response)if response.status!=204 else None
    except urllib.error.HTTPError as error:
        if error.code==404 and method=='GET':return None
        raise RuntimeError(f'GitHub {method} {path} failed ({error.code}). Check workflow Actions/Contents write permissions.')from error


def dispatch(repository,commit,version,fingerprint,request=github):
    if not re.fullmatch(r'[\w.-]+/[\w.-]+',repository)or not re.fullmatch(r'[0-9a-f]{40,64}',commit)or not re.fullmatch(r'\d+\.\d+\.\d+',version):raise ValueError('Invalid release repository, commit or version.')
    base='/repos/'+repository;tag='bookwiz-v'+version;ref=request('GET',base+'/git/ref/tags/'+tag)
    if ref:
        pinned=ref['object']['sha']
        if ref['object'].get('type')=='tag':pinned=request('GET',base+'/git/tags/'+pinned)['object']['sha']
        if pinned!=commit:
            content=request('GET',base+'/contents/release-state.json?ref='+tag)
            state=json.loads(base64.b64decode(content['content']))if content else{}
            if state.get('fingerprint')!=fingerprint:raise ValueError('This version tag belongs to different source. Prepare the next patch version.')
    else:
        result=request('POST',base+'/git/refs',{'ref':'refs/tags/'+tag,'sha':commit})
        if result is None:raise RuntimeError('The immutable release tag could not be created.')
        pinned=commit
    result={}
    for target in PLATFORMS:
        workflow=base+'/actions/workflows/build-'+target+'.yml'
        runs=request('GET',workflow+'/runs?'+urllib.parse.urlencode({'event':'workflow_dispatch','head_sha':pinned,'per_page':100}))or{}
        previous=runs.get('workflow_runs',[])
        if any(r.get('head_sha')==pinned and (r.get('status')!='completed'or r.get('conclusion')=='success')for r in previous):result[target]='already queued or successful';continue
        request('POST',workflow+'/dispatches',{'ref':tag});result[target]='dispatched'
    return {'version':version,'tag':tag,'commit':pinned,'platforms':result}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--commit',required=True);args=parser.parse_args()
    # Read the exact prepared commit, even if another push has already advanced master.
    state=json.loads(subprocess.check_output(['git','show',args.commit+':release-state.json']))
    print(json.dumps(dispatch(os.environ['GITHUB_REPOSITORY'],args.commit,state['version'],state['fingerprint']),indent=2))
