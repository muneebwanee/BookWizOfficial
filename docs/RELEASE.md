<div align="center">

# Download BookWiz

**A small set of files, with a clear purpose for each.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases/latest) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

**BookWiz** is created and maintained by **muneebwanee**. Official downloads live under [BookWizOfficial Releases](https://github.com/muneebwanee/BookWizOfficial/releases/latest). Open the current release and choose the download for your device in its table.

## Choose the application

| File | For |
| :--- | :--- |
| `BookWiz-{version}-Windows-Setup.exe` | One Windows installer containing x64 and ARM64 applications. It selects the correct one during installation. |
| `BookWiz-{version}-macOS.dmg` | One universal Mac application for Intel and Apple Silicon. Open the disk image and move BookWiz to Applications. |
| `BookWiz-{version}-Linux-x86_64.AppImage` | A portable Linux x64 application. |
| `BookWiz-{version}-Linux-amd64.deb` | Debian/Ubuntu-family installation. |
| `BookWiz-{version}-Android.apk` or `-development.apk` | Direct Android installation; the filename distinguishes the build's signing mode. |
| `.aab` | The Android store bundle, rather than a file opened directly on a phone. |
| `.ipa` | An Apple device package. Installation requires a signed, provisioned build for the device or distribution channel. |
| `BookWiz-{version}-Web.zip` | The web edition, with `index.html` at the archive root. |

Release filenames include their version label; `{version}` above stands for that label.

The Watch companion is inside the paired iPhone application. A tvOS IPA belongs to Apple TV.

## How new releases arrive

A source update on the default branch prepares the next patch version and dispatches all editions from one immutable version tag. Every edition uses the same prepared version; each later source update advances the patch number. Rebuilding unchanged source keeps its version. Package metadata and the version embedded in each application are updated together before building.

**Refresh source archives** refreshes the eight source ZIPs, README files and checksums, then explicitly starts the platform builds. After a full-repository build succeeds, its final job explicitly queues **Publish current downloads** with `workflow_dispatch`; publication also remains available as a manual action. **Publish current downloads** waits for successful, verified packages from all eight editions, publishes one **BookWiz VERSION** download page, and removes older generated release pages and same-version duplicates only after the replacement is complete. Failed builds keep the existing downloads available. Git commits and source tags are retained. If a platform fails or is cancelled, run the central workflow again to retry it; successful/running builds for the same prepared commit are skipped. Manual creation of a release on GitHub does not itself bump application version files.

[Source and automation guide](SOURCE_ARCHIVES.md) · [Build guide](BUILDING.md)

## Other release files

**SHA256SUMS.txt** lists package hashes. **BUILD-INFO.json** records the version, source commit, architecture, and signing status. These are verification files, rather than extra copies of the app.

GitHub also adds **Source code (zip)** and **Source code (tar.gz)** to releases automatically. They are repository snapshots, not additional installers. Platform source archives are described in the [source guide](SOURCE_ARCHIVES.md).

<details>
<summary><strong>Verify a download</strong></summary>

On macOS, run `shasum -a 256 FILE`. On Linux, run `sha256sum FILE`. In Windows PowerShell, run `Get-FileHash FILE -Algorithm SHA256`. Compare the result with the corresponding entry in `SHA256SUMS.txt`.

</details>

## Installation notes

Current desktop packaging is unsigned; macOS packaging is not notarized. Operating-system checks can therefore appear. The release's build metadata identifies the package's signing state. Android updates require the same signing identity as the installed copy. Export a workspace backup before replacing an installation or changing devices.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
