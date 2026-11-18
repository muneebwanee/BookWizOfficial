<div align="center">

# BookWiz for the web

**Your browser becomes a writing room.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

Build this edition directly from a clone of BookWizOfficial, using the repository root that contains `package.json`. The optional `source-web.zip` snapshot also contains a self-contained edition for people who prefer an archive.

## The browser studio

Plan, draft, revise, design covers, proof, and export from a responsive browser workspace. Fonts and parser resources are bundled locally. After a successful visit in a supporting secure browser, cached application assets can work offline; provider requests still need their service.

## Run a local copy

```sh
npm ci --ignore-scripts
python3 -m http.server 4173 --directory dist --bind 127.0.0.1
```

Open **http://localhost:4173**. Browser storage belongs to that address. JSON backups move books between addresses and devices.

## This source edition

`dist/` contains the studio. The full repository also includes every native host; the separate web source snapshot omits those hosts and downloaded installers. `python3 tools/build-web.py` creates a web ZIP with `index.html` at its root for an HTTPS static host. The Apps page links to official Releases.

## Draft Flow

Explore a streamed continuation, pin story details, tune the prose and keep a passage when it belongs. Draft Flow follows this edition’s controls and your chosen theme. Its directions and previews stay with the chapter; model requests use your existing connections and require approval.

[Explore Draft Flow](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/docs/DRAFT_FLOW.md)

## Keep exploring

[Getting started](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/docs/GETTING_STARTED.md) · [Build guide](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/docs/BUILDING.md) · [Privacy](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/PRIVACY.md) · [Contribute](https://github.com/muneebwanee/BookWizOfficial/blob/HEAD/CONTRIBUTING.md)

Your original books belong to you. BookWiz claims no ownership or royalty in them. API connections remain optional and require sharing approval.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
