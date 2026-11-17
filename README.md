<div align="center">

<img src="screenshots/bookwiz-icon.svg" width="88" height="88" alt="BookWiz">

# BookWiz

### Make room for your next book.

A private writing studio for the idea, the manuscript, and the finished pages.<br>
Created by **[muneebwanee](https://github.com/muneebwanee)**.

[![Stars](https://img.shields.io/github/stars/muneebwanee/BookWizOfficial?style=flat-square&color=b45642)](https://github.com/muneebwanee/BookWizOfficial/stargazers)
[![License](https://img.shields.io/badge/license-BWNCL-596957?style=flat-square)](LICENSE)

**[Get BookWiz](https://github.com/muneebwanee/BookWizOfficial/releases)** · [Explore the gallery](screenshots/README.md) · [Your first book](docs/GETTING_STARTED.md) · [Support the project](SUPPORT.md#support-the-project)

</div>

---

I built **BookWiz** to keep the whole life of a book in one thoughtful place: an uncertain idea, a cast that starts to feel real, the difficult middle, the careful revision, and the pages ready for a reader.

Your library lives on your device. Start writing without an account, keep your tools close, and connect a model of your choice when you want another perspective. There is no BookWiz cloud library, public feed, or application telemetry.

## The writing room, in motion

| The editorial film | From a thought to a book |
| :--- | :--- |
| **72 seconds** · A quiet room for ambitious books. | **60 seconds** · The library, the writing room, the world, and the finished pages. |
| [Watch the editorial film →](screenshots/BookWiz%20Explained.mp4) | [Watch the creator film →](screenshots/original.mp4) |

## A closer look

<p align="center">
  <a href="screenshots/README.md#android"><img src="screenshots/android/01-your-library.png" width="30%" alt="BookWiz on Android: your books within reach"></a>
  <a href="screenshots/README.md#ipad"><img src="screenshots/ipad/04-cover-studio.png" width="30%" alt="BookWiz on iPad: give words a cover"></a>
  <a href="screenshots/README.md#web"><img src="screenshots/web/02-writing-room.png" width="30%" alt="BookWiz on the web: Draft Flow continuation steering"></a>
</p>

**Nine device galleries. Five images each.** Explore the studio in carefully proportioned phone, tablet and laptop illustrations, with separate companion previews for Apple Watch and Apple TV. The [showcase notes](docs/SHOWCASE.md) identify the hardware and how each image was made.

[Open the complete showcase →](screenshots/README.md)

## From the first note to the final page

| Make space for… | Inside BookWiz |
| :--- | :--- |
| **The idea** | Shape a brief around your language, genre, voice, references, length and chapter outline. |
| **The manuscript** | Rich chapter editing, live word counts, focus mode, search, find and replace, undo/redo and saved versions. |
| **The next turn** | [Draft Flow](docs/DRAFT_FLOW.md): streamed continuation previews, story pins, live steering, a playhead and saved alternatives. |
| **The story** | Character sheets, named worlds, continuity notes and quick captures, kept with their book. |
| **The revision** | The Red Pen for close reading and optional model suggestions you can review before accepting. |
| **The object** | 32 cover directions, typography controls, page proofs, EPUB, Markdown, JSON, print/PDF and LaTeX source. |
| **The habit** | Writing sessions, word goals, read-aloud, theme choices, and widgets and reminders on supported mobile apps. |

Three original reading samples are included. Read them, edit them, or clear a space for your own work.

## Choose your edition

All official application downloads are in **[GitHub Releases](https://github.com/muneebwanee/BookWizOfficial/releases)**. The [download guide](docs/RELEASE.md) explains the package for each device.

| Edition | Package | Made for |
| :--- | :--- | :--- |
| **Windows** | One `Windows-Setup.exe` | An installer that selects x64 or ARM64 for your computer. |
| **macOS** | One `macOS.dmg` | A universal application for Intel and Apple Silicon. |
| **Linux** | `.AppImage` or `.deb` | Your preferred x64 desktop package. |
| **Android** | `.apk` | Phone and tablet installation; `.aab` is the separate store bundle. |
| **iPhone & iPad** | `.ipa`, when available | An Apple package signed and provisioned for its installation channel. |
| **Apple Watch** | Companion in the iPhone app | Catch a thought and check your writing progress. |
| **Apple TV** | A tvOS `.ipa`, when available | Read, listen, review an outline, and bring a book over locally. |
| **Web** | Web release or source | A responsive browser studio, with offline application assets after caching. |

[Platform features →](docs/PLATFORMS.md) · [Source editions →](docs/SOURCE_ARCHIVES.md)

## Begin with one good page

1. **Make a book.** Choose its brief or import a BookWiz JSON backup.
2. **Give it a world.** Keep the premise, characters, places and chapter plan within reach.
3. **Write and return.** Work by hand, use a focused session, or approve an optional model request.
4. **Make an independent copy.** Proof the pages and export the format your next step needs.

**⌘/Ctrl K** searches your workspace. **⌘/Ctrl Shift F** opens focus mode. **Back to writing** returns to the working chapter.

## Your words stay yours

> Your original books belong to you. BookWiz takes no ownership or royalty in your manuscripts or original work. The software's non-commercial license is separate from your right to publish and sell your books.

Books, preferences and notes stay in local storage. API keys stay in memory unless you choose passphrase-protected encrypted storage. Backups exclude those keys. Each browser or app has its own library; **JSON backups** move your work between them.

Model connections are optional. The hub supports hosted providers and compatible endpoints, and detects running Ollama, LM Studio and llama.cpp services without sending manuscript text. Supported iPhone/iPad devices can use Apple Intelligence when its device model is available. Provider access, billing and language support vary.

[Privacy and data flow →](PRIVACY.md) · [Connections and local models →](docs/PROVIDERS.md)

## Explore, contribute, make it better

BookWiz is created and maintained by **[muneebwanee](https://github.com/muneebwanee)**. I welcome thoughtful bug reports, accessibility improvements, translations and focused contributions that make the room better for writers.

<p>
  <a href="https://github.com/muneebwanee"><img src="https://avatars.githubusercontent.com/u/43923614?v=4" width="56" height="56" alt="muneebwanee, creator and maintainer of BookWiz"></a>
</p>

**[Meet the contributors](https://github.com/muneebwanee/BookWizOfficial/graphs/contributors)** · [Contribution guide](CONTRIBUTING.md) · [Report a problem](https://github.com/muneebwanee/BookWizOfficial/issues/new)

The browser studio uses JavaScript modules and locally bundled assets. Native hosts add their platform features around the shared writing room.

```sh
git clone https://github.com/muneebwanee/BookWizOfficial.git
cd BookWizOfficial
python3 -m zipfile -e source-web.zip bookwiz-web
cd bookwiz-web
npm ci --ignore-scripts
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open **http://localhost:4173**. [Build and test the source →](docs/BUILDING.md)

## Cite BookWiz

For a report, course or research project, use the repository’s [citation metadata](CITATION.cff). GitHub’s **Cite this repository** action provides formatted citations for BookWiz by **muneebwanee**.

## Keep the room open

If BookWiz earns a place on your desk, your support helps me keep building it. A star, a useful issue or a careful contribution is welcome too.

**[Ko-fi](https://ko-fi.com/muneb)** · **[Buy Me a Coffee](https://www.buymeacoffee.com/muneebwanee)** · **[Liberapay](https://liberapay.com/muneeb/donate)** · **[Saweria](https://saweria.co/muneeb)**

**Bitcoin** · [Open in a wallet](bitcoin:36QW21MQQxUK7ohBQnvP5itipe4bFx91Bo)

```text
36QW21MQQxUK7ohBQnvP5itipe4bFx91Bo
```

[Support options and project help →](SUPPORT.md)

---

<div align="center">

**BookWiz · by muneebwanee**

[Getting started](docs/GETTING_STARTED.md) · [Design](DESIGN.md) · [Changelog](CHANGELOG.md) · [Privacy](PRIVACY.md) · [Terms](TERMS.md) · [License](LICENSE)

[Star BookWiz](https://github.com/muneebwanee/BookWizOfficial/stargazers) · [Fork the repository](https://github.com/muneebwanee/BookWizOfficial/fork)

</div>
