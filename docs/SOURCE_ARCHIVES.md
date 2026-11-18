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

## Automatic releases and patch versions

Commit the complete update to the default branch. **Refresh source archives** first prepares one shared release version, synchronizes its metadata and archives, then commits the generated files. It pins that prepared commit to an immutable tag such as `bookwiz-v1.0.2` and dispatches all eight platform builds from that tag. Every edition therefore reports the same app version and builds the same prepared source, even if another upload advances the default branch.

A new source update increments the patch number: `1.0.2`, `1.0.3`, `1.0.4`. Rebuilding unchanged source keeps its version. An explicit higher minor or major version in `package.json` is respected. `release-state.json` records the source fingerprint and Apple build counter. Package metadata, the npm lockfile, Electron runtime, Apple project and citation metadata are synchronized together. Android retains its separate, increasing install version code.

The dispatcher skips builds already running, available successful artifacts, or an already published combined version. It rebuilds successful editions whose artifacts expired and retries failed or cancelled editions on another preparation run. Ordinary pushes to standalone platform workflows are reserved for ZIP-only repositories; full repositories use the central preparation job, avoiding old-version builds racing the version update. **Publish current downloads** waits for successful, verified packages from all eight editions, publishes one **BookWiz VERSION** download page, and removes older generated release pages and same-version duplicates only after the replacement is complete. Failed builds keep the existing downloads available. Git commits and source tags are retained.

Star-history data refreshes update source downloads without incrementing the app version or publishing another set of application builds. The generated commit uses `GITHUB_TOKEN`; the central job explicitly dispatches the intended builds because bot pushes do not emit ordinary push-triggered Actions. Workflow permissions include **Contents: write** for generated commits/tags and **Actions: write** for dispatch.

Keep `.github/workflows/` and `packaging/github/` definitions together. The dot-prefixed `.github` folder is required; templates alone do not enable Actions. **Run workflow** on **Refresh source archives** prepares or retries the release. An individual platform workflow can rebuild a prepared tag. A build publishes only after its checks, packages and configured signing succeed. `BUILD-INFO.json` records its actual commit, version and source-manifest checksum.

For a full local checkout, `npm run prepare:release` synchronizes version metadata, `npm run sync:source` refreshes downloads, and `npm run check:version` plus `npm run check:archives` verify the result. Merely creating a release in GitHub’s website does not change the version embedded in application files.

## Code and content

`*.py`, `*.sh`, and other source files are **BWNCL**. `*.md` documentation, wordlists, regex catalogs, and rubrics are **CC BY 4.0**. Third-party licenses remain intact. [Read the boundary →](LICENSING.md)

---

**BookWiz · by muneebwanee**

## One current download page

Platform jobs prepare checksummed artifacts without creating public release pages. **Publish current downloads** collects successful builds of the same prepared commit, verifies their package checksums and GitHub upload digests, and publishes one `bookwiz-vVERSION` release containing all eight editions. Reruns reuse the same page. Older generated releases and duplicate pages are deleted only after the complete new version is public; unrelated releases and source tags are retained.

If a platform fails, run **Refresh source archives** again to retry that edition. When all builds are green, **Publish current downloads** runs automatically; it can also be started manually to retry publication or cleanup. Failed uploads retain an unpublished draft and the previous public downloads. Keep both the active workflow files and their packaging templates current.
