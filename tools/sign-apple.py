#!/usr/bin/env python3
"""Export installable Apple packages only when the owner supplies valid Apple signing assets via CI secrets."""
import os,sys,subprocess,pathlib,tempfile,base64,zipfile,plistlib,json,secrets,shutil
scheme,destination=sys.argv[1:3];root=pathlib.Path(__file__).resolve().parents[1]
required=['APPLE_CERTIFICATE_P12_BASE64','APPLE_CERTIFICATE_PASSWORD','APPLE_PROFILES_ZIP_BASE64','BOOKWIZ_APPLE_TEAM_ID','BOOKWIZ_APPLE_PROFILE_MAP']
if any(not os.environ.get(k)for k in required):print('Unsigned device archive built. Signed IPA export skipped: Apple signing secrets are not configured.');sys.exit(0)
def run(args):subprocess.run(args,check=True,cwd=root,stdout=subprocess.DEVNULL)
with tempfile.TemporaryDirectory(prefix='bookwiz-signing-')as temp:
 temp=pathlib.Path(temp);cert=temp/'certificate.p12';cert.write_bytes(base64.b64decode(os.environ['APPLE_CERTIFICATE_P12_BASE64']));profiles=temp/'profiles.zip';profiles.write_bytes(base64.b64decode(os.environ['APPLE_PROFILES_ZIP_BASE64']));keychain=temp/'bookwiz.keychain-db';password=secrets.token_urlsafe(24)
 run(['security','create-keychain','-p',password,keychain]);run(['security','set-keychain-settings','-lut','21600',keychain]);run(['security','unlock-keychain','-p',password,keychain]);run(['security','import',cert,'-P',os.environ['APPLE_CERTIFICATE_PASSWORD'],'-A','-t','cert','-f','pkcs12','-k',keychain]);run(['security','set-key-partition-list','-S','apple-tool:,apple:','-k',password,keychain]);run(['security','list-keychains','-d','user','-s',keychain])
 installed=[]
 try:
  provision=pathlib.Path.home()/'Library/MobileDevice/Provisioning Profiles';modern=pathlib.Path.home()/'Library/Developer/Xcode/UserData/Provisioning Profiles';provision.mkdir(parents=True,exist_ok=True);modern.mkdir(parents=True,exist_ok=True)
  with zipfile.ZipFile(profiles)as z:
   for item in z.infolist():
    if not item.filename.endswith('.mobileprovision'):continue
    raw=z.read(item);source=temp/pathlib.Path(item.filename).name;source.write_bytes(raw);decoded=subprocess.check_output(['security','cms','-D','-i',source]);uuid=plistlib.loads(decoded)['UUID'];target=provision/(uuid+'.mobileprovision');target.write_bytes(raw);installed.append(target);newtarget=modern/(uuid+'.mobileprovision');newtarget.write_bytes(raw);installed.append(newtarget)
  profilemap=json.loads(os.environ['BOOKWIZ_APPLE_PROFILE_MAP']);archive=root/'release'/(scheme+'-signed.xcarchive');export=root/'release/Apple-exports'/scheme
  run(['xcodebuild','archive','-project','native/apple/BookWiz.xcodeproj','-scheme',scheme,'-destination',destination,'-archivePath',archive,'DEVELOPMENT_TEAM='+os.environ['BOOKWIZ_APPLE_TEAM_ID'],'CODE_SIGN_STYLE=Manual','CODE_SIGN_IDENTITY='+('Apple Development'if(os.environ.get('BOOKWIZ_APPLE_EXPORT_METHOD')or'debugging')=='debugging'else'Apple Distribution'),'BOOKWIZ_IOS_PROFILE='+profilemap.get('com.muneebwanee.bookwiz',''),'BOOKWIZ_WATCH_PROFILE='+profilemap.get('com.muneebwanee.bookwiz.watchkitapp',''),'BOOKWIZ_TV_PROFILE='+profilemap.get('com.muneebwanee.bookwiz.tv',''),'BOOKWIZ_WIDGET_PROFILE='+profilemap.get('com.muneebwanee.bookwiz.widgets',''),'OTHER_CODE_SIGN_FLAGS=--keychain '+str(keychain)])
  options={'method':os.environ.get('BOOKWIZ_APPLE_EXPORT_METHOD')or'debugging','teamID':os.environ['BOOKWIZ_APPLE_TEAM_ID'],'signingStyle':'manual','provisioningProfiles':profilemap,'manageAppVersionAndBuildNumber':False}
  plist=temp/'ExportOptions.plist';plist.write_bytes(plistlib.dumps(options));run(['xcodebuild','-exportArchive','-archivePath',archive,'-exportPath',export,'-exportOptionsPlist',plist]);print('Signed IPA exported to '+str(export))
 finally:
  for file in installed:file.unlink(missing_ok=True)
  subprocess.run(['security','delete-keychain',keychain],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
