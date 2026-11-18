<div align="center">

# Building BookWiz

**For readers who want to explore the source and contributors with a change in mind.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

## The browser studio

Use **Node.js 24**, npm, and Python 3. Clone the [official repository](https://github.com/muneebwanee/BookWizOfficial) and run these commands from its root, where `package.json`, `dist/`, `native/`, `tools/`, and `tests/` are already available. The retained platform ZIPs are optional distribution snapshots; contributors work directly in the editable tree.

```sh
npm ci --ignore-scripts
npm run check
npm test
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open **http://localhost:4173**. Browser modules need HTTP rather than a local-file URL. This address has its own local library.

## Desktop applications

Desktop packaging also needs Electron's install step, so use `npm ci` on the build machine, then prepare the local studio:

```sh
node tools/prepare-native.mjs --target desktop
```

| Build machine | Command |
| :--- | :--- |
| Windows | `npx electron-builder --config native/desktop/electron-builder.yml --win nsis --x64 --arm64 --publish never` |
| macOS | `npx electron-builder --config native/desktop/electron-builder.yml --mac dmg --universal --publish never` |
| Linux | `npx electron-builder --config native/desktop/electron-builder.yml --linux AppImage deb --x64 --publish never` |

The Windows target deliberately omits `${arch}` from the installer filename and combines x64/ARM64 in one NSIS installer. The Mac target merges Intel/Apple Silicon applications into one universal DMG. `release/` contains the resulting packages. The desktop application uses bundled web assets and Electron/Node built-ins; build-only npm modules are excluded from its ASAR. The package check rejects accidental dependencies before the universal Mac merge.

## Android

Use **JDK 21** with `JAVA_HOME` set to its installation.

```sh
python3 tools/setup-android.py
python3 tools/build-android.py
python3 tools/build-aab.py
```

The APK builder prepares the offline assets and compiled module. The AAB builder uses that module and a pinned, SHA-256-verified bundletool release. `BOOKWIZ_ANDROID_SDK` and `BOOKWIZ_RELEASE_DIR` override tool and output directories. `BOOKWIZ_VERSION_NAME` and `BOOKWIZ_VERSION_CODE` apply consistently to both formats.

<details>
<summary><strong>Signing configuration for custom builds</strong></summary>

Android builds use a local development key unless all four variables are supplied: `BOOKWIZ_ANDROID_KEYSTORE_BASE64`, `BOOKWIZ_ANDROID_KEYSTORE_PASSWORD`, `BOOKWIZ_ANDROID_KEY_ALIAS`, and `BOOKWIZ_ANDROID_KEY_PASSWORD`. The default key is retained under `.build-tools/signing/`; a changed key cannot update an installation signed with the previous one.

Apple signed exports use `APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, and `APPLE_PROFILES_ZIP_BASE64`, with `BOOKWIZ_APPLE_TEAM_ID` and a JSON `BOOKWIZ_APPLE_PROFILE_MAP`. `BOOKWIZ_APPLE_EXPORT_METHOD` selects the export method. iOS and Widgets profiles include `group.com.muneebwanee.bookwiz`.

</details>

## Apple applications

Use macOS, Xcode, and XcodeGen:

```sh
npm ci --ignore-scripts
node tools/prepare-native.mjs --target apple
xcodegen generate --spec native/apple/project.yml
python3 tools/check-apple-project.py --project native/apple/BookWiz.xcodeproj
```

Open the generated project in Xcode. **BookWiz-iOS** includes the Widgets extension and modern single-target Watch companion. **BookWiz-tvOS** is the TV application. Deployment targets are iOS/iPadOS 17, watchOS 10, and tvOS 17. Apple Intelligence is conditional on iOS/iPadOS 26 and a compatible device. Device IPA installation requires a suitable signing identity and provisioning.

## Checks and source archives

```sh
python3 scripts/check_docs.py
python3 tests/docs.test.py
python3 tests/android-bundletool.test.py
python3 tests/apple-package.test.py
python3 tests/platform-kits.test.py
python3 tools/package-platform-kits.py --output ../BookWiz-platform-sources
```

The documentation check validates local Markdown links and image references without contacting external websites. The committed star-history SVG and JSON are included in platform snapshots, so ordinary contributor checks do not require GitHub authentication. If regenerating the chart, run `gh auth login`, then `python3 scripts/gen_star_history.py` before checking or packaging the documentation.

The archive command includes platform code, shared assets, tests, documentation, and source manifests. The [source guide](SOURCE_ARCHIVES.md) describes the layout. Refresh static cache hashes after changing web assets with `node tools/version-cache.mjs`.

<details>
<summary><strong>Optional local PDF compiler</strong></summary>

Install a Unicode TeX engine through TeX Live, MacTeX, MiKTeX, or Tectonic, then run `npm run compiler`. The helper detects the engine and serves the studio at **http://localhost:4317**, with a health check at `/health` and PDF compilation at `/compile`. Desktop apps inspect installed engines directly. Set `BOOKWIZ_TEX_ENGINE` to a full executable path when needed. Choose **Connect this studio** in the compiler dialog to pair another browser origin for the current helper session. `BOOKWIZ_ALLOWED_ORIGIN` can also preconfigure an exact origin.

Arabic/Urdu support and its original LPPL license/source are bundled. CJK books use an installed Noto Serif CJK font. Tectonic can require its first TeX bundle download. Exported LaTeX bundles include the fonts and right-to-left support used by the book.

Run `BOOKWIZ_TEX_INTEGRATION=1 node --test tests/latex-service.test.mjs` on a machine with XeLaTeX to check real multilingual PDF output.

</details>

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
