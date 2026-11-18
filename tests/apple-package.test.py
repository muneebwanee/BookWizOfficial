"""Apple device package and modern Watch target regression checks."""
import contextlib,copy,importlib.util,io,json,pathlib,plistlib,re,struct,tempfile,unittest,zipfile
ROOT=pathlib.Path(__file__).parents[1]
spec=importlib.util.spec_from_file_location('apple_package',ROOT/'tools/package-apple.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
spec=importlib.util.spec_from_file_location('apple_project',ROOT/'tools/check-apple-project.py');project=importlib.util.module_from_spec(spec);spec.loader.exec_module(project)

def thin(platform,cpu=0x0100000c):
    return struct.pack('<8I',0xfeedfacf,cpu,0,2,1,24,0,0)+struct.pack('<6I',0x32,24,platform,0,0,0)

def universal(slices,endian='>',wide=False):
    size=32 if wide else 20;offset=8+size*len(slices)
    data=struct.pack(endian+'II',0xcafebabf if wide else 0xcafebabe,len(slices));records=[];contents=[]
    for cpu,content in slices:
        records.append(struct.pack(endian+('IIQQII'if wide else'IIIII'),cpu,0,offset,len(content),0,*([0]if wide else[])))
        contents.append(content);offset+=len(content)
    return data+b''.join(records)+b''.join(contents)

class ApplePlatformChecks(unittest.TestCase):
    def inspect(self,data):
        with tempfile.NamedTemporaryFile()as file:
            file.write(data);file.flush();return module.device_platform(file.name)
    def test_accepts_device_platform_markers(self):
        for platform in [2,3,4]:self.assertEqual(self.inspect(thin(platform)),platform)
    def test_rejects_desktop_and_simulator_platform_markers(self):
        for platform in [1,6,7,8,9]:
            with self.subTest(platform=platform),self.assertRaises(ValueError):self.inspect(thin(platform))
    def test_rejects_intel_and_non_macho_input(self):
        for data in [thin(2,0x01000007),b'not an Apple app']:
            with self.assertRaises(ValueError):self.inspect(data)
    def test_accepts_universal_watch_device_architectures(self):
        slices=[(0x0100000c,thin(4)),(0x0200000c,thin(4,0x0200000c))]
        for endian in ['>','<']:
            for wide in [False,True]:
                with self.subTest(endian=endian,wide=wide):self.assertEqual(self.inspect(universal(slices,endian,wide)),4)
    def test_rejects_universal_simulator_and_mixed_platform_slices(self):
        cases=[[(0x0100000c,thin(4)),(0x0200000c,thin(9,0x0200000c))],[(0x0100000c,thin(2)),(0x0200000c,thin(4,0x0200000c))],[(0x01000007,thin(4,0x01000007))],[(0x0200000c,thin(4))]]
        for slices in cases:
            with self.subTest(slices=slices),self.assertRaises(ValueError):self.inspect(universal(slices))
    def test_rejects_invalid_universal_slice_ranges(self):
        data=bytearray(universal([(0x0100000c,thin(4))]))
        for offset in [0,len(data)+100]:
            modified=bytearray(data);struct.pack_into('>I',modified,16,offset)
            with self.assertRaises(ValueError):self.inspect(modified)
        with self.assertRaises(ValueError):self.inspect(b'\xca\xfe\xba\xbe')
    def test_packages_phone_with_a_universal_watch_companion(self):
        with tempfile.TemporaryDirectory()as temp:
            root=pathlib.Path(temp);archive=root/'BookWiz.xcarchive';phone=archive/'Products/Applications/BookWiz.app';watch=phone/'Watch/BookWiz Watch.app';watch.mkdir(parents=True)
            for app,bundle,executable,data in [(phone,'com.muneebwanee.bookwiz','BookWiz',thin(2)),(watch,'com.muneebwanee.bookwiz.watchkitapp','BookWiz Watch',universal([(0x0100000c,thin(4)),(0x0200000c,thin(4,0x0200000c))]))]:
                (app/'Info.plist').write_bytes(plistlib.dumps({'CFBundlePackageType':'APPL','CFBundleIdentifier':bundle,'CFBundleExecutable':executable}));(app/executable).write_bytes(data)
            widgets=phone/'PlugIns/BookWiz Widgets.appex';widgets.mkdir(parents=True)
            (widgets/'Info.plist').write_bytes(plistlib.dumps({'CFBundlePackageType':'XPC!','CFBundleExecutable':'BookWiz Widgets'}));(widgets/'BookWiz Widgets').write_bytes(thin(2))
            output=module.package(archive,root/'BookWiz.ipa','ios')
            with zipfile.ZipFile(output)as packaged:
                self.assertIn('Payload/BookWiz.app/Watch/BookWiz Watch.app/BookWiz Watch',packaged.namelist())
            self.assertFalse(json.loads(output.with_suffix('.ipa.json').read_text())['signed'])
            with zipfile.ZipFile(output)as packaged:self.assertIn('Payload/BookWiz.app/PlugIns/BookWiz Widgets.appex/BookWiz Widgets',packaged.namelist())
            (widgets/'BookWiz Widgets').write_bytes(thin(3))
            with self.assertRaisesRegex(ValueError,'extension'):module.package(archive,root/'wrong-platform.ipa','ios')
    def test_app_and_widgets_share_an_app_group_and_declared_defaults_reason(self):
        phone=plistlib.loads((ROOT/'native/apple/iOS/BookWiz.entitlements').read_bytes());widgets=plistlib.loads((ROOT/'native/apple/Widgets/BookWiz.entitlements').read_bytes())
        self.assertEqual(phone['com.apple.security.application-groups'],widgets['com.apple.security.application-groups'])
        group=phone['com.apple.security.application-groups'][0]
        for file in ['iOS/BookWizApp.swift','Widgets/BookWizWidgets.swift']:self.assertIn(group,(ROOT/'native/apple'/file).read_text())
        privacy=plistlib.loads((ROOT/'native/apple/PrivacyInfo.xcprivacy').read_bytes());self.assertFalse(privacy['NSPrivacyTracking']);self.assertIn('1C8F.1',privacy['NSPrivacyAccessedAPITypes'][0]['NSPrivacyAccessedAPITypeReasons'])


class WatchProjectChecks(unittest.TestCase):
    def fixture(self):
        return {'objects':{'phone':{'isa':'PBXNativeTarget','name':'BookWiz-iOS','buildPhases':['embed']},'watch':{'isa':'PBXNativeTarget','name':'BookWiz-Watch','productType':'com.apple.product-type.application','productReference':'watch-product','buildPhases':['sources'],'buildConfigurationList':'configs'},'sources':{'isa':'PBXSourcesBuildPhase','files':['source-build']},'source-build':{'fileRef':'entry-point'},'entry-point':{'path':'BookWizWatchApp.swift'},'embed':{'isa':'PBXCopyFilesBuildPhase','files':['embed-build']},'embed-build':{'fileRef':'watch-product'},'configs':{'buildConfigurations':['debug','release']},'debug':{'buildSettings':{'SDKROOT':'watchos'}},'release':{'buildSettings':{'SDKROOT':'watchos'}}}}
    def test_checked_in_watch_spec_uses_modern_application_product(self):
        text=(ROOT/'native/apple/project.yml').read_text();block=text.split('  BookWiz-Watch:\n',1)[1].split('  BookWiz-tvOS:\n',1)[0]
        self.assertRegex(block,r'(?m)^    type: application$');self.assertNotIn('application.watchapp2',block)
        info=plistlib.loads((ROOT/'native/apple/Watch/Info.plist').read_bytes());self.assertTrue(info['WKApplication']);self.assertNotIn('WKWatchKitApp',info)
    def test_generated_modern_watch_app_is_accepted(self):
        with contextlib.redirect_stdout(io.StringIO()):project.check_project(self.fixture(),{'WKApplication':True})
    def test_legacy_stub_target_is_rejected_before_archiving(self):
        data=self.fixture();data['objects']['watch']['productType']='com.apple.product-type.application.watchapp2'
        with self.assertRaisesRegex(ValueError,'stub'):project.check_project(data,{'WKApplication':True})
    def test_missing_watch_source_and_embedding_are_rejected(self):
        for broken in ['sources','embedding','sdk']:
            data=self.fixture()
            if broken=='sources':data['objects']['sources']['files']=[]
            elif broken=='embedding':data['objects']['embed']['files']=[]
            else:data['objects']['release']['buildSettings']['SDKROOT']='iphoneos'
            with self.subTest(broken=broken),self.assertRaises(ValueError):project.check_project(data,{'WKApplication':True})

if __name__=='__main__':unittest.main()
