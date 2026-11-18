"""Exercise fresh downloads, verified cache use and network/download failures."""
import contextlib
import hashlib
import http.client
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("android_bundletool", ROOT / "tools/android_bundletool.py")
bundletool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bundletool)
CONTENT = b"verified test release asset"


class BundletoolDownloadChecks(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.destination = self.directory / bundletool.FILENAME
        self.addCleanup(patch.stopall)
        patch.object(bundletool, "SHA256", hashlib.sha256(CONTENT).hexdigest()).start()
        self.pause = patch.object(bundletool.time, "sleep").start()
        # Each test still checks the real filesystem and checksum implementation.
        self.capture = contextlib.redirect_stdout(io.StringIO())
        self.capture.__enter__()
        self.addCleanup(self.capture.__exit__, None, None, None)

    def assert_no_partial_downloads(self):
        self.assertEqual(list(self.directory.glob("*.download")), [])

    def test_empty_cache_downloads_pinned_asset_without_api_or_credentials(self):
        with patch.object(bundletool.urllib.request, "urlopen", return_value=io.BytesIO(CONTENT)) as download:
            self.assertEqual(bundletool.ensure_bundletool(self.directory), self.destination)
        request = download.call_args.args[0]
        self.assertEqual(request.full_url, "https://github.com/google/bundletool/releases/download/1.18.3/bundletool-all-1.18.3.jar")
        self.assertNotIn("Authorization", request.headers)
        self.assertEqual(download.call_args.kwargs, {"timeout": 30})
        self.assertEqual(self.destination.read_bytes(), CONTENT)
        self.assert_no_partial_downloads()

    def test_verified_cache_works_without_a_network_request(self):
        self.destination.write_bytes(CONTENT)
        with patch.object(bundletool.urllib.request, "urlopen", side_effect=AssertionError("network should not be used")):
            self.assertEqual(bundletool.ensure_bundletool(self.directory), self.destination)

    def test_corrupt_cache_is_replaced_only_after_a_verified_download(self):
        self.destination.write_bytes(b"corrupt cached jar")
        with patch.object(bundletool.urllib.request, "urlopen", return_value=io.BytesIO(CONTENT)):
            bundletool.ensure_bundletool(self.directory)
        self.assertEqual(self.destination.read_bytes(), CONTENT)
        self.assert_no_partial_downloads()

    def test_checksum_mismatch_is_rejected_and_not_promoted(self):
        for cached in [False, True]:
            with self.subTest(cached=cached):
                self.destination.unlink(missing_ok=True)
                if cached:
                    self.destination.write_bytes(b"previous corrupt cache")
                with patch.object(bundletool.urllib.request, "urlopen", return_value=io.BytesIO(b"truncated or substituted asset")):
                    with self.assertRaisesRegex(ValueError, "checksum mismatch"):
                        bundletool.ensure_bundletool(self.directory)
                if cached:
                    self.assertEqual(self.destination.read_bytes(), b"previous corrupt cache")
                else:
                    self.assertFalse(self.destination.exists())
                self.assert_no_partial_downloads()
        self.pause.assert_not_called()

    def test_transient_server_error_and_timeout_are_retried(self):
        failures = [urllib.error.HTTPError(bundletool.URL, 503, "busy", None, None), TimeoutError("timed out")]
        with patch.object(bundletool.urllib.request, "urlopen", side_effect=[*failures, io.BytesIO(CONTENT)]) as download:
            bundletool.ensure_bundletool(self.directory)
        self.assertEqual(download.call_count, 3)
        self.assertEqual([call.args[0] for call in self.pause.call_args_list], [2, 4])
        self.assertEqual(self.destination.read_bytes(), CONTENT)
        self.assert_no_partial_downloads()

    def test_permanent_http_error_is_not_retried(self):
        error = urllib.error.HTTPError(bundletool.URL, 403, "forbidden", None, None)
        with patch.object(bundletool.urllib.request, "urlopen", side_effect=error) as download:
            with self.assertRaises(urllib.error.HTTPError):
                bundletool.ensure_bundletool(self.directory)
        self.assertEqual(download.call_count, 1)
        self.pause.assert_not_called()
        self.assertFalse(self.destination.exists())
        self.assert_no_partial_downloads()

    def test_network_retries_stop_after_three_attempts(self):
        with patch.object(bundletool.urllib.request, "urlopen", side_effect=urllib.error.URLError("offline")) as download:
            with self.assertRaises(urllib.error.URLError):
                bundletool.ensure_bundletool(self.directory)
        self.assertEqual(download.call_count, 3)
        self.assertEqual(self.pause.call_count, 2)
        self.assertFalse(self.destination.exists())
        self.assert_no_partial_downloads()

    def test_interrupted_response_is_cleaned_up_before_retry(self):
        class Interrupted(io.BytesIO):
            def read(self, size):
                if self.tell():
                    raise http.client.IncompleteRead(b"partial", 100)
                return super().read(4)

        with patch.object(bundletool.urllib.request, "urlopen", side_effect=[Interrupted(CONTENT), io.BytesIO(CONTENT)]):
            bundletool.ensure_bundletool(self.directory)
        self.assertEqual(self.destination.read_bytes(), CONTENT)
        self.assertEqual(self.pause.call_count, 1)
        self.assert_no_partial_downloads()


if __name__ == "__main__":
    unittest.main()
