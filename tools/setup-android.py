#!/usr/bin/env python3
import pathlib,os,urllib.request,xml.etree.ElementTree as ET,json,zipfile,hashlib,sys
root=pathlib.Path(__file__).resolve().parents[1];dest=pathlib.Path(os.environ.get('BOOKWIZ_ANDROID_SDK',root/'.build-tools'));dest.mkdir(parents=True,exist_ok=True)
xml=urllib.request.urlopen('https://dl.google.com/android/repository/repository2-3.xml').read();tree=ET.fromstring(xml);packages=[]
for e in tree.iter():
 if e.tag.rsplit('}',1)[-1]!='remotePackage':continue
 path=e.attrib['path'];channel=next((c.attrib.get('ref') for c in e if c.tag.rsplit('}',1)[-1]=='channelRef'),None)
 if channel not in (None,'channel-0') or not (path.startswith('build-tools;')or path.startswith('platforms;android-')):continue
 for a in e.iter():
  if a.tag.rsplit('}',1)[-1]!='archive':continue
  vals={c.tag.rsplit('}',1)[-1]:c.text for c in a}
  if vals.get('host-os')not in(None,'linux'):continue
  complete=next((c for c in a if c.tag.rsplit('}',1)[-1]=='complete'),None)
  if complete is None:continue
  v={c.tag.rsplit('}',1)[-1]:c.text for c in complete};packages.append({'path':path,'url':'https://dl.google.com/android/repository/'+v['url'],'sha1':v['checksum']})
def version(p):return tuple(int(x)for x in p['path'].split(';')[1].replace('android-','').split('.')if x.isdigit())
selected={'build':max([p for p in packages if p['path'].startswith('build-tools;')],key=version),'platform':max([p for p in packages if p['path'].startswith('platforms;android-')and p['path'].split('-')[-1].isdigit()],key=version)}
for name,p in selected.items():
 folder=dest/('android-'+name)
 if folder.exists():continue
 archive=dest/(name+'.zip');print('Downloading '+p['path'],flush=True);urllib.request.urlretrieve(p['url'],archive)
 if hashlib.sha1(archive.read_bytes()).hexdigest()!=p['sha1']:raise RuntimeError('SDK checksum failed')
 with zipfile.ZipFile(archive)as z:z.extractall(folder)
 archive.unlink()
 for f in folder.rglob('*'):
  if f.is_file()and f.name in ['aapt2','aapt','zipalign','apksigner','d8']:f.chmod(0o755)
json.dump(selected,open(dest/'android-packages.json','w'),indent=2)
print('SDK ready. Set JAVA_HOME to a JDK 21 installation before building.')
