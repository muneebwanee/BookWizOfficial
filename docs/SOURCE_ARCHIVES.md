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
| `SOURCE-ORIGINS.json` | The source archives and hashes used to assemble the editable tree. |

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

The ZIPs remain available for the existing release workflows and people who prefer a platform-specific snapshot. The initial addition of editable source leaves every ZIP byte for byte intact. Existing releases, tags, and release assets are retained.

Contributors should change the editable files and submit a pull request. Maintainers can produce refreshed platform snapshots when preparing a release:

```sh
npm run package:source
```

This writes new archives and matching build files to `build/platform-sources/`. It does not replace the checked-in ZIPs or publish a release. Review and copy the intended snapshots into the repository as part of a release change; the existing ZIP-based release workflows still use the archives at the repository root.

Each platform snapshot contains a `SOURCE-MANIFEST.json` with its target and file hashes. `scripts/import_platform_sources.py` can validate and add missing editable files from all eight snapshots; it preserves existing editable files rather than overwriting contributors' work.

## Code and content

`*.py`, `*.sh`, and other source files are **BWNCL**. `*.md` documentation, wordlists, regex catalogs, and rubrics are **CC BY 4.0**. Third-party licenses remain intact. [Read the boundary →](LICENSING.md)

---

**BookWiz · by muneebwanee**
