#!/usr/bin/env python3
"""Build a sideloadable Android APK using Google's SDK tools and a local development key."""
import os,sys,subprocess,pathlib,zipfile,shutil,json,base64
from android_version import version_info
root=pathlib.Path(__file__).resolve().parents[1]
version_code,version_name=version_info(root)
sdk=pathlib.Path(os.environ.get('BOOKWIZ_ANDROID_SDK',root/'.build-tools'))
jdk=pathlib.Path(os.environ.get('JAVA_HOME',next(iter((sdk/'jdk').glob('*')),pathlib.Path('/usr/lib/jvm/default-java'))))
buildtools=next((sdk/'android-build').glob('*/aapt2')).parent
androidjar=next((sdk/'android-platform').glob('*/android.jar'))
out=root/'build/android';out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env['JAVA_HOME']=str(jdk);env['PATH']=str(jdk/'bin')+os.pathsep+env['PATH']
def run(args):subprocess.run([str(a) for a in args],check=True,cwd=root,env=env)
run(['node','tools/prepare-native.mjs','--target','android'])
for d in ['gen','classes','dex']:(out/d).mkdir(exist_ok=True)
res=root/'native/android/app/src/main/res';assets=root/'native/android/app/src/main/assets'
run([buildtools/'aapt2','compile','--dir',res,'-o',out/'resources.zip'])
metadata=json.load(open(sdk/'android-packages.json'));targetApi=metadata['platform']['path'].split('-')[-1]
run([buildtools/'aapt2','link','-o',out/'base.apk','-I',androidjar,'--manifest',root/'native/android/app/src/main/AndroidManifest.xml','--java',out/'gen','--min-sdk-version','26','--target-sdk-version',targetApi,'--version-code',version_code,'--version-name',version_name,'-A',assets,out/'resources.zip'])
sources=list((root/'native/android/app/src/main/java').rglob('*.java'))+list((out/'gen').rglob('*.java'))
run([jdk/'bin/javac','--release','8','-classpath',androidjar,'-d',out/'classes',*sources])
run([buildtools/'d8','--lib',androidjar,'--min-api','26','--output',out/'dex',*list((out/'classes').rglob('*.class'))])
with zipfile.ZipFile(out/'base.apk','a',zipfile.ZIP_DEFLATED)as z:
 for f in (out/'dex').glob('*.dex'):z.write(f,f.name)
run([buildtools/'zipalign','-f','4',out/'base.apk',out/'aligned.apk'])
state=pathlib.Path(os.environ.get('BOOKWIZ_BUILD_STATE',root/'.build-tools/signing'));state.mkdir(parents=True,exist_ok=True);key=state/'bookwiz-development.jks'
production=bool(os.environ.get('BOOKWIZ_ANDROID_KEYSTORE_BASE64'))
if production:
 key=state/'bookwiz-owner.jks';key.write_bytes(base64.b64decode(os.environ['BOOKWIZ_ANDROID_KEYSTORE_BASE64']));key.chmod(0o600)
 alias=os.environ['BOOKWIZ_ANDROID_KEY_ALIAS'];storepass='env:BOOKWIZ_ANDROID_KEYSTORE_PASSWORD';keypass='env:BOOKWIZ_ANDROID_KEY_PASSWORD'
else:
 alias='bookwiz-development';storepass='pass:android';keypass='pass:android'
 if not key.exists():run([jdk/'bin/keytool','-genkeypair','-keystore',key,'-storepass','android','-keypass','android','-alias',alias,'-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=BookWiz Local Development, OU=muneebwanee'])
release=pathlib.Path(os.environ.get('BOOKWIZ_RELEASE_DIR',root/'release'));release.mkdir(parents=True,exist_ok=True);apk=release/(f'BookWiz-{version_name}-Android.apk'if production else f'BookWiz-{version_name}-Android-development.apk')
try:run([buildtools/'apksigner','sign','--ks',key,'--ks-key-alias',alias,'--ks-pass',storepass,'--key-pass',keypass,'--out',apk,out/'aligned.apk'])
finally:
 if production:key.unlink(missing_ok=True)
run([buildtools/'apksigner','verify','--verbose',apk]);print('Built '+str(apk))
