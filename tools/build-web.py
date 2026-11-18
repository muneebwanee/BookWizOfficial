#!/usr/bin/env python3
"""Package the ready-to-host web studio with index.html at the ZIP root."""
import json,pathlib,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
release=root/'release';release.mkdir(exist_ok=True)
output=release/f'BookWiz-{version}-Web.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6)as archive:
    for source in sorted((root/'dist').rglob('*')):
        if source.is_file():archive.write(source,source.relative_to(root/'dist').as_posix())
    for name in ['LICENSE','PRIVACY.md','TERMS.md','SUPPORT.md','THIRD_PARTY_NOTICES']:
        archive.write(root/name,name)
    archive.writestr('HOSTING.md','BookWiz by muneebwanee\n\nExtract this package to an HTTPS static host, preserving all relative paths. index.html belongs at the site root. For a local preview, run: python3 -m http.server 4173 --bind 127.0.0.1\nOpen http://localhost:4173. Do not open index.html as a file. Existing local books stay tied to their original app/browser origin; export and import a JSON backup when moving to another address.\n')
with zipfile.ZipFile(output)as archive:
    if archive.testzip()is not None:raise RuntimeError('Web package integrity check failed.')
    assert 'index.html'in archive.namelist()
print(output)
