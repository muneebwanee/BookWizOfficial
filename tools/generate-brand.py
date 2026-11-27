#!/usr/bin/env python3
"""Build BookWiz's flat folded-book identity and native icon files (BWNCL-1.0).

Uses Python's standard library and the project's existing @resvg/resvg-js dev
dependency. Generated wordmark outlines come from the bundled DM Sans at weight
550; no installed fonts, image service, or font downloads are required.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INK = '#17354D'
PAPER = '#F5F0E6'
TEAL = '#78BEC7'
CORAL = '#EBA58D'
# Mirrored folds use deliberate 15°, 75° and 105° edges. Two-decimal
# coordinates preserve optical clarity without long renderer-generated floats.
PAGE = 'M12 18 28 22.29 32 33 36 22.29 52 18 47 42 35.75 47 32 39 28.25 47 17 42Z'
LEFT = 'M12 18 28 22.29 32 33 28.25 47 25 27 17 23 21.56 40 17 42Z'
RIGHT = 'M52 18 36 22.29 32 33 35.75 47 39 27 47 23 42.44 40 47 42Z'
# Outlined from dist/assets/dm-sans.ttf, DM Sans weight 550, optical size 9.
# Its full OFL license remains at dist/licenses/DM-Sans-OFL.txt.
WORDMARK = [[0, 'M75.50555419921875 0V700H342.42779541015625Q415.83001708984375 700 465.0772399902344 676.7988891601562Q514.324462890625 653.5977783203125 539.2211303710938 613.0977783203125Q564.1177978515625 572.5977783203125 564.1177978515625 520.804443359375Q564.1177978515625 467.4022216796875 540.9166870117188 431.4022216796875Q517.715576171875 395.4022216796875 480.0661315917969 376.2527770996094Q442.41668701171875 357.10333251953125 399.22113037109375 353.4022216796875L414.1177978515625 364Q460.61224365234375 362.70111083984375 498.3133544921875 339.2527770996094Q536.0144653320312 315.804443359375 558.0661315917969 276.9538879394531Q580.1177978515625 238.10333251953125 580.1177978515625 191Q580.1177978515625 136.50555419921875 553.6694641113281 93.15499877929688Q527.2211303710938 49.804443359375 476.2727966308594 24.9022216796875Q425.324462890625 0 351.324462890625 0ZM185.5089111328125 90.324462890625H336.04779052734375Q398.67889404296875 90.324462890625 433.39666748046875 119.6400146484375Q468.11444091796875 148.95556640625 468.11444091796875 202.08111572265625Q468.11444091796875 254.804443359375 432.39666748046875 285.82110595703125Q396.67889404296875 316.8377685546875 334.04779052734375 316.8377685546875H185.5089111328125ZM185.5089111328125 401.17333984375H328.3577880859375Q388.586669921875 401.17333984375 420.20111083984375 429.1383361816406Q451.8155517578125 457.10333251953125 451.8155517578125 506.4244384765625Q451.8155517578125 554.3433227539062 420.20111083984375 582.457763671875Q388.586669921875 610.5722045898438 326.25445556640625 610.5722045898438H185.5089111328125Z'], [626, 'M302.111120039892 -12Q228.1844482421875 -12 171.28778076171875 22.448333740234375Q114.39111328125 56.89666748046875 82.7933349609375 119.04611206054688Q51.195556640625 181.195556640625 51.195556640625 263.00715902180013Q51.195556640625 345.804443359375 83.14389038085938 407.4538879394531Q115.09222412109375 469.10333251953125 172.3066841712365 503.5516662597656Q229.52114422137922 538 303.44425189678486 538Q378.3800048828125 538 434.77667236328125 503.5516662597656Q491.17333984375 469.10333251953125 522.7711181640625 407.4538879394531Q554.368896484375 345.804443359375 554.368896484375 263.00715902180013Q554.368896484375 181.195556640625 522.4205627441406 119.04611206054688Q490.47222900390625 56.89666748046875 433.76135748785896 22.448333740234375Q377.05048597181167 -12 302.111120039892 -12ZM301.98914982722357 82.715576171875Q342.70111083984375 82.715576171875 374.32110595703125 102.824462890625Q405.94110107421875 122.933349609375 424.0038757324219 163.258335079767Q442.066650390625 203.58332055015902 442.066650390625 262.9629694845824Q442.066650390625 323.2288818359375 424.5038757324219 363.2972106933594Q406.94110107421875 403.36553955078125 375.6716613769531 423.3249816894531Q344.4022216796875 443.284423828125 303.53917383885647 443.284423828125Q263.564453125 443.284423828125 231.9444580078125 423.3249816894531Q200.324462890625 403.36553955078125 181.9111328125 363.2972106933594Q163.497802734375 323.2288818359375 163.497802734375 262.9629694845824Q163.497802734375 203.58332055015902 181.56057739257812 163.258335079767Q199.62335205078125 122.933349609375 230.89279174804688 102.824462890625Q262.1622314453125 82.715576171875 301.98914982722357 82.715576171875Z'], [1232, 'M302.111120039892 -12Q228.1844482421875 -12 171.28778076171875 22.448333740234375Q114.39111328125 56.89666748046875 82.7933349609375 119.04611206054688Q51.195556640625 181.195556640625 51.195556640625 263.00715902180013Q51.195556640625 345.804443359375 83.14389038085938 407.4538879394531Q115.09222412109375 469.10333251953125 172.3066841712365 503.5516662597656Q229.52114422137922 538 303.44425189678486 538Q378.3800048828125 538 434.77667236328125 503.5516662597656Q491.17333984375 469.10333251953125 522.7711181640625 407.4538879394531Q554.368896484375 345.804443359375 554.368896484375 263.00715902180013Q554.368896484375 181.195556640625 522.4205627441406 119.04611206054688Q490.47222900390625 56.89666748046875 433.76135748785896 22.448333740234375Q377.05048597181167 -12 302.111120039892 -12ZM301.98914982722357 82.715576171875Q342.70111083984375 82.715576171875 374.32110595703125 102.824462890625Q405.94110107421875 122.933349609375 424.0038757324219 163.258335079767Q442.066650390625 203.58332055015902 442.066650390625 262.9629694845824Q442.066650390625 323.2288818359375 424.5038757324219 363.2972106933594Q406.94110107421875 403.36553955078125 375.6716613769531 423.3249816894531Q344.4022216796875 443.284423828125 303.53917383885647 443.284423828125Q263.564453125 443.284423828125 231.9444580078125 423.3249816894531Q200.324462890625 403.36553955078125 181.9111328125 363.2972106933594Q163.497802734375 323.2288818359375 163.497802734375 262.9629694845824Q163.497802734375 203.58332055015902 181.56057739257812 163.258335079767Q199.62335205078125 122.933349609375 230.89279174804688 102.824462890625Q262.1622314453125 82.715576171875 301.98914982722357 82.715576171875Z'], [1838, 'M388.368896484375 0 163.1177978515625 284 373.47222900390625 526H505.4644775390625L250.2578125 240.54998779296875L250.95892333984375 324.46112060546875L526.1544799804688 0ZM70.10333251953125 0V720H180.106689453125V0Z'], [2381, 'M216.11444091796875 0 28.29888916015625 700H146.0955810546875L282.151123046875 126.9000244140625L439.4022216796875 700H561.497802734375L714.4500122070312 125.79669189453125L852.2066650390625 700H970.30224609375L778.1878051757812 0H649.0111083984375L498.45001220703125 543.7310791015625L343.888916015625 0Z'], [3378, 'M75.413330078125 0V526H185.41668701171875V0ZM130.564453125 606.5722045898438Q99.586669921875 606.5722045898438 79.64944458007812 625.76220703125Q59.71221923828125 644.9522094726562 59.71221923828125 673.8377685546875Q59.71221923828125 703.022216796875 79.64944458007812 721.5111083984375Q99.586669921875 740 130.564453125 740Q161.1400146484375 740 181.42779541015625 721.5111083984375Q201.715576171875 703.022216796875 201.715576171875 673.8377685546875Q201.715576171875 644.9522094726562 181.42779541015625 625.76220703125Q161.1400146484375 606.5722045898438 130.564453125 606.5722045898438Z'], [3638, 'M36.70111083984375 0V89.02557373046875L313.54998779296875 434.77886962890625H40.804443359375V526H444.03668212890625V436.97442626953125L165.693359375 91.22113037109375H449.03668212890625V0Z']]

def svg(width, height, content, title='BookWiz', description='A folded open book forming the letter W.'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img" aria-labelledby="brand-title brand-desc">'
            f'<title id="brand-title">{title}</title><desc id="brand-desc">{description}</desc>'
            f'<metadata>BookWiz by muneebwanee. BWNCL-1.0. Wordmark outlines: DM Sans, SIL OFL 1.1.</metadata>'
            f'{content}</svg>\n')

def symbol(color=None):
    paths = f'<path fill="{color or PAPER}" d="{PAGE}"/>'
    if color is None:
        paths += f'<path fill="{TEAL}" d="{LEFT}"/><path fill="{CORAL}" d="{RIGHT}"/>'
    return f'<g transform="translate(0 -2) scale(4)">{paths}</g>'

def icon(square=False, small=False):
    return svg(256, 256, f'<rect width="256" height="256" rx="{0 if square else 56}" fill="{INK}"/>' + symbol(PAPER if small else None),
               'BookWiz app icon')

def symbol_asset(color=None, title='BookWiz symbol'):
    return svg(200,160,f'<g transform="translate(-28 -50)">{symbol(color)}</g>',title)

def wordmark(color=INK):
    def rounded(path):
        return re.sub(r'-?\d+(?:\.\d+)?',lambda match:format(float(match[0]),'.2f').rstrip('0').rstrip('.') if '.' in match[0] else match[0],path)
    return ''.join(f'<path transform="translate({offset} 0)" d="{rounded(path)}"/>' for offset, path in WORDMARK)

def horizontal(color=None):
    text = f'<g fill="{color or INK}" transform="translate(160 118) scale(.108 -.108)">{wordmark()}</g>'
    return svg(624, 160, f'<g transform="translate(-20 -12) scale(.72)">{symbol(color)}</g>'+text,
               'BookWiz horizontal logo', 'BookWiz, with an open folded-book W mark and an outlined wordmark.')

def wordmark_svg(color=INK):
    return svg(472, 128, f'<g fill="{color}" transform="translate(8 96) scale(.108 -.108)">{wordmark()}</g>',
               'BookWiz wordmark', 'BookWiz in custom-spaced outlined DM Sans lettering.')

def png_chunk(kind, data):
    return struct.pack('>I', len(data))+kind+data+struct.pack('>I', zlib.crc32(kind+data)&0xffffffff)

def png(width, height, rgba, opaque=False):
    channels = 3 if opaque else 4
    stride = width*4
    rows = []
    for y in range(height):
        row = rgba[y*stride:(y+1)*stride]
        if opaque:
            if any(a != 255 for a in row[3::4]):
                raise ValueError('Opaque native icons must cover every pixel.')
            rgb = bytearray(width*3);rgb[0::3]=row[0::4];rgb[1::3]=row[1::4];rgb[2::3]=row[2::4];row=bytes(rgb)
        rows.append(b'\0'+row)
    return (b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR', struct.pack('>IIBBBBB',width,height,8,2 if opaque else 6,0,0,0))+
            png_chunk(b'IDAT',zlib.compress(b''.join(rows),9))+png_chunk(b'IEND',b''))

RENDER = """const fs=require('node:fs');const {Resvg}=require('@resvg/resvg-js');
const input=fs.readFileSync(process.argv[1],'utf8');
const r=new Resvg(input,{fitTo:{mode:'width',value:Number(process.argv[2])}}).render();
const h=Buffer.alloc(8);h.writeUInt32BE(r.width,0);h.writeUInt32BE(r.height,4);
process.stdout.write(Buffer.concat([h,Buffer.from(r.pixels)]));"""

def raster(content, width, opaque=False):
    with tempfile.TemporaryDirectory(prefix='bookwiz-brand-') as folder:
        path = Path(folder)/'source.svg';path.write_text(content)
        try:
            result = subprocess.run(['node','-e',RENDER,str(path),str(width)],cwd=ROOT,check=True,capture_output=True)
        except FileNotFoundError as error:
            raise ValueError('Install Node.js 24 and run npm ci --ignore-scripts before regenerating brand assets.')from error
        except subprocess.CalledProcessError as error:
            if b"Cannot find module '@resvg/resvg-js'" in error.stderr:
                raise ValueError('Run npm ci --ignore-scripts in the repository root to install the existing @resvg/resvg-js renderer.')from error
            raise ValueError('The SVG renderer failed: '+error.stderr.decode(errors='replace').strip()[-1200:])from error
    if len(result.stdout)<8:raise ValueError('The SVG renderer returned no image header.')
    w,h=struct.unpack('>II',result.stdout[:8]);data=result.stdout[8:]
    if len(data)!=w*h*4:raise ValueError('Unexpected renderer output size.')
    return png(w,h,data,opaque)

def ico(images):
    offset=6+16*len(images);headers=[];payload=[]
    for size,data in images:
        headers.append(struct.pack('<BBBBHHII',0 if size==256 else size,0 if size==256 else size,0,0,1,32,len(data),offset))
        payload.append(data);offset+=len(data)
    return struct.pack('<HHH',0,1,len(images))+b''.join(headers)+b''.join(payload)

def icns(images):
    types={16:b'icp4',32:b'icp5',64:b'icp6',128:b'ic07',256:b'ic08',512:b'ic09',1024:b'ic10'}
    data=b''.join(types[size]+struct.pack('>I',len(image)+8)+image for size,image in images)
    return b'icns'+struct.pack('>I',len(data)+8)+data

def adaptive_path(path):
    # 64-unit master inset to Android's 108-unit adaptive-icon foreground.
    command='';values=[];out=[]
    for token in re.findall(r'[MLZ]|-?\d+(?:\.\d+)?',path):
        if token in ['M','L','Z']:
            command=token;out.append(token)
        else:
            value=float(token)*1.35+10.8
            out.append(f'{value:.2f}'.rstrip('0').rstrip('.'))
    return ' '.join(out)

def generate():
    generated={}
    def write(name,data):
        if isinstance(data,str):data=data.encode()
        path=ROOT/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        generated[name]=hashlib.sha256(data).hexdigest()
    assets={
        'icon.svg':icon(),
        'brand-symbol.svg':symbol_asset(),
        'brand-symbol-ink.svg':symbol_asset(INK,'BookWiz ink symbol'),
        'brand-symbol-paper.svg':symbol_asset(PAPER,'BookWiz paper symbol'),
        'brand-icon-small.svg':icon(small=True),
        'brand-horizontal.svg':horizontal(),
        'brand-horizontal-paper.svg':horizontal(PAPER),
        'brand-wordmark.svg':wordmark_svg(),
        'brand-wordmark-paper.svg':wordmark_svg(PAPER),
    }
    for name,data in assets.items():write('dist/assets/'+name,data)
    write('Icons/icon.svg',assets['icon.svg'])
    cache={}
    for size in [16,24,32,48,64,128,180,192,256,512,1024]:
        cache[size]=raster(icon(small=size<=24),size)
    opaque1024=raster(icon(square=True),1024,True)
    opaque180=raster(icon(square=True),180,True)
    for size in [16,32]:
        write(f'dist/assets/favicon-{size}.png',cache[size]);write(f'Icons/favicon-{size}.png',cache[size])
    for size in [192,512]:
        write(f'dist/assets/icon-{size}.png',cache[size]);write(f'Icons/icon-{size}.png',cache[size])
    for base in ['dist/assets/','Icons/']:write(base+'apple-touch-icon.png',opaque180)
    write('dist/assets/brand-app-icon.png',opaque1024)
    write('Icons/app-icon-1024.png',cache[1024])
    for name in ['Icons/ios-app-icon.png','Icons/watch-app-icon.png','native/apple/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon.png','native/apple/Watch/Assets.xcassets/AppIcon.appiconset/AppIcon.png']:write(name,opaque1024)
    for name in ['Icons/android-launcher.png','native/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png']:write(name,cache[192])
    write('native/desktop/icons/icon.png',cache[1024])
    favicon=ico([(n,cache[n])for n in [16,32,48]])
    windows=ico([(n,cache[n])for n in [16,24,32,48,64,128,256]])
    for name in ['dist/assets/favicon.ico','Icons/favicon.ico']:write(name,favicon)
    for name in ['native/desktop/icons/icon.ico','Icons/windows-icon.ico']:write(name,windows)
    mac=icns([(n,cache[n])for n in [16,32,64,128,256,512,1024]])
    for name in ['native/desktop/icons/icon.icns','Icons/macos-icon.icns']:write(name,mac)

    # Android adaptive masks and Android 13 monochrome launchers use the same W.
    prefix='native/android/app/src/main/res/'
    foreground='<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">'
    foreground+=''.join(f'<path android:fillColor="{color}" android:pathData="{adaptive_path(path)}"/>'for color,path in [(PAPER,PAGE),(TEAL,LEFT),(CORAL,RIGHT)])+'</vector>\n'
    mono=f'<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#FFFFFF" android:pathData="{adaptive_path(PAGE)}"/></vector>\n'
    write(prefix+'drawable/ic_launcher_foreground.xml',foreground)
    write(prefix+'drawable/ic_launcher_monochrome.xml',mono)
    write(prefix+'values/brand_colors.xml',f'<resources><color name="bookwiz_launcher_background">{INK}</color></resources>\n')
    for api in [26,33]:
        extra='<monochrome android:drawable="@drawable/ic_launcher_monochrome"/>'if api==33 else''
        write(prefix+f'mipmap-anydpi-v{api}/ic_launcher.xml','<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/bookwiz_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/>'+extra+'</adaptive-icon>\n')

    tv='native/apple/TV/Assets.xcassets/AppIcon.brandassets/'
    for stack,w,h in [('AppIcon.imagestack',400,240),('AppIconLarge.imagestack',1280,768)]:
        side=round(h*.86);x=(w-side)/2;y=(h-side)/2
        front=svg(w,h,f'<g transform="translate({x} {y}) scale({side/256})">{symbol()}</g>','BookWiz TV symbol')
        back=svg(w,h,f'<rect width="{w}" height="{h}" fill="{INK}"/>','BookWiz TV background')
        write(tv+stack+'/Front.imagestacklayer/Content.imageset/image.png',raster(front,w))
        write(tv+stack+'/Back.imagestacklayer/Content.imageset/image.png',raster(back,w,True))
    for target,w in [('TopShelf.imageset',1920),('TopShelfWide.imageset',2320)]:
        width=1040;scale=width/624;x=(w-width)/2;y=(720-160*scale)/2
        content=f'<rect width="{w}" height="720" fill="{INK}"/><g transform="translate({x} {y}) scale({scale})"><g transform="translate(-20 -12) scale(.72)">{symbol()}</g><g fill="{PAPER}" transform="translate(160 118) scale(.108 -.108)">{wordmark()}</g></g>'
        write(tv+target+'/image.png',raster(svg(w,720,content,'BookWiz TV writing room'),w,True))

    manifest={'name':'BookWiz','direction':'A folded open book that forms W; paper, ink, teal and coral.','font':'DM Sans 550, outlined; bundled font licensed SIL OFL 1.1.',
              'palette':[{'name':n,'hex':c}for n,c in [('Ink',INK),('Paper',PAPER),('Teal',TEAL),('Coral',CORAL)]],
              'assets':[{'id':name.removesuffix('.svg').removesuffix('.png'),'label':label,'src':'assets/'+name,'type':'image/svg+xml'if name.endswith('.svg')else'image/png','background':bg}for name,label,bg in [
                  ('icon.svg','App icon','paper'),('brand-symbol.svg','Folded-book symbol','ink'),('brand-symbol-ink.svg','Ink monochrome','paper'),('brand-symbol-paper.svg','Paper monochrome','ink'),
                  ('brand-horizontal.svg','Horizontal logo','paper'),('brand-horizontal-paper.svg','Reversed horizontal logo','ink'),('brand-wordmark.svg','Outlined wordmark','paper'),('brand-wordmark-paper.svg','Reversed wordmark','ink'),
                  ('brand-icon-small.svg','Small-size icon','paper'),('icon-512.png','Web and desktop icon','paper'),('brand-app-icon.png','Opaque Apple app icon','paper')]]}
    write('dist/assets/brand-manifest.json',json.dumps(manifest,indent=2)+'\n')
    output={'format':1,'application':'BookWiz','generator':'tools/generate-brand.py','files':generated}
    (ROOT/'Icons/BRAND-MANIFEST.json').write_text(json.dumps(output,indent=2)+'\n')
    return generated

def check():
    manifest=json.loads((ROOT/'Icons/BRAND-MANIFEST.json').read_text())
    for name,sha in manifest['files'].items():
        if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=sha:raise ValueError('Brand file changed: '+name)
    if (ROOT/'dist/assets/icon.svg').read_text()!=icon():raise ValueError('Brand master differs from generator.')
    return manifest['files']

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    try:
        files=check()if args.check else generate();print(f'{len(files)} BookWiz brand assets '+('verified.'if args.check else'generated.'))
    except (ValueError,OSError,subprocess.CalledProcessError)as error:parser.exit(1,str(error)+'\n')
