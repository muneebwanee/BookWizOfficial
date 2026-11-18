"""Regression checks for real star snapshots and the repository-hosted SVG."""
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('star_history', ROOT / 'scripts/gen_star_history.py')
stars = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stars)
NOW = datetime(2026, 11, 18, 12, tzinfo=timezone.utc)


def repository(count):
    return {'full_name': 'muneebwanee/BookWizOfficial', 'created_at': '2026-11-17T00:00:00Z', 'stargazers_count': count}


def star(identity, stamp='2026-11-17T05:00:00Z'):
    return {'starred_at': stamp, 'user': {'id': identity, 'login': 'not-stored'}}


class StarHistory(unittest.TestCase):
    def test_empty_repository_has_no_invented_growth(self):
        snapshot = stars.make_snapshot(repository(0), [[]], NOW)
        svg = stars.render_svg(snapshot)
        self.assertEqual(snapshot['daily'], [])
        self.assertEqual(snapshot['stars'], 0)
        self.assertIn('Be part of the first chapter.', svg)
        self.assertNotIn('NaN', svg)
        ET.fromstring(svg)

    def test_pagination_is_deduplicated_and_only_aggregate_dates_are_saved(self):
        snapshot = stars.make_snapshot(repository(3), [[star(1), star(2)], [star(2), star(3, '2026-11-18T01:00:00Z')]], NOW)
        self.assertEqual(snapshot['daily'], [{'date': '2026-11-17', 'stars': 2}, {'date': '2026-11-18', 'stars': 3}])
        text = json.dumps(snapshot)
        self.assertNotIn('login', text)
        self.assertNotIn('not-stored', text)
        self.assertEqual(snapshot['basis'], 'current-stargazers-by-star-date')

    def test_invalid_or_inconsistent_api_data_is_rejected(self):
        for pages in [[['bad']], [[{'user': {'id': 1}}]], [[star(1, '2026-11-16T00:00:00Z')]], [[star(1, '2026-11-19T00:00:00Z')]], [[star(1), star(1, '2026-11-18T01:00:00Z')]]]:
            with self.subTest(pages=pages), self.assertRaises(ValueError):
                stars.make_snapshot(repository(1), pages, NOW)
        with self.assertRaises(ValueError):
            stars.make_snapshot(repository(2), [[star(1)]], NOW)

    def test_cli_handles_multiple_json_pages_without_slurp(self):
        class Result:
            returncode = 0
            stdout = '[{"starred_at":"one"}]\n[]\n'
        with patch.object(stars.subprocess, 'run', return_value=Result()) as command:
            pages = stars.gh_json('repos/example/project/stargazers?per_page=100', paginate=True)
            self.assertEqual(pages, [[{'starred_at': 'one'}], []])
            self.assertIn('--paginate', command.call_args.args[0])
            self.assertNotIn('--slurp', command.call_args.args[0])

    def test_zero_star_generation_uses_metadata_and_works_without_star_pages(self):
        with tempfile.TemporaryDirectory() as temp:
            svg, data = Path(temp) / 'chart.svg', Path(temp) / 'chart.json'
            with patch.object(stars.shutil, 'which', return_value='/usr/bin/gh'), patch.object(stars, 'gh_json', return_value=repository(0)) as api:
                stars.main(['--output', str(svg), '--data', str(data)])
            self.assertEqual(api.call_count, 1)
            self.assertEqual(json.loads(data.read_text())['stars'], 0)
            ET.fromstring(svg.read_text())

    def test_api_failure_keeps_existing_generated_files(self):
        with tempfile.TemporaryDirectory() as temp:
            svg, data = Path(temp) / 'chart.svg', Path(temp) / 'chart.json'
            svg.write_text('old svg')
            data.write_text('old data')
            with patch.object(stars.shutil, 'which', return_value='/usr/bin/gh'), patch.object(stars, 'gh_json', side_effect=RuntimeError('offline')):
                with self.assertRaises(RuntimeError):
                    stars.main(['--output', str(svg), '--data', str(data)])
            self.assertEqual(svg.read_text(), 'old svg')
            self.assertEqual(data.read_text(), 'old data')

    def test_small_and_large_charts_are_valid_self_contained_svg(self):
        for count in [1, 4, 23, 10001]:
            with self.subTest(count=count):
                snapshot = stars.make_snapshot(repository(count), [[star(i) for i in range(count)]], NOW)
                svg = stars.render_svg(snapshot)
                ET.fromstring(svg)
                self.assertNotIn('<script', svg)
                self.assertNotIn('https://', svg)
                self.assertNotIn('NaN', svg)
                self.assertIn(f'{count:,}', svg)


if __name__ == '__main__':
    unittest.main()
