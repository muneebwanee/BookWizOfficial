<div align="center">

# One source. Every writing room.

**Clone BookWiz, make a focused change, and contribute directly.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Build guide](BUILDING.md) · [Contributing](../CONTRIBUTING.md)

</div>

---

The repository contains the full editable source tree **and** the existing platform ZIPs. A normal clone gives contributors the application, native hosts, build tools, tests, documentation, screenshots, and source archives together. There is no extra extraction step before working on the code.

## Find your place

| Path | What lives here |
| :--- | :--- |
| `dist/` | Shared browser writing studio, modules, styles, icons, fonts, and offline assets. This is editable application source. |
| `native/android/` | Android host and its platform resources. |
| `native/apple/` | iPhone/iPad, Widgets, Apple Watch, and Apple TV targets. |
| `native/desktop/` | Windows, macOS, and Linux desktop host and packaging configuration. |
| `tools/` | Build, export, compiler, cache, and platform packaging tools. |
| `tests/` | Application and packaging regression tests. |
| `scripts/` | Repository utilities, including the self-hosted star-history generator and archive importer. |
| `docs/` | Contributor guides, platform notes, and documentation assets. |
| `packaging/github/` | Build-workflow templates used by the platform source packager. |
| `.github/workflows/` | Active repository workflows, including the retained release builds. |
| `SOURCE-ORIGINS.json` | Current archive filenames, file counts, versions and SHA-256 hashes. |

## Start from a clone

```sh
git clone https://github.com/muneebwanee/BookWizOfficial.git
cd BookWizOfficial
npm ci --ignore-scripts
npm run check
npm test
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open **http://localhost:4173**. Use the [build guide](BUILDING.md) for a native edition.

## The retained ZIPs

| Archive | Distribution snapshot |
| :--- | :--- |
| `source-android.zip` | Shared studio and Android host. |
| `source-ios.zip`, `source-watchos.zip`, `source-tvos.zip` | Shared studio and the related Apple targets. |
| `source-windows.zip`, `source-macos.zip`, `source-linux.zip` | Shared studio and desktop host. |
| `source-web.zip` | Browser studio without native hosts. |

The eight root ZIPs are generated from the current editable source. **Refresh source archives** runs after source changes reach the default branch and updates every affected archive, its platform README, `SOURCE-ORIGINS.json`, root `SHA256SUMS.txt`, and the offline cache. It also follows successful **Star history** and **Add full source** runs, whose bot commits do not emit ordinary push-triggered Actions.

Every archive has a `SOURCE-MANIFEST.json` with its target and file hashes. Unchanged payloads retain their existing archive bytes and source reference, so the synchronization commit cannot make the next refresh regenerate everything again. The refresh retries from the latest branch head if another push arrives before it can commit.

For a local full-source checkout:

```sh
npm run sync:source
npm run check:archives
```

The first command updates the root downloads in place; the second verifies that they match the editable source without writing. `npm run package:source` remains available for a separate distribution directory and combined source bundle. `scripts/import_platform_sources.py` is the bootstrap importer for ZIP-only repositories; it validates all eight archives and preserves existing editable work.

## Automatic releases

Commit the complete update to the repository's default branch. Shared application, package, tool, test, licensing and documentation edits automatically start the **BookWiz · Platform** builds. Native host edits start the corresponding platform editions. Each successful build publishes a new release using the current checked-out source through `tools/prepare-build-source.py`; previously published releases remain available.

Archive synchronization and release builds follow the same source push. The generated archive commit uses `GITHUB_TOKEN`, which does not start a second round of Actions. Platform ZIP-only uploads still build through checksum-verified extraction when the editable source tree is absent. **Run workflow** remains available for an explicit rebuild or archive refresh.

Keep active release definitions in `.github/workflows/` and their `packaging/github/` templates together. If GitHub rejects the archive bot's commit, the refresh action reports the failed push; repository write permissions and branch rules must permit that generated-file commit. Release publication still requires each platform's checks, build and configured signing to succeed. `BUILD-INFO.json` records the actual source commit, source mode and source-manifest checksum.

## Code and content

`*.py`, `*.sh`, and other source files are **BWNCL**. `*.md` documentation, wordlists, regex catalogs, and rubrics are **CC BY 4.0**. Third-party licenses remain intact. [Read the boundary →](LICENSING.md)

---

**BookWiz · by muneebwanee**
