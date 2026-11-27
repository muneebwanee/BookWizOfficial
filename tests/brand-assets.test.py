"""Check the real web/native identity files and their integrity (BWNCL-1.0)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import struct
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zlib

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('bookwiz_brand',ROOT/'tools/generate-brand.py')
brand=importlib.util.module_from_spec(spec);spec.loader.exec_module(brand)
SVG='{http://www.w3.org/2000/svg}'
ANDROID='{http://schemas.android.com/apk/res/android}'


def png(data):
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Missing PNG signature.')
    offset=8;payload=b'';header=None;ended=False
    while offset<len(data):
        length=struct.unpack('>I',data[offset:offset+4])[0]
        kind=data[offset+4:offset+8];body=data[offset+8:offset+8+length]
        crc=struct.unpack('>I',data[offset+8+length:offset+12+length])[0]
        if zlib.crc32(kind+body)&0xffffffff!=crc:raise ValueError('PNG CRC differs.')
        if kind==b'IHDR':header=struct.unpack('>IIBBBBB',body)
        if kind==b'IDAT':payload+=body
        offset+=12+length
        if kind==b'IEND':ended=True;break
    if not ended or offset!=len(data) or header is None:raise ValueError('Incomplete PNG.')
    width,height,depth,colour,compression,filtering,interlace=header
    if depth!=8 or colour not in [2,6] or compression or filtering or interlace:raise ValueError('Unexpected generated PNG format.')
    channels=3 if colour==2 else 4;stride=width*channels;raw=zlib.decompress(payload)
    if len(raw)!=(stride+1)*height:raise ValueError('PNG dimensions differ from payload.')
    if any(raw[y*(stride+1)] for y in range(height)):raise ValueError('Unexpected generated scanline filter.')
    pixels=b''.join(raw[y*(stride+1)+1:(y+1)*(stride+1)]for y in range(height))
    return width,height,channels,pixels


class BrandAssets(unittest.TestCase):
    def test_vector_variants_are_accessible_outlined_and_self_contained(self):
        manifest=json.loads((ROOT/'dist/assets/brand-manifest.json').read_text())
        self.assertEqual(len(manifest['assets']),11)
        for item in manifest['assets']:
            with self.subTest(asset=item['id']):
                path=ROOT/'dist'/item['src'];self.assertTrue(path.is_file())
                if item['type']!='image/svg+xml':continue
                node=ET.fromstring(path.read_text())
                self.assertTrue(node.find(SVG+'title').text)
                self.assertTrue(node.find(SVG+'desc').text)
                self.assertEqual(node.get('role'),'img')
                self.assertTrue(node.findall('.//'+SVG+'path'))
                self.assertFalse(any(node.iter(SVG+'text')))
                for tag in ['image','script','foreignObject','filter','linearGradient','radialGradient']:
                    self.assertFalse(any(node.iter(SVG+tag)),tag)
                for child in node.iter():
                    for attribute,value in child.attrib.items():
                        self.assertFalse(attribute.lower().startswith('on'))
                        self.assertFalse(attribute.endswith('href'))
                        self.assertNotIn('url(',value)

    def test_optical_favicon_uses_a_legible_single_colour_silhouette(self):
        small=ET.parse(ROOT/'dist/assets/brand-icon-small.svg').getroot()
        self.assertEqual(len(small.findall('.//'+SVG+'path')),1)
        icon=ET.parse(ROOT/'dist/assets/icon.svg').getroot()
        self.assertEqual(len(icon.findall('.//'+SVG+'path')),3)
        width,height,channels,pixels=png((ROOT/'dist/assets/favicon-16.png').read_bytes())
        self.assertEqual((width,height,channels),(16,16,4))
        # At the smallest real export the book must span a useful width, not
        # disappear into the ground or a few isolated highlight pixels.
        lit=[(i//channels%width,i//channels//width)for i in range(0,len(pixels),channels)if pixels[i+3]>160 and sum(pixels[i:i+3])>500]
        self.assertGreater(len(lit),18)
        self.assertGreaterEqual(max(x for x,y in lit)-min(x for x,y in lit),8)
        self.assertEqual((ROOT/'Icons/favicon-16.png').read_bytes(),(ROOT/'dist/assets/favicon-16.png').read_bytes())

    def test_apple_device_icons_are_opaque_and_tv_layers_have_the_correct_bounds(self):
        paths=['dist/assets/brand-app-icon.png','Icons/ios-app-icon.png','Icons/watch-app-icon.png','native/apple/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon.png','native/apple/Watch/Assets.xcassets/AppIcon.appiconset/AppIcon.png']
        for name in paths:
            with self.subTest(asset=name):self.assertEqual(png((ROOT/name).read_bytes())[:3],(1024,1024,3))
        tv=ROOT/'native/apple/TV/Assets.xcassets/AppIcon.brandassets'
        for stack,w,h in [('AppIcon.imagestack',400,240),('AppIconLarge.imagestack',1280,768)]:
            for layer,channels in [('Front',4),('Back',3)]:
                self.assertEqual(png((tv/stack/(layer+'.imagestacklayer/Content.imageset/image.png')).read_bytes())[:3],(w,h,channels))
        for name,w in [('TopShelf.imageset',1920),('TopShelfWide.imageset',2320)]:self.assertEqual(png((tv/name/'image.png').read_bytes())[:3],(w,720,3))

    def test_windows_and_mac_containers_hold_real_icon_families(self):
        data=(ROOT/'native/desktop/icons/icon.ico').read_bytes();reserved,kind,count=struct.unpack('<HHH',data[:6])
        self.assertEqual((reserved,kind,count),(0,1,7));sizes=[];end=6+16*count
        for index in range(count):
            w,h,palette,reserved,planes,bits,length,offset=struct.unpack('<BBBBHHII',data[6+16*index:22+16*index]);w=w or 256;h=h or 256
            self.assertEqual((planes,bits),(1,32));self.assertEqual(offset,end);end=offset+length
            self.assertEqual(png(data[offset:end])[:2],(w,h));sizes.append(w)
        self.assertEqual(end,len(data));self.assertEqual(sizes,[16,24,32,48,64,128,256])
        data=(ROOT/'native/desktop/icons/icon.icns').read_bytes();self.assertEqual(data[:4],b'icns');self.assertEqual(struct.unpack('>I',data[4:8])[0],len(data))
        offset=8;sizes=[]
        while offset<len(data):
            code=data[offset:offset+4];length=struct.unpack('>I',data[offset+4:offset+8])[0];w,h,_,_=png(data[offset+8:offset+length]);self.assertEqual(w,h)
            self.assertIn(code,[b'icp4',b'icp5',b'icp6',b'ic07',b'ic08',b'ic09',b'ic10']);sizes.append(w);offset+=length
        self.assertEqual(offset,len(data));self.assertEqual(sizes,[16,32,64,128,256,512,1024])

    def test_android_masks_share_the_foreground_and_keep_a_monochrome_fallback(self):
        res=ROOT/'native/android/app/src/main/res'
        colours=ET.parse(res/'values/brand_colors.xml').getroot();self.assertEqual(colours.find('color').text,brand.INK)
        for api in [26,33]:
            icon=ET.parse(res/f'mipmap-anydpi-v{api}/ic_launcher.xml').getroot();self.assertEqual(icon.tag,'adaptive-icon')
            self.assertEqual(icon.find('background').get(ANDROID+'drawable'),'@color/bookwiz_launcher_background')
            self.assertEqual(icon.find('foreground').get(ANDROID+'drawable'),'@drawable/ic_launcher_foreground')
            self.assertEqual(icon.find('monochrome')is not None,api==33)
        for name,count in [('ic_launcher_foreground.xml',3),('ic_launcher_monochrome.xml',1)]:
            vector=ET.parse(res/'drawable'/name).getroot();self.assertEqual(vector.get(ANDROID+'viewportWidth'),'108');self.assertEqual(vector.get(ANDROID+'viewportHeight'),'108')
            paths=vector.findall('path');self.assertEqual(len(paths),count)
            for path in paths:
                data=path.get(ANDROID+'pathData');self.assertTrue(data.startswith('M'));self.assertTrue(data.endswith('Z'))
                self.assertTrue(all(0<float(n)<108 for n in re.findall(r'-?\d+(?:\.\d+)?',data)))

    def test_integrity_check_finds_a_changed_platform_asset(self):
        self.assertEqual(len(brand.check()),47)
        manifest=json.loads((ROOT/'Icons/BRAND-MANIFEST.json').read_text())
        with tempfile.TemporaryDirectory()as folder:
            root=Path(folder)
            for name in ['Icons/BRAND-MANIFEST.json',*manifest['files']]:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
            old=brand.ROOT
            try:
                brand.ROOT=root;self.assertEqual(len(brand.check()),47)
                (root/'native/desktop/icons/icon.ico').write_bytes(b'bad')
                with self.assertRaisesRegex(ValueError,'Brand file changed: native/desktop/icons/icon.ico'):brand.check()
            finally:brand.ROOT=old


if __name__=='__main__':unittest.main()
