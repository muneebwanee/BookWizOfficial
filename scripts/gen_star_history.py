#!/usr/bin/env python3
"""Render BookWiz's repository-hosted star history. Run gh auth login first."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
from html import escape
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REPO = 'muneebwanee/BookWizOfficial'


def gh_json(endpoint: str, *, paginate: bool = False):
    command = ['gh', 'api', '-H', 'Accept: application/vnd.github.star+json',
               '-H', 'X-GitHub-Api-Version: 2022-11-28', endpoint]
    if paginate:
        command += ['--paginate']
    for attempt in range(3):
        result = subprocess.run(command, capture_output=True, text=True, timeout=180)
        if result.returncode == 0:
            if not paginate:
                return json.loads(result.stdout)
            # gh --paginate emits one JSON array per page. Decode each array
            # without requiring the newer --slurp option.
            decoder, text, pages = json.JSONDecoder(), result.stdout.strip(), []
            while text:
                page, end = decoder.raw_decode(text)
                pages.append(page)
                text = text[end:].lstrip()
            return pages
        transient = any(code in result.stderr for code in ['HTTP 429', 'HTTP 500', 'HTTP 502', 'HTTP 503', 'HTTP 504'])
        if transient and attempt < 2:
            time.sleep(2 ** attempt)
            continue
        raise RuntimeError('GitHub could not return the star data. Check gh auth status and API rate limits. ' + result.stderr.strip()[:350])


def utc_date(value: str):
    stamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if stamp.tzinfo is None:
        raise ValueError('A GitHub timestamp is missing its time zone.')
    return stamp.astimezone(timezone.utc).date()


def make_snapshot(repository: dict, pages: list, now: datetime) -> dict:
    if repository.get('full_name') is None or not isinstance(pages, list):
        raise ValueError('Invalid repository or paginated star response.')
    created = utc_date(repository['created_at'])
    today = now.astimezone(timezone.utc).date()
    if created > today:
        raise ValueError('The repository creation date is in the future.')
    people = {}
    for page in pages:
        if not isinstance(page, list):
            raise ValueError('Expected an array for each GitHub stargazer page.')
        for star in page:
            if not isinstance(star, dict) or 'starred_at' not in star or not isinstance(star.get('user'), dict) or not isinstance(star['user'].get('id'), int):
                raise ValueError('GitHub did not return timestamped stargazers.')
            day = utc_date(star['starred_at'])
            if not created <= day <= today:
                raise ValueError('A star date falls outside this repository snapshot.')
            identity = star['user']['id']
            if identity in people and people[identity] != day:
                raise ValueError('The stargazer list changed during pagination; rerun to get a consistent snapshot.')
            people[identity] = day
    counts = Counter(people.values())
    running = 0
    daily = []
    for day, count in sorted(counts.items()):
        running += count
        daily.append({'date': day.isoformat(), 'stars': running})
    reported = repository.get('stargazers_count')
    if not isinstance(reported, int) or reported < 0 or reported != len(people):
        raise ValueError('The repository count and timestamped stargazer list differ. Rerun after the API settles; the previous chart has been preserved.')
    return {
        'schema': 1,
        'repository': repository['full_name'],
        'created_at': repository['created_at'],
        'updated_at': now.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z'),
        'basis': 'current-stargazers-by-star-date',
        'stars': len(people),
        'daily': daily,
    }


def nice_ceiling(value: int) -> tuple[int, int]:
    if value <= 4:
        return max(value, 1), 1
    rough = value / 4
    scale = 10 ** math.floor(math.log10(rough))
    step = next(x for x in [1, 2, 5, 10] if x * scale >= rough) * scale
    return int(math.ceil(value / step) * step), int(step)


def render_svg(snapshot: dict) -> str:
    created = utc_date(snapshot['created_at'])
    today = utc_date(snapshot['updated_at'])
    span = max((today - created).days, 1)
    left, right, top, bottom = 78, 898, 161, 329
    maximum, step = nice_ceiling(snapshot['stars'])
    x = lambda day: left + ((day - created).days / span) * (right - left)
    y = lambda count: bottom - count / maximum * (bottom - top)
    path = f'M {left:.2f} {bottom:.2f}'
    previous = 0
    for record in snapshot['daily']:
        day = utc_date(record['date'] + 'T00:00:00Z')
        px = x(day)
        path += f' H {px:.2f} V {y(record["stars"]):.2f}'
        previous = record['stars']
    path += f' H {x(today):.2f}'
    floor_path = path + f' L {x(today):.2f} {bottom} L {left} {bottom} Z'
    rows = []
    for value in range(0, maximum + 1, step):
        py = y(value)
        rows.append(f'<line x1="{left}" y1="{py:.2f}" x2="{right}" y2="{py:.2f}" class="grid"/><text x="{left-18}" y="{py+4:.2f}" text-anchor="end" class="axis">{value:,}</text>')
    labels = [(created, 'start')]
    if today != created:
        labels.append((today, 'end'))
    for day, anchor in labels:
        rows.append(f'<text x="{x(day):.2f}" y="356" text-anchor="{anchor}" class="axis">{day.strftime("%d %b %Y")}</text>')
    repository = escape(snapshot['repository'])
    stars = f'{snapshot["stars"]:,}'
    description = escape(f'{stars} current stargazers for {snapshot["repository"]}, grouped by the date they starred. Updated {today.isoformat()} UTC. Historical unstars are not available from this snapshot.')
    empty = '<text x="488" y="244" text-anchor="middle" class="empty">Be part of the first chapter.</text>' if not snapshot['stars'] else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 414" width="960" height="414" role="img" aria-labelledby="title description">
<title id="title">BookWiz star history</title><desc id="description">{description}</desc>
<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b45642" stop-opacity=".19"/><stop offset="1" stop-color="#b45642" stop-opacity=".015"/></linearGradient></defs>
<style>.paper{{fill:#fbf8f0;stroke:#dedbd2}}text{{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#243e48}}.eyebrow{{font-size:10px;letter-spacing:2px;fill:#69736b}}.headline{{font-family:Georgia,serif;font-size:29px}}.number{{font-size:35px;font-weight:650;letter-spacing:-1px}}.muted{{font-size:11px;fill:#6e766e}}.axis{{font-size:10px;fill:#727970}}.grid{{stroke:#e1dfd6;stroke-width:1;stroke-dasharray:3 6}}.empty{{font-family:Georgia,serif;font-size:19px;fill:#788075}}.line{{fill:none;stroke:#b45642;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}}@media(prefers-color-scheme:dark){{.paper{{fill:#17272f;stroke:#38474c}}text{{fill:#f3ece0}}.eyebrow,.muted,.axis{{fill:#b9c2bc}}.grid{{stroke:#394b51}}.empty{{fill:#b1bdb6}}.line{{stroke:#e0aa8c}}}}</style>
<rect x=".5" y=".5" width="959" height="413" rx="23" class="paper"/>
<text x="39" y="38" class="eyebrow">BOOKWIZ / COMMUNITY</text>
<text x="39" y="79" class="headline">A room, growing together.</text>
<text x="40" y="106" class="muted">{repository}</text>
<text x="903" y="71" text-anchor="end" class="number">{stars}</text>
<text x="901" y="94" text-anchor="end" class="muted">{'star' if snapshot['stars']==1 else 'stars'}</text>
{''.join(rows)}
<path d="{floor_path}" fill="url(#area)"/><path d="{path}" class="line"/>
<circle cx="{x(today):.2f}" cy="{y(previous):.2f}" r="4.5" fill="#b45642"/>{empty}
<text x="40" y="388" class="muted">Current stargazers, by star date · self-hosted</text>
<text x="903" y="388" text-anchor="end" class="muted">Updated {today.isoformat()} UTC</text>
</svg>
'''


def atomic_write(destination: Path, data: str):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=destination.parent, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(data)
    temporary.chmod(0o644)
    temporary.replace(destination)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default=DEFAULT_REPO)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/assets/star-history.svg')
    parser.add_argument('--data', type=Path, default=ROOT / 'docs/assets/star-history.json')
    args = parser.parse_args(argv)
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', args.repo):
        parser.error('--repo must be an owner/repository name.')
    if shutil.which('gh') is None:
        raise RuntimeError('Install GitHub CLI, then run gh auth login before regenerating the chart.')
    snapshot = None
    for attempt in range(3):
        repository = gh_json(f'repos/{args.repo}')
        if repository.get('full_name', '').casefold() != args.repo.casefold():
            raise ValueError('GitHub returned a different repository.')
        if repository.get('stargazers_count') == 0:
            pages = [[]]
        else:
            pages = gh_json(f'repos/{args.repo}/stargazers?per_page=100', paginate=True)
            repository = gh_json(f'repos/{args.repo}')
        try:
            snapshot = make_snapshot(repository, pages, datetime.now(timezone.utc))
            break
        except ValueError as error:
            if attempt == 2:
                raise error
            time.sleep(1)
    svg = render_svg(snapshot)
    atomic_write(args.data, json.dumps(snapshot, indent=2) + '\n')
    atomic_write(args.output, svg)
    print(f'Refreshed {args.output}: {snapshot["stars"]} stars; timestamps and chart stored in the repository.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError, OSError, subprocess.SubprocessError) as error:
        print(f'Star history: {error}', file=sys.stderr)
        raise SystemExit(1)
