#!/usr/bin/env python3
"""Prepare one shared patch version for all BookWiz editions (BWNCL-1.0)."""
from __future__ import annotations
import argparse,datetime,hashlib,importlib.util,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('version_kits',Path(__file__).with_name('package-platform-kits.py'))
kits=importlib.util.module_from_spec(spec);spec.loader.exec_module(kits)
STATE='release-state.json'
GENERATED={'SOURCE-ORIGINS.json','SHA256SUMS.txt',STATE,'native/desktop/runtime/icon.png','native/desktop/runtime/LICENSE','native/desktop/runtime/THIRD_PARTY_NOTICES'}


def parts(version):
    if not isinstance(version,str)or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)',version):raise ValueError('Use a stable major.minor.patch version.')
    return tuple(map(int,version.split('.')))


def fingerprint(root=ROOT):
    root=Path(root);digest=hashlib.sha256()
    for name in kits.repository_files(root):
        if name in GENERATED or name.startswith(tuple(kits.IGNORED_NATIVE))or name.startswith(('docs/assets/star-history.','dist/downloads/')):continue
        if not(name in kits.ROOT_FILES or name.startswith(('dist/','native/','tools/','tests/','scripts/','docs/','packaging/','.github/workflows/','LICENSES/'))):continue
        data=(root/name).read_bytes()
        # Git for Windows can check text out as CRLF. Hash the same text on
        # every host; binary fonts/images/archives keep their exact bytes.
        if b'\0' not in data:
            try:data.decode('utf-8');data=data.replace(b'\r\n',b'\n')
            except UnicodeDecodeError:pass
        if name in ['package.json','package-lock.json','native/desktop/runtime/package.json']:
            value=json.loads(data);value['version']='VERSION'
            if name=='package-lock.json'and ''in value.get('packages',{}):value['packages']['']['version']='VERSION'
            data=json.dumps(value,sort_keys=True,separators=(',',':')).encode()
        elif name=='native/apple/project.yml':
            data=re.sub(rb'(MARKETING_VERSION|CURRENT_PROJECT_VERSION):[^\n]*',rb'\1: VERSION',data)
        elif name=='CITATION.cff':data=re.sub(rb'(?m)^(version|date-released):[^\n]*',rb'\1: VERSION',data)
        elif name=='dist/sw.js':data=re.sub(rb"const CACHE='[^']+'",b"const CACHE='VERSION'",data)
        digest.update(name.encode()+b'\0');digest.update(data)
    return digest.hexdigest()


def write_json(path,value):path.write_text(json.dumps(value,indent=2)+'\n')


def prepare(root=ROOT):
    root=Path(root);package=json.loads((root/'package.json').read_text());current=package['version'];parts(current)
    state=json.loads((root/STATE).read_text())if(root/STATE).exists()else None
    source=fingerprint(root);changed=not state or state.get('fingerprint')!=source or state.get('version')!=current
    if changed:
        if state and parts(current)>parts(state['version']):version=current
        else:
            major,minor,patch=parts(state['version']if state else current);version=f'{major}.{minor}.{patch+1}'
    else:version=current
    apple=root/'native/apple/project.yml';apple_text=apple.read_text()if apple.exists()else''
    existing=re.search(r'CURRENT_PROJECT_VERSION:\s*(\d+)',apple_text)
    build=(int(state.get('build',0))if state else int(existing[1])if existing else 0)+(1 if changed else 0)
    for name in ['package.json','package-lock.json','native/desktop/runtime/package.json']:
        path=root/name
        if not path.exists():continue
        data=json.loads(path.read_text());data['version']=version
        if name=='package-lock.json'and ''in data.get('packages',{}):data['packages']['']['version']=version
        write_json(path,data)
    if apple.exists():
        apple_text=re.sub(r'MARKETING_VERSION:[^\n]*',f'MARKETING_VERSION: "{version}"',apple_text)
        apple_text=re.sub(r'CURRENT_PROJECT_VERSION:[^\n]*',f'CURRENT_PROJECT_VERSION: {build}',apple_text);apple.write_text(apple_text)
    citation=root/'CITATION.cff'
    if citation.exists():
        text=re.sub(r'(?m)^version:[^\n]*',f'version: {version}',citation.read_text())
        if changed:text=re.sub(r'(?m)^date-released:[^\n]*',f'date-released: {datetime.datetime.now(datetime.timezone.utc).date().isoformat()}',text)
        citation.write_text(text)
    if fingerprint(root)!=source:raise ValueError('Version preparation unexpectedly changed release source inputs.')
    write_json(root/STATE,{'format':1,'version':version,'build':build,'fingerprint':source})
    return {'version':version,'build':build,'changed':changed,'fingerprint':source}


def check(root=ROOT):
    root=Path(root);state=json.loads((root/STATE).read_text());version=state['version'];parts(version)
    for name in ['package.json','package-lock.json','native/desktop/runtime/package.json']:
        p=root/name
        if not p.exists():continue
        value=json.loads(p.read_text())
        if value.get('version')!=version:raise ValueError('Version mismatch: '+name)
        if name=='package-lock.json'and value.get('packages',{}).get('',{}).get('version',version)!=version:raise ValueError('Lockfile root version differs.')
    apple=root/'native/apple/project.yml'
    if apple.exists()and not re.search(r'MARKETING_VERSION:\s*"?'+re.escape(version)+r'"?(?:\n|$)',apple.read_text()):raise ValueError('Apple marketing version differs.')
    if apple.exists()and not re.search(r'CURRENT_PROJECT_VERSION:\s*'+str(state['build'])+r'(?:\n|$)',apple.read_text()):raise ValueError('Apple build counter differs.')
    if state.get('fingerprint')!=fingerprint(root):raise ValueError('Release source changed. Run the central Refresh source archives workflow to prepare its next version.')
    return state


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=ROOT);p.add_argument('--check',action='store_true');p.add_argument('--prepare',action='store_true');a=p.parse_args()
    try:print(json.dumps(check(a.root)if a.check else prepare(a.root)))
    except (ValueError,OSError,KeyError)as error:p.exit(1,str(error)+'\n')
