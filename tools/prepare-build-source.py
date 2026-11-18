#!/usr/bin/env python3
"""Stage the checked-out platform source for release builds (BWNCL-1.0)."""
from __future__ import annotations
import argparse
import importlib.util
import json
import pathlib

ROOT=pathlib.Path(__file__).resolve().parents[1]

def prepare(target,output,root=ROOT):
    root=pathlib.Path(root).resolve();output=pathlib.Path(output).resolve()
    if output==root or output.parent!=root:
        raise ValueError('The build source must be a new directory directly inside the repository.')
    if output.exists():
        raise ValueError('The build source directory already exists. Use a clean checkout.')
    spec=importlib.util.spec_from_file_location('bookwiz_platform_kits',root/'tools/package-platform-kits.py')
    kits=importlib.util.module_from_spec(spec);spec.loader.exec_module(kits)
    files=kits.selected_files(target,root)
    manifest=json.loads(files['SOURCE-MANIFEST.json']);manifest['source_mode']='repository'
    files['SOURCE-MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
    # The shared packager selects one host and excludes credentials and generated files.
    for name,data in files.items():
        relative=pathlib.PurePosixPath(name)
        if relative.is_absolute() or '..'in relative.parts or '\\'in name:
            raise ValueError('Unsafe source path: '+name)
        dest=output/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);dest.chmod(0o644)
    print('Prepared '+target+' from the current repository commit; retained source ZIPs are snapshots.')
    return manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target',required=True,choices=['android','ios','watchos','tvos','windows','macos','linux','web'])
    parser.add_argument('--output',type=pathlib.Path,required=True)
    args=parser.parse_args();prepare(args.target,args.output)
