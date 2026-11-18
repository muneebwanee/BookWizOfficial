#!/usr/bin/env python3
"""Synchronize the eight root source archives with the editable tree (BWNCL-1.0)."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import stat
from pathlib import Path
import tempfile
import zipfile

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('bookwiz_source_kits',Path(__file__).with_name('package-platform-kits.py'))
kits=importlib.util.module_from_spec(spec);spec.loader.exec_module(kits)


def digest(path):
    result=hashlib.sha256()
    with path.open('rb')as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''):result.update(chunk)
    return result.hexdigest()


def write_changed(path,data,check,changed):
    if path.is_file()and path.read_bytes()==data:return
    changed.append(path.name)
    if check:return
    with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.'+path.name+'.',delete=False)as handle:
        temporary=Path(handle.name);handle.write(data)
    temporary.chmod(0o644);temporary.replace(path)


def current_archive(path,expected):
    """Compare payloads, ignoring a later bot-only commit in base_commit."""
    if not path.is_file():return False
    try:
        with zipfile.ZipFile(path)as archive:
            entries=archive.infolist()
            if len(entries)>10000 or sum(e.file_size for e in entries)>256*1024*1024 or any(e.is_dir()or stat.S_ISLNK(e.external_attr>>16)for e in entries):return False
            names=archive.namelist()
            if len(names)!=len(expected)or set(names)!=set(expected):return False
            manifest=json.loads(archive.read('SOURCE-MANIFEST.json'))
            desired=json.loads(expected['SOURCE-MANIFEST.json'])
            if {k:v for k,v in manifest.items()if k!='base_commit'}!={k:v for k,v in desired.items()if k!='base_commit'}:return False
            # A locally prepared snapshot gains its real commit on its first CI refresh.
            if desired.get('base_commit')and not manifest.get('base_commit'):return False
            return all(hashlib.sha256(archive.read(name)).hexdigest()==sha for name,sha in desired['files'].items())
    except (OSError,ValueError,KeyError,zipfile.BadZipFile,RuntimeError):return False


def sync(root=ROOT,check=False):
    root=Path(root).resolve();changed=[];origins={};sums=[]
    # The web packager computes the cache hash from its actual source assets.
    web= kits.selected_files('web',root)
    shell=root/'dist/sw.js'
    if shell.read_bytes()!=web['dist/sw.js']:
        write_changed(shell,web['dist/sw.js'],check,changed)
        changed[-1]='dist/sw.js'
    for target in kits.PLATFORMS:
        files=web if target=='web'else kits.selected_files(target,root)
        # In check mode the root shell is deliberately not written. Every target
        # must still be compared with the corrected common cache manifest.
        if check and target!='web'and files['dist/sw.js']!=web['dist/sw.js']:
            files['dist/sw.js']=web['dist/sw.js'];manifest=json.loads(files['SOURCE-MANIFEST.json'])
            manifest['files']['dist/sw.js']=hashlib.sha256(web['dist/sw.js']).hexdigest()
            files['SOURCE-MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
        path=root/('source-'+target+'.zip')
        if not current_archive(path,files):
            changed.append(path.name)
            if not check:
                with tempfile.NamedTemporaryFile(dir=root,prefix='.'+path.name+'.',delete=False)as handle:temporary=Path(handle.name)
                try:kits.make_zip(temporary,files);temporary.replace(path)
                finally:temporary.unlink(missing_ok=True)
        write_changed(root/('README-'+target+'.md'),files['README.md'],check,changed)
        if path.is_file():
            sha=digest(path)
            origins[target]={'archive':path.name,'sha256':sha,'files':len(files)-1,'version':json.loads(files['SOURCE-MANIFEST.json'])['version']}
            sums.append(sha+'  '+path.name+'\n')
    origin={'format':1,'application':'BookWiz','layout':'one shared editable tree','archives':origins}
    write_changed(root/'SOURCE-ORIGINS.json',(json.dumps(origin,indent=2)+'\n').encode(),check,changed)
    write_changed(root/'SHA256SUMS.txt',''.join(sums).encode(),check,changed)
    return list(dict.fromkeys(changed))


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=ROOT)
    parser.add_argument('--check',action='store_true',help='Report stale generated files without writing.')
    args=parser.parse_args(argv);changed=sync(args.root,args.check)
    if changed:
        print(('Out of date: 'if args.check else'Updated: ')+', '.join(changed))
    else:print('All eight source archives, platform READMEs, checksums and offline cache are current.')
    return 1 if args.check and changed else 0


if __name__=='__main__':raise SystemExit(main())
