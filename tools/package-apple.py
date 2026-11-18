#!/usr/bin/env python3
"""Package a genuine Xcode device archive as an unsigned IPA; never substitute a macOS/simulator binary."""
import argparse,pathlib,plistlib,struct,zipfile,stat,os,json,hashlib
PLATFORMS={'ios':2,'tvos':3,'watchos':4}
ARM_DEVICE_CPUS={0x0100000c,0x0200000c}  # arm64 and watchOS arm64_32
FAT_HEADERS={b'\xca\xfe\xba\xbe':('>',20),b'\xbe\xba\xfe\xca':('<',20),b'\xca\xfe\xba\xbf':('>',32),b'\xbf\xba\xfe\xca':('<',32)}

def thin_device_platform(data):
 if len(data)<28:raise ValueError('The app executable is missing or incomplete.')
 magic,cpu,subtype,filetype,ncmds,size,flags=struct.unpack_from('<7I',data)
 if magic not in(0xfeedfacf,0xfeedface)or cpu not in ARM_DEVICE_CPUS or filetype!=2:raise ValueError('Expected an ARM Apple-device Mach-O executable, not a ZIP, web page, or desktop binary.')
 offset=32 if magic==0xfeedfacf else 28;commands_end=offset+size;platforms=set()
 if commands_end>len(data):raise ValueError('Truncated Mach-O load commands.')
 for _ in range(ncmds):
  if offset+8>commands_end:raise ValueError('Truncated Mach-O commands.')
  command,length=struct.unpack_from('<II',data,offset)
  if length<8 or offset+length>commands_end:raise ValueError('Invalid Mach-O command.')
  if command==0x32:
   if length<24:raise ValueError('Invalid build-version command.')
   platforms.add(struct.unpack_from('<I',data,offset+8)[0])
  elif command==0x25:platforms.add(2)
  elif command==0x2f:platforms.add(3)
  elif command==0x30:platforms.add(4)
  offset+=length
 if len(platforms)!=1 or not platforms.issubset(PLATFORMS.values()):raise ValueError('The executable targets macOS or a simulator, has conflicting platform markers, or lacks device build information.')
 return platforms.pop(),cpu

def device_platform(binary):
 data=pathlib.Path(binary).read_bytes()
 if data[:4]not in FAT_HEADERS:return thin_device_platform(data)[0]
 if len(data)<8:raise ValueError('Truncated universal Mach-O header.')
 endian,record_size=FAT_HEADERS[data[:4]];count=struct.unpack_from(endian+'I',data,4)[0];table_end=8+count*record_size
 if not 1<=count<=32 or table_end>len(data):raise ValueError('Invalid universal Mach-O architecture table.')
 platforms=set();ranges=[]
 for index in range(count):
  position=8+index*record_size
  cpu,subtype=struct.unpack_from(endian+'II',data,position)
  offset,size=struct.unpack_from(endian+('QQ'if record_size==32 else'II'),data,position+8)
  if cpu not in ARM_DEVICE_CPUS:raise ValueError('Universal executable contains a non-ARM device architecture.')
  if offset<table_end or size<28 or offset+size>len(data):raise ValueError('Invalid universal Mach-O slice bounds.')
  if any(offset<end and offset+size>start for start,end in ranges):raise ValueError('Overlapping universal Mach-O slices.')
  ranges.append((offset,offset+size));platform,slice_cpu=thin_device_platform(data[offset:offset+size])
  if cpu!=slice_cpu:raise ValueError('Universal architecture entry does not match its Mach-O slice.')
  platforms.add(platform)
 if len(platforms)!=1:raise ValueError('Universal executable mixes incompatible Apple platforms.')
 return platforms.pop()

def package(archive,output,platform):
 archive=pathlib.Path(archive).resolve();output=pathlib.Path(output).resolve()
 apps=list((archive/'Products/Applications').glob('*.app'))
 if len(apps)!=1:raise ValueError('Expected one application in a successful Xcode device archive.')
 app=apps[0];info=plistlib.loads((app/'Info.plist').read_bytes())
 if info.get('CFBundlePackageType')!='APPL' or not str(info.get('CFBundleIdentifier','')).startswith('com.muneebwanee.bookwiz'):raise ValueError('This is not the BookWiz app archive.')
 executable=app/info['CFBundleExecutable']
 if device_platform(executable)!=PLATFORMS[platform]:raise ValueError('The archive platform does not match the requested package.')
 for watch in (app/'Watch').glob('*.app'):
  watchinfo=plistlib.loads((watch/'Info.plist').read_bytes())
  if device_platform(watch/watchinfo['CFBundleExecutable'])!=4:raise ValueError('The embedded Watch application is not a watchOS device executable.')
 for extension in (app/'PlugIns').glob('*.appex'):
  extinfo=plistlib.loads((extension/'Info.plist').read_bytes())
  if extinfo.get('CFBundlePackageType')!='XPC!' or device_platform(extension/extinfo['CFBundleExecutable'])!=PLATFORMS[platform]:raise ValueError('The embedded extension is not an executable for the requested device platform.')
 output.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
  for source in [app,*sorted(app.rglob('*'))]:
   name='Payload/'+source.relative_to(app.parent).as_posix()
   if source.is_symlink():
    entry=zipfile.ZipInfo(name);entry.create_system=3;entry.external_attr=(stat.S_IFLNK|0o777)<<16;z.writestr(entry,os.readlink(source))
   elif source.is_dir():
    entry=zipfile.ZipInfo(name+'/');entry.create_system=3;entry.external_attr=(stat.S_IFDIR|0o755)<<16;z.writestr(entry,b'')
   else:z.write(source,name)
 digest=hashlib.sha256(output.read_bytes()).hexdigest()
 output.with_suffix('.ipa.json').write_text(json.dumps({'application':'BookWiz','platform':platform,'bundleId':info['CFBundleIdentifier'],'signed':False,'version':info.get('CFBundleShortVersionString'),'build':info.get('CFBundleVersion'),'sha256':digest,'installNote':'A genuine compiled device IPA, unsigned. It must be signed/provisioned with your own Apple identity before installation.'},indent=2)+'\n')
 return output
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--archive',required=True);parser.add_argument('--output',required=True);parser.add_argument('--platform',choices=PLATFORMS,required=True);args=parser.parse_args();print('Packaged unsigned device IPA:',package(args.archive,args.output,args.platform))
