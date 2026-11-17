<div align="center">

# Download BookWiz

**A small set of files, with a clear purpose for each.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

**BookWiz** is created and maintained by **muneebwanee**. Official downloads live under [BookWizOfficial Releases](https://github.com/muneebwanee/BookWizOfficial/releases). Choose the release for your device and the package below.

## Choose the application

| File | For |
| :--- | :--- |
| `BookWiz-{version}-Windows-Setup.exe` | One Windows installer containing x64 and ARM64 applications. It selects the correct one during installation. |
| `BookWiz-{version}-macOS.dmg` | One universal Mac application for Intel and Apple Silicon. Open the disk image and move BookWiz to Applications. |
| `BookWiz-{version}-Linux-x64.AppImage` | A portable Linux x64 application. |
| `BookWiz-{version}-Linux-x64.deb` | Debian/Ubuntu-family installation. |
| `BookWiz-{version}-Android.apk` or `-development.apk` | Direct Android installation; the filename distinguishes the build's signing mode. |
| `.aab` | The Android store bundle, rather than a file opened directly on a phone. |
| `.ipa` | An Apple device package. Installation requires a signed, provisioned build for the device or distribution channel. |
| `BookWiz-{version}-Web.zip` | The web edition, with `index.html` at the archive root. |

Release filenames include their version label; `{version}` above stands for that label.

The Watch companion is inside the paired iPhone application. A tvOS IPA belongs to Apple TV.

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
