#!/usr/bin/env python3
"""Build and validate an Android App Bundle from the compiled Android module."""
import pathlib,os,json,zipfile,subprocess,base64,tempfile
from android_version import version_info
from android_bundletool import ensure_bundletool
root=pathlib.Path(__file__).resolve().parents[1];sdk=pathlib.Path(os.environ.get('BOOKWIZ_ANDROID_SDK',root/'.build-tools'));out=root/'build/android';release=pathlib.Path(os.environ.get('BOOKWIZ_RELEASE_DIR',root/'release'));release.mkdir(exist_ok=True,parents=True)
version_code,version_name=version_info(root)
jdk=pathlib.Path(os.environ.get('JAVA_HOME',next(iter((sdk/'jdk').glob('*')),pathlib.Path('/usr/lib/jvm/default-java'))));tools=next((sdk/'android-build').glob('*/aapt2')).parent;androidjar=next((sdk/'android-platform').glob('*/android.jar'));meta=json.load(open(sdk/'android-packages.json'));api=meta['platform']['path'].split('-')[-1]
def run(args):subprocess.run([str(a)for a in args],check=True,cwd=root)
jar=ensure_bundletool(sdk)
run([tools/'aapt2','link','--proto-format','-o',out/'proto.apk','-I',androidjar,'--manifest',root/'native/android/app/src/main/AndroidManifest.xml','--min-sdk-version','26','--target-sdk-version',api,'--version-code',version_code,'--version-name',version_name,'-A',root/'native/android/app/src/main/assets',out/'resources.zip'])
with zipfile.ZipFile(out/'proto.apk')as source,zipfile.ZipFile(out/'base-module.zip','w',zipfile.ZIP_DEFLATED)as module:
 for entry in source.namelist():module.writestr('manifest/AndroidManifest.xml'if entry=='AndroidManifest.xml'else entry,source.read(entry))
 for dex in (out/'dex').glob('*.dex'):module.write(dex,'dex/'+dex.name)
production=bool(os.environ.get('BOOKWIZ_ANDROID_KEYSTORE_BASE64'));bundle=release/(f'BookWiz-{version_name}-Android.aab'if production else f'BookWiz-{version_name}-Android-development.aab');bundle.unlink(missing_ok=True)
run([jdk/'bin/java','-jar',jar,'build-bundle','--modules='+str(out/'base-module.zip'),'--output='+str(bundle)])
if production:
 with tempfile.TemporaryDirectory(prefix='bookwiz-signing-')as temp:
  key=pathlib.Path(temp)/'owner.jks';key.write_bytes(base64.b64decode(os.environ['BOOKWIZ_ANDROID_KEYSTORE_BASE64']));key.chmod(0o600)
  run([jdk/'bin/jarsigner','-keystore',key,'-storepass:env','BOOKWIZ_ANDROID_KEYSTORE_PASSWORD','-keypass:env','BOOKWIZ_ANDROID_KEY_PASSWORD',bundle,os.environ['BOOKWIZ_ANDROID_KEY_ALIAS']])
else:run([jdk/'bin/jarsigner','-keystore',pathlib.Path(os.environ.get('BOOKWIZ_BUILD_STATE',root/'.build-tools/signing'))/'bookwiz-development.jks','-storepass','android','-keypass','android',bundle,'bookwiz-development'])
run([jdk/'bin/java','-jar',jar,'validate','--bundle='+str(bundle)]);print('Validated '+str(bundle))
