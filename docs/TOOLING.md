<div align="center">

# The workbench

**Small tools with clear jobs.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

The browser studio is written as JavaScript modules. Its fonts, PDF parser resources, QR generator, and compression library are bundled with the app. No contributor tool runs inside a reader's application.

| Tool | Job |
| :--- | :--- |
| Node.js 24 and npm | Dependencies, source checks, tests, and build orchestration. |
| Python 3 | Source archives, Android packaging, and Apple package validation. |
| JDK 21 and Android SDK tools | Compile, package, and verify APK/AAB output. |
| Electron and electron-builder | Desktop application packaging. |
| Xcode and XcodeGen | Apple projects and device archives. |
| Tectonic or XeLaTeX | Optional local manuscript typesetting. |

## Everyday checks

`npm run check` validates source syntax and offline assets. `npm test` covers manuscript behavior, data recovery, providers, exports, and device integration. Platform-specific Python checks cover archive integrity, Android downloads, and Apple binary packaging.

`node tools/version-cache.mjs` updates the offline shell fingerprint after static changes. `npm run vendor:pdf` refreshes copied PDF.js resources after an intentional library update. Third-party licenses remain with their assets.

The complete commands and prerequisites live in [Building BookWiz](BUILDING.md).

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
