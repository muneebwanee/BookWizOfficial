#!/usr/bin/env python3
"""Offline project files and reader exports for BookWiz agents. BWNCL 1.0."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import re
import tempfile
import textwrap
import zipfile
from pathlib import Path, PurePosixPath

SKILL = Path(__file__).resolve().parents[1]
FORMAT = 'bookwiz-agent-project'
META = 'bookwiz.json'
MAX_FILE = 4 * 1024 * 1024
LANGUAGES = {'english': 'en', 'french': 'fr', 'spanish': 'es', 'german': 'de', 'italian': 'it', 'portuguese': 'pt', 'arabic': 'ar', 'urdu': 'ur', 'hebrew': 'he', 'persian': 'fa', 'hindi': 'hi', 'bengali': 'bn', 'japanese': 'ja', 'chinese': 'zh', 'turkish': 'tr'}


def slug(value):
    result = re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')
    return result[:64] or 'book'


def dump(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def atomic_write(path, data, overwrite=False):
    path = Path(path)
    if path.exists() and not overwrite:
        raise ValueError('File already exists; choose another output: ' + str(path))
    if path.is_symlink():
        raise ValueError('Refusing to replace a symbolic link: ' + str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.bookwiz-', delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
    try:
        temporary.chmod(0o644)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def source_path(root, name):
    if not isinstance(name, str) or '\\' in name or '\0' in name:
        raise ValueError('Chapter paths must be relative POSIX paths.')
    relative = PurePosixPath(name)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts or ':' in name:
        raise ValueError('Unsafe chapter path: ' + name)
    target = root.joinpath(*relative.parts)
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Chapter path leaves the project: ' + name)
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Project source cannot be a symbolic link: ' + name)
    return target


def read_text(path):
    if not path.is_file() or path.stat().st_size > MAX_FILE:
        raise ValueError('Missing or oversized project file: ' + str(path))
    return path.read_text(encoding='utf-8-sig')


def word_count(text):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    return len(re.findall(r"[^\W_]+(?:['’\-][^\W_]+)*", text, re.UNICODE))


def project(root):
    root = Path(root).resolve()
    path = root / META
    if path.is_symlink():
        raise ValueError('Project metadata cannot be a symbolic link.')
    try:
        data = json.loads(read_text(path))
    except json.JSONDecodeError as error:
        raise ValueError('Invalid bookwiz.json: ' + str(error)) from error
    if not isinstance(data, dict) or data.get('format') != FORMAT or data.get('version') != 1:
        raise ValueError('Expected a BookWiz agent project, format version 1.')
    book = data.get('book')
    if not isinstance(book, dict):
        raise ValueError('The project needs a book object.')
    for key in ['id', 'title', 'author', 'genre', 'language', 'premise', 'voice']:
        if not isinstance(book.get(key), str) or (key in ['id', 'title'] and not book[key].strip()):
            raise ValueError('Book field must be text: ' + key)
    if book.get('direction') not in ['ltr', 'rtl']:
        raise ValueError('Book direction must be ltr or rtl.')
    if not isinstance(book.get('wordTarget'), int) or isinstance(book['wordTarget'], bool) or not 1 <= book['wordTarget'] <= 2000000:
        raise ValueError('wordTarget must be an integer from 1 to 2,000,000.')
    chapters = data.get('chapters')
    if not isinstance(chapters, list) or not 1 <= len(chapters) <= 1000:
        raise ValueError('A project needs 1 to 1,000 chapters.')
    ids, paths = set(), set()
    for chapter in chapters:
        if not isinstance(chapter, dict):
            raise ValueError('Every chapter must be an object.')
        for key in ['id', 'title', 'file', 'summary', 'status']:
            if not isinstance(chapter.get(key), str):
                raise ValueError('Chapter field must be text: ' + key)
        if not chapter['id'] or chapter['id'] in ids or chapter['file'] in paths:
            raise ValueError('Chapter IDs and source paths must be unique.')
        if chapter['status'] not in ['planned', 'drafting', 'revising', 'ready']:
            raise ValueError('Unknown chapter status: ' + chapter['status'])
        path = source_path(root, chapter['file'])
        if path.suffix.lower() != '.md' or not chapter['file'].startswith('chapters/'):
            raise ValueError('Chapter sources must be Markdown under chapters/.')
        read_text(path)
        ids.add(chapter['id']); paths.add(chapter['file'])
    canon = data.get('canon')
    if not isinstance(canon, dict):
        raise ValueError('The project needs canonical facts, characters, worlds and a timeline.')
    for key in ['characters', 'worlds', 'facts', 'timeline']:
        if not isinstance(canon.get(key), list):
            raise ValueError('Canon field must be a list: ' + key)
    for key in ['characters', 'worlds']:
        if any(not isinstance(row, dict) or not isinstance(row.get('name'), str) or not isinstance(row.get('detail', ''), str) for row in canon[key]):
            raise ValueError('Characters/worlds need name and optional detail text.')
    for key in ['facts', 'timeline']:
        if any(not isinstance(row, str) for row in canon[key]):
            raise ValueError('Canon facts/timeline entries must be text.')
    publication = data.get('publication')
    if not isinstance(publication, dict) or any(not isinstance(publication.get(k, ''), str) for k in ['subtitle', 'imprint', 'dedication', 'preface', 'rights']):
        raise ValueError('Publication metadata must contain text values.')
    return root, data


def init(args):
    root = Path(args.directory).resolve()
    if root.exists() and (not root.is_dir() or any(root.iterdir())):
        raise ValueError('Initialization needs a new or empty directory; existing work is never replaced.')
    if not 1 <= args.chapters <= 1000 or not 1 <= args.target <= 2000000:
        raise ValueError('Choose 1–1,000 chapters and a positive word target up to 2,000,000.')
    if not args.title.strip():
        raise ValueError('A book title is required.')
    root.mkdir(parents=True, exist_ok=True)
    ident = hashlib.sha256((args.title + '\0' + args.author).encode()).hexdigest()[:12]
    language = LANGUAGES.get(args.language.lower(), args.language)
    direction = args.direction or ('rtl' if language.split('-')[0] in ['ar', 'ur', 'he', 'fa'] else 'ltr')
    data = {'format': FORMAT, 'version': 1,
            'book': {'id': 'book-' + ident, 'title': args.title, 'author': args.author, 'genre': args.genre, 'language': language, 'direction': direction, 'premise': '', 'voice': '', 'wordTarget': args.target},
            'chapters': [], 'canon': {'characters': [], 'worlds': [], 'facts': [], 'timeline': []},
            'publication': {'subtitle': '', 'imprint': '', 'dedication': '', 'preface': '', 'rights': ''}}
    for number in range(1, args.chapters + 1):
        name = f'chapters/{number:03d}-chapter.md'
        atomic_write(root / name, b'')
        data['chapters'].append({'id': f'chapter-{number:03d}', 'title': f'Chapter {number}', 'file': name, 'summary': '', 'status': 'planned'})
    for source in sorted((SKILL / 'templates').glob('*.md')):
        folder, filename = source.name.split('--', 1) if '--' in source.name else ('planning', source.name)
        atomic_write(root / folder / filename, source.read_bytes())
    atomic_write(root / META, dump(data))
    return {'project': str(root), 'chapters': args.chapters, 'message': 'Project created with empty manuscript files. Fill the brief and canon before drafting.'}


def status(args):
    root, data = project(args.directory)
    chapters = [{**{k: c[k] for k in ['id', 'title', 'status', 'file']}, 'words': word_count(read_text(source_path(root, c['file'])))} for c in data['chapters']]
    warnings = []
    if not data['book']['premise'].strip(): warnings.append('The premise is empty.')
    if not data['book']['author'].strip(): warnings.append('The author is empty.')
    empty = sum(c['words'] == 0 for c in chapters)
    if empty: warnings.append(f'{empty} chapter(s) have no manuscript text.')
    return {'valid': True, 'title': data['book']['title'], 'words': sum(c['words'] for c in chapters), 'wordTarget': data['book']['wordTarget'], 'chapters': chapters, 'warnings': warnings}


def add_chapter(args):
    root, data = project(args.directory)
    numbers = [int(c['id'][8:]) for c in data['chapters'] if re.fullmatch(r'chapter-\d+', c['id'])]
    number = max(numbers, default=0) + 1
    if len(data['chapters']) >= 1000 or not args.title.strip():
        raise ValueError('A nonempty title is required and a project may have at most 1,000 chapters.')
    name = f'chapters/{number:03d}-{slug(args.title)}.md'
    atomic_write(root / name, b'')
    data['chapters'].append({'id': f'chapter-{number:03d}', 'title': args.title, 'file': name, 'summary': args.summary, 'status': 'planned'})
    atomic_write(root / META, dump(data), overwrite=True)
    return {'chapter': data['chapters'][-1], 'message': 'Added an empty chapter; existing prose is unchanged.'}


def known_sources(root, data):
    files = {META: (root / META).read_bytes()}
    for c in data['chapters']:
        files[c['file']] = source_path(root, c['file']).read_bytes()
    for folder in ['planning', 'canon', 'revision', 'publication']:
        for path in sorted((root / folder).glob('*.md')):
            safe = source_path(root, path.relative_to(root).as_posix())
            files[path.relative_to(root).as_posix()] = safe.read_bytes()
    return files


def zip_bytes(files, epub=False):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w') as archive:
        names = ['mimetype'] + sorted(n for n in files if n != 'mimetype') if epub else sorted(files)
        for name in names:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_STORED if name == 'mimetype' else zipfile.ZIP_DEFLATED
            archive.writestr(info, files[name], compresslevel=9)
    return out.getvalue()


def snapshot(args):
    root, data = project(args.directory)
    files = known_sources(root, data)
    files['SNAPSHOT.json'] = dump({'format': 1, 'label': args.label, 'files': {n: hashlib.sha256(d).hexdigest() for n, d in files.items()}})
    stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    path = root / 'versions' / (stamp + '-' + slug(args.label) + '.zip')
    atomic_write(path, zip_bytes(files))
    return {'snapshot': str(path), 'files': len(files) - 1, 'message': 'Snapshot retained; no older versions were removed.'}


def context(args):
    root, data = project(args.directory)
    if not 1000 <= args.max_chars <= 100000:
        raise ValueError('Context budget must be between 1,000 and 100,000 characters.')
    index = next((i for i, c in enumerate(data['chapters']) if c['id'] == args.chapter), None)
    if index is None: raise ValueError('Unknown chapter ID: ' + args.chapter)
    chapter = data['chapters'][index]
    body = read_text(source_path(root, chapter['file']))
    previous = data['chapters'][index - 1] if index else None
    value = {'book': data['book'], 'canon': data['canon'], 'chapter': chapter, 'previousChapterSummary': previous['summary'] if previous else '', 'currentPassage': body[-6000:]}
    text = json.dumps(value, ensure_ascii=False, indent=2)
    if len(text) > args.max_chars:
        raise ValueError('Context exceeds the chosen budget. Summarize the canon or select a smaller passage; nothing was sent.')
    return {'characters': len(text), 'containsManuscript': bool(body), 'sentToModel': False, 'context': value}


def markdown(root, data):
    b = data['book']; p = data['publication']
    sections = ['# ' + b['title']]
    if p.get('subtitle'): sections.append(p['subtitle'])
    if b['author']: sections.append('By ' + b['author'])
    for key, title in [('rights', 'Publication information'), ('dedication', 'Dedication'), ('preface', 'Preface')]:
        if p.get(key): sections.append('## ' + title + '\n\n' + p[key])
    for c in data['chapters']:
        sections.append('## ' + c['title'] + '\n\n' + read_text(source_path(root, c['file'])).strip())
    return ('\n\n'.join(sections).rstrip() + '\n').encode('utf-8')


def paragraphs(text):
    # Text-first Markdown subset: retain every line without executing raw HTML.
    blocks = re.split(r'\n\s*\n', text.strip()) if text.strip() else []
    result = []
    for block in blocks:
        match = re.fullmatch(r'(#{1,6})\s+(.+)', block)
        if match:
            level = min(6, len(match[1]) + 1)
            result.append(f'<h{level}>' + html.escape(match[2]) + f'</h{level}>')
        else: result.append('<p>' + html.escape(block).replace('\n', '<br/>') + '</p>')
    return '\n'.join(result)


def backup(root, data):
    b = data['book']; p = data['publication']
    language_code = LANGUAGES.get(b['language'].lower(), b['language'])
    language_name = next((name.title() for name, code in LANGUAGES.items() if code == language_code.split('-')[0].lower()), b['language'])
    project_data = {'id': b['id'], 'title': b['title'], 'author': b['author'], 'genre': b['genre'], 'language': language_name, 'languageCode': language_code, 'direction': b['direction'], 'premise': b['premise'], 'styleGuide': b['voice'], 'target': b['wordTarget'], 'subtitle': p.get('subtitle', ''), 'imprintName': p.get('imprint', ''), 'dedication': p.get('dedication', ''), 'preface': p.get('preface', ''), 'sample': False, 'archived': False,
                    'chapters': [{'id': c['id'], 'title': c['title'], 'beat': c['summary'], 'text': paragraphs(read_text(source_path(root, c['file']))), 'status': {'planned': 'Planned', 'drafting': 'Drafting', 'revising': 'Revising', 'ready': 'Ready'}[c['status']]} for c in data['chapters']],
                    'characters': data['canon']['characters'], 'worlds': [{'id': 'world-' + str(i + 1), 'name': w['name'], 'detail': w.get('detail', '')} for i, w in enumerate(data['canon']['worlds'])], 'bible': [], 'notes': [], 'references': []}
    for i, fact in enumerate(data['canon']['facts']): project_data['bible'].append({'id': f'fact-{i + 1}', 'name': f'Canonical fact {i + 1}', 'type': 'Canon', 'detail': fact})
    for i, entry in enumerate(data['canon']['timeline']): project_data['notes'].append({'id': f'timeline-{i + 1}', 'title': 'Timeline', 'text': entry})
    return dump({'version': 1, 'projects': [project_data]})


def epub(root, data):
    b = data['book']; p = data['publication']; esc = html.escape
    language = LANGUAGES.get(b['language'].lower(), b['language'])
    if not re.fullmatch(r'[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*', language): language = 'und'
    direction = b['direction']
    def page(title, body):
        return ('<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' + esc(language) + '" xml:lang="' + esc(language) + '" dir="' + direction + '"><head><title>' + esc(title) + '</title><link rel="stylesheet" href="style.css"/></head><body>' + body + '</body></html>').encode()
    title_body = '<h1>' + esc(b['title']) + '</h1>'
    if p.get('subtitle'): title_body += '<p>' + esc(p['subtitle']) + '</p>'
    if b['author']: title_body += '<p>' + esc(b['author']) + '</p>'
    entries = [('title', 'Title page', title_body)]
    for key, title in [('rights', 'Publication information'), ('dedication', 'Dedication'), ('preface', 'Preface')]:
        if p.get(key): entries.append((key, title, '<h1>' + title + '</h1>' + paragraphs(p[key])))
    for index, chapter in enumerate(data['chapters'], 1):
        entries.append((f'chapter-{index}', chapter['title'], '<h1>' + esc(chapter['title']) + '</h1>' + paragraphs(read_text(source_path(root, chapter['file'])))))
    title_lines = textwrap.wrap(b['title'], width=26, break_long_words=True)[:7]
    cover_text = ''.join(f'<tspan x="300" dy="{48 if i else 0}">{esc(line)}</tspan>' for i, line in enumerate(title_lines))
    cover = ('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="' + esc(b['title']) + '"><rect width="600" height="900" fill="#f4eee2"/><path d="M72 100h456M72 760h456" stroke="#223b38" stroke-width="3"/><text x="300" y="260" text-anchor="middle" font-family="serif" font-size="38" fill="#223b38" direction="' + direction + '">' + cover_text + '</text><text x="300" y="710" text-anchor="middle" font-family="serif" font-size="22" fill="#223b38">' + esc(b['author']) + '</text></svg>').encode()
    files = {'mimetype': b'application/epub+zip', 'META-INF/container.xml': b'<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>', 'OEBPS/cover.svg': cover,
             'OEBPS/style.css': b'body{font-family:serif;line-height:1.65;margin:5%;}h1{font-size:1.8em;line-height:1.2;break-after:avoid;}p{orphans:2;widows:2;}img{max-width:100%;}'}
    files['OEBPS/cover.xhtml'] = page(b['title'], '<img src="cover.svg" alt="' + esc(b['title']) + '"/>')
    nav = '<h1>Contents</h1><nav epub:type="toc"><ol>' + ''.join('<li><a href="' + key + '.xhtml">' + esc(title) + '</a></li>' for key, title, _ in entries) + '</ol></nav>'
    files['OEBPS/nav.xhtml'] = page('Contents', nav)
    for key, title, body in entries: files['OEBPS/' + key + '.xhtml'] = page(title, body)
    identifier = 'urn:bookwiz:' + b['id']
    manifest = '<item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>' + ''.join('<item id="' + key + '" href="' + key + '.xhtml" media-type="application/xhtml+xml"/>' for key, _, _ in entries)
    spine = '<itemref idref="cover"/><itemref idref="nav"/>' + ''.join('<itemref idref="' + key + '"/>' for key, _, _ in entries)
    opf = '<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">' + esc(identifier) + '</dc:identifier><dc:title>' + esc(b['title']) + '</dc:title><dc:creator>' + esc(b['author']) + '</dc:creator><dc:language>' + esc(language) + '</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest>' + manifest + '</manifest><spine page-progression-direction="' + direction + '">' + spine + '</spine></package>'
    files['OEBPS/package.opf'] = opf.encode()
    return zip_bytes(files, epub=True)


def export(args):
    root, data = project(args.directory)
    suffix = {'markdown': '.md', 'epub': '.epub', 'backup': '.json'}[args.format]
    output = (Path(args.output) if args.output else root / 'exports' / (slug(data['book']['title']) + suffix)).resolve()
    if not args.output and not output.is_relative_to(root / 'exports'):
        raise ValueError('Default exports must stay under exports/; remove the redirecting symbolic link or choose a separate --output location.')
    if output.is_relative_to(root) and not output.is_relative_to(root / 'exports'):
        raise ValueError('Project exports must go under exports/; source files are protected.')
    payload = {'markdown': markdown, 'epub': epub, 'backup': backup}[args.format](root, data)
    atomic_write(output, payload, overwrite=args.force)
    return {'output': str(output), 'format': args.format, 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(), 'warnings': status(args)['warnings']}


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    commands = p.add_subparsers(dest='command', required=True)
    command = commands.add_parser('init', help='Create an empty, editable writing project.')
    command.add_argument('directory'); command.add_argument('--title', required=True); command.add_argument('--author', default=''); command.add_argument('--genre', default='Fiction'); command.add_argument('--language', default='en'); command.add_argument('--direction', choices=['ltr', 'rtl']); command.add_argument('--chapters', type=int, default=3); command.add_argument('--target', type=int, default=50000); command.set_defaults(run=init)
    for name in ['validate', 'status']:
        command = commands.add_parser(name, help='Validate files and report actual progress.'); command.add_argument('directory'); command.set_defaults(run=status)
    command = commands.add_parser('add-chapter', help='Append a planned chapter without changing prose.'); command.add_argument('directory'); command.add_argument('--title', required=True); command.add_argument('--summary', default=''); command.set_defaults(run=add_chapter)
    command = commands.add_parser('snapshot', help='Retain a restorable ZIP of known project files.'); command.add_argument('directory'); command.add_argument('--label', default='Before revision'); command.set_defaults(run=snapshot)
    command = commands.add_parser('context', help='Prepare bounded local context; makes no model request.'); command.add_argument('directory'); command.add_argument('--chapter', required=True); command.add_argument('--max-chars', type=int, default=16000); command.set_defaults(run=context)
    command = commands.add_parser('export', help='Export Markdown, EPUB or an importable BookWiz backup.'); command.add_argument('directory'); command.add_argument('--format', choices=['markdown', 'epub', 'backup'], required=True); command.add_argument('--output'); command.add_argument('--force', action='store_true', help='Replace only the selected export, never source files.'); command.set_defaults(run=export)
    return p


def main(argv=None):
    p = parser(); args = p.parse_args(argv)
    try:
        result = args.run(args)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, OSError, UnicodeError, KeyError) as error:
        p.exit(1, 'BookWiz: ' + str(error) + '\n')


if __name__ == '__main__':
    raise SystemExit(main())
