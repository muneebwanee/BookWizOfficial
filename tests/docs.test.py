"""Validate linked documentation assets, including a freshly generated chart."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bookwiz_docs', ROOT / 'scripts/check_docs.py')
docs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(docs)


class Documentation(unittest.TestCase):
    def test_missing_chart_is_reported_then_resolves_when_generated(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'docs/assets').mkdir(parents=True)
            (root / 'docs/STAR_HISTORY.md').write_text('![Star history](assets/star-history.svg)')
            self.assertEqual(docs.check(root)['missing'], [{'document': 'docs/STAR_HISTORY.md', 'reference': 'assets/star-history.svg'}])
            (root / 'docs/assets/star-history.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
            self.assertEqual(docs.check(root)['missing'], [])

    def test_html_images_markdown_and_reference_links_are_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'docs').mkdir()
            (root / 'docs/guide.md').write_text('# Guide')
            (root / 'README.md').write_text('[Guide](docs/guide.md#guide)\n<img src="missing.svg">\n[details]: docs/missing.md\n')
            result = docs.check(root)
            self.assertEqual({r['reference'] for r in result['missing']}, {'missing.svg', 'docs/missing.md'})

    def test_spaces_queries_and_parent_directory_links_resolve(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'docs').mkdir()
            (root / 'README.md').write_text('Project')
            (root / 'docs/my guide.md').write_text('[Project](../README.md)')
            (root / 'docs/index.md').write_text('[A](<my guide.md>) [B](my%20guide.md?view=source#title)')
            self.assertEqual(docs.check(root)['missing'], [])

    def test_external_links_and_code_examples_are_not_fetched_or_checked(self):
        text = '''[Web](https://example.test/missing) [Wallet](bitcoin:address)
```md
[Example](not-a-project-file.md)
```
`[Inline](also-an-example.md)`
'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'README.md').write_text(text)
            result = docs.check(root)
            self.assertEqual(result['localReferences'], 0)
            self.assertEqual(result['missing'], [])

    def test_build_and_dependency_markdown_are_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ['node_modules', 'build', '.git']:
                (root / name).mkdir()
                (root / name / 'README.md').write_text('[Not project documentation](missing.md)')
            (root / 'README.md').write_text('# BookWiz')
            result = docs.check(root)
            self.assertEqual(result['markdownFiles'], 1)
            self.assertEqual(result['missing'], [])

    def test_links_cannot_escape_the_repository(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'project'
            root.mkdir()
            (root.parent / 'outside.md').write_text('Outside')
            (root / 'README.md').write_text('[Outside](../outside.md)')
            self.assertEqual(len(docs.check(root)['missing']), 1)


if __name__ == '__main__':
    unittest.main()
