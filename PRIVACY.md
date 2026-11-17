<div align="center">

# Privacy

**Your unpublished work deserves a private writing room.**

[BookWizOfficial](https://github.com/muneebwanee/BookWizOfficial) · [Downloads](https://github.com/muneebwanee/BookWizOfficial/releases) · [muneebwanee](https://github.com/muneebwanee)

</div>

---

**Effective November 16, 2026 · BookWiz by muneebwanee**

## At a glance

| Information | How BookWiz handles it |
| :--- | :--- |
| Books, chapters, profiles, worlds, and notes | Stored in the browser workspace or installed app's local storage. |
| API keys | Session memory by default; optional encrypted local persistence. |
| Application analytics and advertising | No application telemetry, analytics SDK, ads, or tracking pixels. |
| Model requests | Sent to the selected provider only after the described request or batch is approved. |
| Identity and payment details | No BookWiz account, API-credit checkout, or payment processing. |

## Books and local storage

Projects, chapter versions, references, preferences, story briefs, continuity notes, and revision proposals stay with the local workspace. Browser and installed-app libraries are separate. Changing browser, origin, device, or app does not move the library automatically.

Chapter undo/redo and navigation history use bounded session memory. Saved chapter versions and story profiles are included in book backups. Local caches may retain voice previews and parsed reference extracts; clearing a disposable cache does not delete books or saved connections. Static offline caches contain application assets, never API keys or provider responses.

Draft Flow stores its direction, story pins and up to eight uncommitted previews with each chapter. These stay on the device and are included in JSON backups. Opening Draft Flow or adjusting its controls with Live tuning off sends no text. A connected-model session requires approval before requests begin; Live tuning is limited to six preview requests per session. Uncommitted previews are excluded from manuscript, EPUB and print exports until you keep them.

## Credentials

Session-only API keys stay in memory until the session ends. Optional saved keys use AES-256-GCM encryption with a PBKDF2-SHA-256 derived key, independent random salt and IV, and 210,000 iterations. The vault passphrase is not stored, and BookWiz cannot recover it. An unlocked key is accessible to the running application; device security still matters.

## Local service discovery

The model hub automatically reads model-list metadata at the known loopback addresses for Ollama, LM Studio and llama.cpp. This check contains no manuscript, prompt, key or cloud request. The native Apple edition can ask its device framework whether the model is available. LaTeX discovery reads the local compiler’s capability/status endpoint; a manuscript is submitted only when **Compile PDF** is chosen. Desktop compilation and the local compiler process the source on the device. Desktop editions and the helper’s local studio can also relay an approved chat request to the selected loopback runtime; this does not send it to a BookWiz server.

## When words leave the device

Each model action describes its provider and the context before approval. A drafting batch includes its sequential requests and chosen limit; structured responses may include a bounded repair. Provider privacy terms, retention, regional processing, and charges apply.

Connection verification sends a short test prompt. Image generation sends cover instructions. References may contribute bounded extracts to approved context. Complete chapter revisions can include up to 60,000 characters from each selected chapter; continuity checks use excerpts. Suggestions stay editable until saved or accepted.

Compatible Apple Intelligence requests use the device framework when its model is available. Other local-model connections communicate with the service configured by the writer and may require local-network access.

## Speech and reminders

Installed speech engines do not require microphone access for read-aloud. Online voices require confirmation before text is shared. Optional Studio voices send the chosen sample or chapter in short requests through the writer's OpenAI API connection after separate approval. Audio uses temporary memory URLs and is released after playback; it is not added to the offline cache. Voice and speed preferences stay local.

Writing reminders are off by default. On supported mobile apps, enabling them requests notification access and schedules a two-week local window, refreshed when the app opens. Days, time, quiet hours, and pauses stay on the device. Reminders contain original writing notes, without manuscript text or book titles. Turning them off or erasing the workspace cancels pending reminders. Delivery follows operating-system settings; no push server or engagement tracking is used.

## Widgets and file access

Mobile widgets receive aggregate progress and session deadlines. A book title is shared only when its appearance preference is enabled. Manuscripts, reference files, and credentials are excluded. Apple's widgets use the app's shared App Group. Erasing the workspace clears shared progress.

File opening reads the backup chosen in the system picker and previews the import before adding copies. BookWiz does not request broad file access, location, contacts, camera, tracking, or microphone permission. System keyboard dictation follows the operating system's own privacy settings.

## Hosting and third parties

Fonts and application libraries are bundled locally. A website host can still process essential access, IP-address, request, and security logs under its terms. A selected API or online speech provider processes approved text under its policy. Application privacy does not remove records held by those services.

## Export, deletion, and questions

Use **Settings → Data & privacy** to export backups, clear disposable caches, or erase the local workspace. Backups exclude API secrets. Erasure cannot remove downloaded backups, another device's library, hosting logs, or records already held by a provider. Private browsing, storage clearing, or low-storage eviction can remove local work; independent backups remain important.

Questions can be raised through the [official project](https://github.com/muneebwanee/BookWizOfficial) or the private contact route on [my profile](https://github.com/muneebwanee). Keep private manuscripts and credentials out of public reports.

---

<div align="center">

BookWiz by **muneebwanee** · [Back to the project](https://github.com/muneebwanee/BookWizOfficial)

</div>
