<div align="center">

# Contributing

**Help make the writing room better.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

I welcome improvements that make BookWiz calmer, more dependable, or more useful to writers. A clear bug report, a careful accessibility fix, and a well-explained patch all matter.

## Begin with the problem

Use the official [issue tracker](https://github.com/muneebwanee/BookWizOfficial/issues) for reproducible bugs and focused ideas. For a substantial change, open a discussion in an issue before building it so we can agree on the behavior and scope.

## Make a contribution

1. Fork **muneebwanee/BookWizOfficial** and create a branch for one change.
2. Clone your fork and work directly in the repository: `dist/` contains the shared studio, and `native/` contains every platform host. Install dependencies and follow the [build guide](docs/BUILDING.md). Submit editable source changes; maintainers refresh distribution ZIPs when preparing releases.
3. Preserve existing books and preferences. Add a meaningful test for changes to data handling, exports, providers, or native packaging.
4. Run `npm run check` and `npm test`, plus the checks relevant to the platform you changed.
5. Open a pull request explaining the problem, the resulting behavior, and how you verified it. Include a screenshot when an interface change needs one.

## What I protect

| Principle | What it means in a contribution |
| :--- | :--- |
| **The writer stays in control** | No silent replacement of prose, canon, or saved preferences. |
| **Privacy is a default** | No tracking, hidden provider requests, shared API keys, or manuscripts in logs. |
| **Access matters** | Keyboard use, visible focus, touch targets, and reduced-motion behavior remain usable. |
| **A book is a real artifact** | Briefs, previews, covers, and exports must describe the same work. |

Keep secrets, personal manuscripts, signing keys, browser profiles, and generated installers out of contributions. Original or appropriately licensed fixtures are welcome.

## Contributors

BookWiz is created and maintained by [muneebwanee](https://github.com/muneebwanee). The repository's [contributors page](https://github.com/muneebwanee/BookWizOfficial/graphs/contributors) records the people whose changes have been merged.

Bug reports, accessibility observations, translations, documentation and reviewed code all help. Credit belongs to the contribution and its author; include any attribution required by the material you submit.

## License and credit

Code, including `*.py`, `*.sh`, and other source files, is [BWNCL](LICENSES/BWNCL-1.0.txt). Markdown documentation, wordlists, regex catalogs, and rubrics are [CC BY 4.0](LICENSES/CC-BY-4.0.txt). Submit each contribution under the license that applies to that material and retain required notices. Contributors retain their own copyright. GitHub forks for study and non-commercial upstream code contributions follow BWNCL; content reuse follows CC BY 4.0. [Read the exact boundary →](docs/LICENSING.md)

For a vulnerability, use the private contact guidance in [Support](SUPPORT.md).

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
