# BookWiz identity

The mark is an open, folded book that forms a **W**. This refinement keeps the familiar blue, teal and coral, simplifies the folds, and gives the wordmark clear spacing. The writing surface stays quiet; the identity belongs in navigation, app icons, opening pages and the preview studio.

## Choose an asset

| Use | File |
| :--- | :--- |
| App navigation and general icon | [App icon](../dist/assets/icon.svg) |
| Symbol on a dark surface | [Folded-book symbol](../dist/assets/brand-symbol.svg) |
| One-colour mark on a light surface | [Ink symbol](../dist/assets/brand-symbol-ink.svg) |
| One-colour mark on a dark surface | [Paper symbol](../dist/assets/brand-symbol-paper.svg) |
| Logo on a light surface | [Horizontal logo](../dist/assets/brand-horizontal.svg) |
| Logo on a dark surface | [Reversed horizontal logo](../dist/assets/brand-horizontal-paper.svg) |
| Wordmark only | [Ink wordmark](../dist/assets/brand-wordmark.svg) · [Paper wordmark](../dist/assets/brand-wordmark-paper.svg) |
| Small favicon or compact icon | [Small-size icon](../dist/assets/brand-icon-small.svg) |
| Opaque native app-icon master | [1024 px app icon](../dist/assets/brand-app-icon.png) |
| Asset names, backgrounds and palette | [Brand manifest](../dist/assets/brand-manifest.json) |

The horizontal logo has outlined letters, so it does not depend on a locally installed font or a network request. The small-size cut uses the single paper silhouette instead of three coloured folds; the 16 px favicon uses this cut.

## Palette and spacing

| Colour | HEX | Role |
| :--- | :--- | :--- |
| Ink | `#17354D` | Icon ground and mark on light backgrounds |
| Paper | `#F5F0E6` | Page silhouette and mark on dark backgrounds |
| Teal | `#78BEC7` | Left book fold |
| Coral | `#EBA58D` | Right book fold |

Keep clear space of at least one quarter of the symbol's visible width around a standalone mark. Keep the supplied horizontal lockup's proportions and spacing. At 16–24 px, use the small-size icon; from 32 px upward use the full app icon. Keep the symbol at least 16 px high and the horizontal logo at least 104 px wide. Avoid stretching, rotating, adding shadows or placing coloured folds against a busy background. Choose a supplied monochrome variant when colour reproduction is limited.

The brand palette does not replace a writer's chosen theme. App theme packs, reading fonts, accessibility preferences and manuscript typography remain independently configurable.

## Native icons

The generated iPhone, iPad and Watch icons are opaque RGB PNGs without pre-rounded corners; the operating system supplies its mask. Apple TV uses separate transparent foreground and opaque background layers, plus opaque top-shelf artwork. Android keeps the legacy launcher image and adds adaptive foreground/background resources and a monochrome foreground for supported launchers. Windows ICO files contain multiple genuine PNG sizes, while macOS ICNS files contain the corresponding icon-family sizes through 1024 px.

## Regenerate and check

From the repository root, after installing the existing development dependencies:

```sh
python3 tools/generate-brand.py
python3 tools/generate-brand.py --check
python3 tests/brand-assets.test.py
```

The generator uses Python's standard library and the project's existing `@resvg/resvg-js` package. It renders a fixed vector master and fixed wordmark outlines, so it needs no image service, downloaded font or system-font substitution. The full repository contains the native destinations and the integrity manifest used by `--check`; extracted platform kits contain only their own native destinations.

## Ownership and font credit

BookWiz's name, mark, generated icon artwork and source generator are first-party project assets governed by the [BookWiz license](../LICENSE). The wordmark's glyph outlines derive from bundled DM Sans at weight 550; retain its complete [SIL Open Font License](../dist/licenses/DM-Sans-OFL.txt). This guide is first-party documentation under [CC BY 4.0](LICENSING.md), by muneebwanee.
