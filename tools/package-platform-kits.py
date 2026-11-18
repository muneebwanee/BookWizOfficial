#!/usr/bin/env python3
"""Create platform source archives and matching build definitions, using only the stdlib."""
from __future__ import annotations
import argparse,hashlib,json,pathlib,posixpath,re,subprocess,zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
PLATFORMS={
    'android':{'title':'Android','native':'android','prepare':'android','outputs':'Android APK and Google Play AAB','tools':['setup-android.py','build-android.py','build-aab.py','android_version.py','android_bundletool.py']},
    'ios':{'title':'iPhone and iPad with Apple Watch','native':'apple','prepare':'apple','outputs':'iOS device IPA with the embedded Watch companion; signed IPA when signing is configured','tools':['package-apple.py','sign-apple.py','check-apple-project.py']},
    'watchos':{'title':'Apple Watch companion','native':'apple','prepare':'apple','outputs':'Paired iPhone IPA containing the Watch app; signed IPA when signing is configured','tools':['package-apple.py','sign-apple.py','check-apple-project.py']},
    'tvos':{'title':'Apple TV','native':'apple','prepare':'apple','outputs':'tvOS device IPA; signed IPA when signing is configured','tools':['package-apple.py','sign-apple.py','check-apple-project.py']},
    'windows':{'title':'Windows','native':'desktop','prepare':'desktop','outputs':'One Windows installer containing x64 and ARM64 applications','tools':[]},
    'macos':{'title':'macOS','native':'desktop','prepare':'desktop','outputs':'One universal Mac DMG for Intel and Apple Silicon','tools':[]},
    'linux':{'title':'Linux','native':'desktop','prepare':'desktop','outputs':'x64 AppImage and Debian/Ubuntu DEB packages','tools':[]},
    'web':{'title':'Web','native':None,'prepare':None,'outputs':'Ready-to-host website ZIP, with index.html at its root','tools':['build-web.py']},
}
ROOT_FILES=['CITATION.cff','DESIGN.md','PRODUCT.md','package.json','package-lock.json','LICENSE','README.md','CONTRIBUTING.md','PRIVACY.md','TERMS.md','SUPPORT.md','THIRD_PARTY_NOTICES','CHANGELOG.md','.gitignore']
COMMON_TOOLS=['sync-pdf-assets.mjs','prepare-native.mjs','latex-service.mjs','latex-engine.mjs','version-cache.mjs','ci-release.mjs','check-source.mjs','package-platform-kits.py']
IGNORED_NATIVE=['native/desktop/runtime/web/','native/desktop/runtime/latex-engine.mjs','native/desktop/runtime/local-services.mjs','native/android/app/src/main/assets/web/','native/apple/iOS/Web/']

def repository_files(root=ROOT):
    try:
        result=subprocess.run(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root,check=True,capture_output=True)
        return sorted(set(n for n in result.stdout.decode().split('\0')if n))
    except (subprocess.CalledProcessError,FileNotFoundError):
        result=[]
        for p in root.rglob('*'):
            relative=p.relative_to(root).as_posix()
            if p.is_file()and not any(x in p.relative_to(root).parts for x in ['.git','node_modules','.build-tools','build','release','__pycache__']):result.append(relative)
        return sorted(result)

def source_commit(root=ROOT):
    try:return subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,stderr=subprocess.DEVNULL).decode().strip()
    except (subprocess.CalledProcessError,FileNotFoundError):
        try:return json.loads((root/'SOURCE-MANIFEST.json').read_text()).get('base_commit')
        except (OSError,json.JSONDecodeError):return None

def readme(target,spec,root=ROOT):
    return (root/'docs/platforms'/(target+'.md')).read_text()

def relocate_markdown_links(text,source,destination):
    def target(href,image=False):
        original=posixpath.normpath(posixpath.join(posixpath.dirname(source),href))
        # The showcase is a separate download, not a native build dependency.
        if original.startswith('screenshots/'):
            base='https://raw.githubusercontent.com/muneebwanee/BookWizOfficial/HEAD/'if image else'https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/'
            return base+original
        return posixpath.relpath(original,posixpath.dirname(destination)or'.')
    text=re.sub(r'\]\((?!(?:[A-Za-z][A-Za-z0-9+.-]*:|#))([^)]+)\)',lambda match:']('+target(match[1])+')',text)
    return re.sub(r'\b(href|src)="(?!(?:[A-Za-z][A-Za-z0-9+.-]*:|#))([^"]+)"',lambda match:match[1]+'="'+target(match[2],image=match[1]=='src')+'"',text)

