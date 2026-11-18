<div align="center">

# Inside the native editions

**The shared writing room, connected to each device.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

## Application hosts

| Host | Source | Device integration |
| :--- | :--- | :--- |
| Android | `native/android/` | Java, system WebView, file pickers, widgets, reminders, printing, speech, and Back navigation. |
| Desktop | `native/desktop/` | Electron, local application protocol, native save/open dialogs, File menus, and print/PDF. |
| Apple | `native/apple/` | SwiftUI applications with WebKit, WatchConnectivity, widgets, speech, local transfer, and conditional Foundation Models support. |

Installed hosts bundle web assets locally. The web downloads directory is excluded so an application never contains another platform's installer.

## Apple project

`project.yml` defines **BookWiz-iOS**, **BookWiz-Widgets**, **BookWiz-Watch**, and **BookWiz-tvOS**. The iPhone app embeds Widgets and Watch. The Watch target uses `type: application` and `WKApplication`; the legacy WatchKit stub product is not used.

Each of the five widgets has a default-constructible `Widget` type and a shared configuration builder, provider, and view. Kind identifiers remain stable so existing home-screen widgets retain their identity. The app and Widgets extension share `group.com.muneebwanee.bookwiz` for progress. Manuscript text and credentials are excluded.

Apple archive validation checks device-platform markers and all slices of a universal Watch executable. A device archive and a simulator build are different artifacts. Bundle IDs are `com.muneebwanee.bookwiz`, `.widgets`, `.watchkitapp`, and `com.muneebwanee.bookwiz.tv`.

## Android widgets and PDF

Android offers nine widget providers with separate layouts and default sizes. Current-book and bookshelf links carry opaque book/chapter IDs; capture, goal, timer, weekly progress and publishing shortcuts open their own controls. Startup delivery waits until the studio has registered its listeners, including when the app was closed. See [Widgets](WIDGETS.md).

Native Android PDF export passes the chosen trim to the system print service as a custom media size, uses no extra system margin, and keeps the book’s own CSS margins. The print document omits screen proof wrappers and embeds bundled fonts. The native adapter reflows to the actual paper selected by the service, keeping readable type and the book’s margins when a service falls back to Letter. It does not shrink a trim-sized page into the center of the larger sheet. iOS also uses its native print sheet. Mobile PDF options explain LaTeX source export separately from the native PDF engine.

## Desktop packages

Windows has one NSIS installer containing x64 and ARM64 payloads. macOS has one universal DMG containing the Intel and Apple Silicon application. Linux retains AppImage and DEB because they serve different installation workflows.

The release publisher checks desktop package counts before publication, so each desktop release offers one clear application download.

## Native storage and permissions

Each installed edition has its own local library. System pickers handle backup opening and export destinations. Mobile reminders request notification access only when enabled. Speech uses installed engines; compatible Apple Intelligence uses the device model. Widgets share progress and an optional title, rather than prose.

See [Privacy](../PRIVACY.md) for the data flow, [Platform support](PLATFORMS.md) for edition features, and [Building BookWiz](BUILDING.md) for contributor commands.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
