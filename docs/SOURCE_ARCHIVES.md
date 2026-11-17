<div align="center">

# Explore the source

**Read it. Run it. Make a thoughtful contribution.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

The official source lives at [muneebwanee/BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial). GitHub forks for study and non-commercial upstream contributions follow the [project license](../LICENSE).

## Pick the scope

| Archive | Contents |
| :--- | :--- |
| `source-android.zip` | The shared studio and Android host. |
| `source-ios.zip` / `source-watchos.zip` / `source-tvos.zip` | The shared studio and Apple project, including its related targets. |
| `source-windows.zip` / `source-macos.zip` / `source-linux.zip` | The shared studio and desktop host. |
| `source-web.zip` | The browser studio without native hosts or installer downloads. |

## After extraction

Choose an edition from the repository's source ZIPs. GitHub's automatic “Source code” download contains the repository layout, including these archives; extract the chosen `source-*.zip` inside it to reach the application source.

The archive root contains `README.md`, `package.json`, `dist/`, `docs/`, `tools/`, and `tests/`, plus the relevant `native/` directory. `SOURCE-MANIFEST.json` identifies the platform, source commit, and checksum of every included file. The public studio guide is retained under `docs/STUDIO_README.md` in platform editions.

Follow [Building BookWiz](BUILDING.md) to run a local copy or compile an edition. Build automation lives under `packaging/github/`; matching workflow files are also provided alongside platform archives. These are source and build definitions, rather than application installers.

## What stays out

Source archives exclude manuscripts, API keys, signing identities, local browser data, dependency caches, generated native web copies, and downloaded installers. They use ordinary DEFLATE ZIP compression and include the required third-party notices.

Share an improvement through a pull request to the official project. [Contributing →](../CONTRIBUTING.md)

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