def selected_files(target,root=ROOT):
    spec=PLATFORMS[target];native=spec['native'];files={}
    for name in repository_files(root):
        if name.startswith(tuple(IGNORED_NATIVE)):continue
        if name.startswith('native/')and ('.xcodeproj/'in name or name.endswith(('.jks','.p12','.mobileprovision'))):continue
        if name.startswith('dist/downloads/'):continue
        common=name in ROOT_FILES or name.startswith(('dist/','docs/','packaging/github/','LICENSES/','scripts/')) or (name.startswith('tests/')and name.endswith('.test.mjs'))or name in ['tools/'+x for x in COMMON_TOOLS]
        own=(native and name.startswith('native/'+native+'/')) or name in ['tools/'+x for x in spec['tools']]
        if native=='apple'and name=='tests/apple-package.test.py':own=True
        if target=='android'and name=='tests/android-bundletool.test.py':own=True
        if common or own:
            source=root/name
            if source.is_file():files[name]=source.read_bytes()
    for name in ROOT_FILES+['dist/index.html','tools/ci-release.mjs','packaging/github/build-'+target+'.yml']:
        if name not in files:raise RuntimeError('Required source file is missing: '+name)
    if native and not any(name.startswith('native/'+native+'/')for name in files):raise RuntimeError('This source checkout does not contain '+native+' native files for '+target+'.')
    if target=='web':
        # Recompute the portable source's cache version from its actual assets.
        # Download routing is shared by all editions and always uses Releases.
        shell=files['dist/sw.js'].decode();assets=re.search(r'const ASSETS=(\[[\s\S]*?\]);',shell)
        if not assets:raise RuntimeError('The offline asset manifest is missing.')
        cache=hashlib.sha256();cache.update(re.sub(r"const CACHE='[^']+'","const CACHE='VERSION'",shell).encode())
        for asset in sorted(json.loads(assets.group(1).replace("'",'"'))):
            if asset=='./':continue
            cache.update(asset.encode());cache.update(files['dist/'+asset.removeprefix('./')])
        files['dist/sw.js']=re.sub(r"const CACHE='[^']+'","const CACHE='bookwiz-shell-"+cache.hexdigest()[:12]+"'",shell).encode()
    # The gallery is a separate download. Its links must also work from an
    # extracted platform edition, including links in newly added guides.
    for name,content in list(files.items()):
        if name.endswith('.md'):
            files[name]=relocate_markdown_links(content.decode(),name,name).encode()
    original=files['README.md'];studio=root/'docs/STUDIO_README.md'
    files['docs/STUDIO_README.md']=studio.read_bytes() if studio.is_file() else relocate_markdown_links(original.decode(),'README.md','docs/STUDIO_README.md').encode()
    files['README.md']=readme(target,spec,root).encode()
    package=json.loads(files['package.json']);package['scripts']={'check':'node tools/check-source.mjs','test':'node --test tests/*.test.mjs','compiler':'node tools/latex-service.mjs','package:source':f'python3 tools/package-platform-kits.py --target {target} --output ../BookWiz-{target}-source'}
    if spec['prepare']:package['scripts']['native:prepare']='node tools/prepare-native.mjs --target '+spec['prepare']
    if target=='android':package['scripts']['native:android']='python3 tools/build-android.py && python3 tools/build-aab.py'
    if native=='desktop':package['scripts']['native:desktop']='npm run native:prepare && electron-builder --config native/desktop/electron-builder.yml --publish never'
    if target=='web':package['scripts']['build']='python3 tools/build-web.py'
    files['package.json']=(json.dumps(package,indent=2)+'\n').encode()
    manifest={'format':1,'application':'BookWiz','developer':'muneebwanee','platform':target,'version':package['version'],'base_commit':source_commit(root),'files':{name:hashlib.sha256(data).hexdigest()for name,data in sorted(files.items())}}
    files['SOURCE-MANIFEST.json']=(json.dumps(manifest,indent=2)+'\n').encode()
    return files

def make_zip(output,files):
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9,allowZip64=False)as archive:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            archive.writestr(info,data,compresslevel=9)
    pathlib.Path(output).chmod(0o644)
    with zipfile.ZipFile(output)as archive:
        bad=archive.testzip()
        if bad:raise RuntimeError('ZIP integrity failed for '+bad)

SOURCE_GUIDE_FILE='docs/SOURCE_ARCHIVES.md'

def package_platforms(targets,output,root=ROOT):
    output=pathlib.Path(output);output.mkdir(parents=True,exist_ok=True)
    kit_files={};created=[]
    for target in targets:
        files=selected_files(target,root);zipname='source-'+target+'.zip';workflow='build-'+target+'.yml';readmename='README-'+target+'.md'
        make_zip(output/zipname,files)
        (output/workflow).write_bytes((root/'packaging/github'/workflow).read_bytes())
        (output/readmename).write_bytes(files['README.md'])
        kit_files[target+'/'+zipname]=(output/zipname).read_bytes()
        kit_files[target+'/.github/workflows/'+workflow]=(output/workflow).read_bytes()
        kit_files[target+'/README.md']=files['README.md']
        created.extend([output/zipname,output/workflow,output/readmename])
        print(target+': '+zipname+' + '+workflow+' ('+str((output/zipname).stat().st_size)+' bytes)')
    guide=(root/SOURCE_GUIDE_FILE).read_text()
    guide=re.sub(r'\]\((?!(?:[A-Za-z][A-Za-z0-9+.-]*:|#))([^)]+)\)',lambda match:'](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/'+posixpath.normpath('docs/'+match[1])+')',guide).encode()
    (output/'README.md').write_bytes(guide);kit_files['README.md']=guide
    sums=''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n'for p in created)
    (output/'SHA256SUMS.txt').write_text(sums);kit_files['SHA256SUMS.txt']=''.join(hashlib.sha256(data).hexdigest()+'  '+name+'\n'for name,data in sorted(kit_files.items())).encode()
    make_zip(output/'BookWiz-platform-sources.zip',kit_files)
    return created

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target',action='append',choices=list(PLATFORMS),help='Repeat to package selected targets; defaults to all eight.')
    parser.add_argument('--output',type=pathlib.Path,required=True)
    args=parser.parse_args()
    package_platforms(args.target or list(PLATFORMS),args.output)
