<div align="center">

# BookWiz Atelier

**Literary type. Quiet surfaces. Precise controls.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

BookWiz takes its identity from the objects on a writing desk: paper, ink, book cloth, a cover, and the space around a sentence. Expressive artwork belongs to the book; the surrounding interface gives it room.

The app mark is a folded open book forming a **W**. Cyan and coral page folds meet on a deep blue tile, with pale paper faces and a dark spine. Its geometry stays clear at favicon size and carries through app icons, the gallery and the creator film. The mark is independent of the software release number.

## Color and type

| Element | Direction |
| :--- | :--- |
| **Default room** | Graphite at night, warm ivory text, charcoal panels, and a restrained coral accent. |
| **Theme collection** | Graphite, Ivory, Crimson, Forest, Cobalt, Ocean, Amber, Cocoa, Rose, and Slate, each with light and dark editions. |
| **Literary voice** | Locally bundled Lora, Literata, Source Serif, and companion multilingual book fonts. |
| **Controls** | Device-aware shapes and spacing, with locally bundled interface fonts. |

`dist/themes.js` owns the semantic colors. Interface themes stay separate from a book's cover design. No remote font service is required.

## The room's structure

The library leads with real books and the current working chapter. A separate masthead sits above the scrolling page. Desktop navigation can collapse; smaller screens use a dismissible drawer and reachable controls. Focus and reading views let the manuscript occupy the room.

Settings has four destinations: **Profile**, **Appearance**, **Writing**, and **Data & privacy**. Secondary chapter actions live in **Book tools**. Safe-area insets are applied once, keeping native status bars, mobile controls, and the writing surface apart.

## State deserves care

Theme changes preserve current input. Navigation remembers the working page. Undo/redo and saved versions provide distinct ways back. Story changes flag existing chapters for review instead of silently rewriting them.

Loading text, elapsed time, and chapter checkpoints describe actual work. Decorative motion settles quickly; reduced-motion preferences keep it still. A model failure leaves recoverable text and completed planning steps available.

## A cover is a composition

The cover studio contains 32 original directions with editable typography, geometry, color, artwork, and physical trim. Previews and exports share the same renderer. SVG and EPUB covers carry their selected fonts and license notices. Front and back remain part of the same design.

Contributions should preserve readable contrast, visible focus, keyboard access, touch targets, and comfortable motion. See [Contributing](CONTRIBUTING.md).

## A lasting identity

The folded pages form a W beneath a small star: a compact open-book mark for BookWiz’s app icon, favicon and native launch identity. Jewel blue, coral, cyan and a warm gold detail give the installed app a distinctive presence. The simplified favicon keeps the same recognizable silhouette at small sizes. The master is `dist/assets/icon.svg`; all installed icons come from it. Apple app icons use an opaque RGB background; desktop and browser icons retain appropriate transparency.

The library puts the working book and bookshelf first. Quotes and activity follow the books. Lora carries literary titles; DM Sans and native platform controls keep operations concise. The interface has one clear action per group, 44-point touch targets, legible fields, and a consistent stroke family.

The manuscript has its own scroll surface. Formatting controls and the chapter footer stay in reach; each chapter keeps its scroll position across navigation. Phone toolbars use two scrollable rows. When the keyboard opens, secondary navigation recedes. Focus mode removes the dock.

Motion explains changes. Headings settle word by word in a short, softened reveal. A single ink path resolves on the working-book surface, and opening a character sheet brings its fields into place. The prose, caret and editing surface never animate while typing. Operating-system and app reduced-motion settings suppress these effects. Motion finishes promptly, with no continuous decorative loops.

Support is a full screen with verified payment links, a copyable Bitcoin address, contributor links and troubleshooting. Downloads always open GitHub Releases, including Android.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>

## A possible continuation

Draft Flow keeps the existing chapter and an uncommitted continuation in separate paper panels. Its pacing, detail and dialogue controls use the current platform’s control style and BookWiz’s semantic colors. A quieter card radius keeps pill-shaped buttons from rounding the manuscript panels. Story pins highlight matching text, and the playhead distinguishes a retained prefix from the next possible turn. Streaming motion is confined to a small line motif; reduced-motion preferences keep it still.
