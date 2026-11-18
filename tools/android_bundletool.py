#!/usr/bin/env python3
"""Fetch a pinned, checksum-verified bundletool without GitHub API requests."""
from __future__ import annotations

import hashlib
import http.client
import os
from pathlib import Path
import tempfile
import time
import urllib.error
import urllib.request

# Official google/bundletool release asset and its published SHA-256 digest.
VERSION = "1.18.3"
SHA256 = "a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29"
URL = f"https://github.com/google/bundletool/releases/download/{VERSION}/bundletool-all-{VERSION}.jar"
FILENAME = f"bundletool-all-{VERSION}.jar"
RETRY_STATUS = {429, 500, 502, 503, 504}
ATTEMPTS = 3
TIMEOUT = 30


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_bundletool(directory: Path) -> Path:
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / FILENAME
    if destination.is_file() and sha256(destination) == SHA256:
        return destination

    print(f"Downloading bundletool {VERSION} from its pinned release.", flush=True)
    for attempt in range(ATTEMPTS):
        temporary = None
        try:
            # Stage beside the destination so only a complete, verified download
            # can replace the cached JAR, including when a download is interrupted.
            with tempfile.NamedTemporaryFile(prefix=".bundletool-", suffix=".download", dir=directory, delete=False) as stream:
                temporary = Path(stream.name)
                request = urllib.request.Request(URL, headers={"User-Agent": "BookWiz-native-build"})
                with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                    for chunk in iter(lambda: response.read(1024 * 1024), b""):
                        stream.write(chunk)
            if sha256(temporary) != SHA256:
                raise ValueError(f"bundletool {VERSION} checksum mismatch; the downloaded JAR will not be used.")
            temporary.chmod(0o644)
            temporary.replace(destination)
            return destination
        except urllib.error.HTTPError as error:
            if error.code not in RETRY_STATUS or attempt == ATTEMPTS - 1:
                raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException):
            if attempt == ATTEMPTS - 1:
                raise
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        time.sleep(2 ** (attempt + 1))
    raise RuntimeError("bundletool download did not complete")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    print(ensure_bundletool(Path(os.environ.get("BOOKWIZ_ANDROID_SDK", root / ".build-tools"))))
