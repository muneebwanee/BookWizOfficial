# A window into your writing room

Choose **Preview studio** in BookWiz's navigation, or find it with **Ctrl/⌘ K**. The window contains the actual app with a separate sample library. Closing the preview returns to your working page.

## See it at the right size

Choose a page and viewport, then use **Fit window** to see the whole device frame. **100%**, **75%** and **50%** keep a chosen inspection scale; the stage scrolls when needed. Phone, small-phone, tablet and desktop presets retain their real CSS dimensions rather than squeezing the controls into a mock screenshot.

Explore the library, writing editor, Draft Flow, characters, worlds, notes, The Red Pen, Cover & publish, book proof, model hub and appearance settings. Switch between light/dark mode, all ten palettes and the five control profiles. **Reset sample** restores the demonstration books.

## Identity and motion

**Identity** shows the refined folded-book mark, small-size and monochrome cuts, outlined wordmarks, app artwork and palette. Its download links point to the actual bundled assets. [Brand files and regeneration](BRAND.md) describe the intended uses.

**Motion** plays three short, local sprite studies once per press. They end automatically and pause when the page becomes hidden. Both the operating system's and the app's reduced-motion preferences keep the effects still. The manuscript itself remains a steady reading surface.

## Your library stays in its own room

The embedded app replaces local/session storage with memory before loading BookWiz and seeds only sample material. It does not load your saved manuscripts or connections. Model requests, compiler calls, payments, exports, file imports and device actions are disabled inside the sample. If the host cannot provide that isolation, the preview stops with an explanation rather than opening the real library.

The preview is a view of the shared application. Native operating-system dialogs, home-screen widgets and notification delivery still require their supported installed edition.

## Run the preview from source

```sh
npm ci --ignore-scripts
npm run preview
```

Open **http://127.0.0.1:4188/preview.html** on the same computer. For a different local port, run `npm run preview -- --port 4193`. The built-in server serves bundled files read-only, binds to loopback, and rejects dotfiles, escaping paths, links outside the bundle and write requests. No external server or account is required.

Rebuild the three sprite atlases with `npm run build:effects`. Their source, pinned revision and MIT license are retained in `tools/vendor/pixelfx/` and `dist/licenses/pixelfx-MIT.txt`. [Building](BUILDING.md) and the [agent bundle guide](AGENT_SKILL.md) cover the other development workflows.
