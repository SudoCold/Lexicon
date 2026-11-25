# Lexicon

A Windows desktop vocabulary trainer built with Electron, React, and TypeScript. It includes **14,060 distinct offline words**, multiple-choice practice, “I don’t know,” spaced review, a searchable library, bookmarks, local progress, light/dark themes, and JSON backups. No account, API key, or internet connection is needed to use the built app.

## Open the app

Run `release/Lexicon-Setup-1.0.0.exe` for the Windows installer. You can also run `release/win-unpacked/Lexicon.exe` directly; keep that entire folder together.

The installer is unsigned. Windows may display its standard unknown-publisher prompt. No administrator installation is required when installing for the current user.

## Develop

Requirements: Windows 10/11 x64 and Node.js 24 LTS. Internet is required to download development dependencies and packaging tools, but not to use the resulting app.

```powershell
npm install
npm run desktop
```

`desktop` ensures the Electron binary is downloaded into a workspace-local cache, builds the UI, and launches the desktop edition. `npm run dev` starts a browser preview at http://127.0.0.1:5173. The preview uses browser local storage; the desktop edition uses SQLite. Use export/import to transfer progress between them.

```powershell
npm run build       # TypeScript check and production frontend build
npm test            # Learning, data-integrity, and backup-schema checks
npm run test:e2e    # Real Electron journey; run after npm run build
npm run package     # Build the Windows x64 installer
```

The Electron integration test writes only to `.test-data/` and exercises offline practice, keyboard input, app restart/resume, SQLite persistence, bookmarking, dark mode, session results, export/reset/import, and invalid-backup rejection. Windows environments that wrap processes in a restrictive AppContainer may need the test launched outside that shell restriction; the app’s renderer sandbox stays enabled.

## Learning behavior

- Choose 10, 15, or 20 words per session and Core, Stretch, Deep cuts, or All words.
- Mixed practice combines due reviews and unseen entries. Editorial entries are introduced first within the chosen range. Words do not repeat within a session.
- Correct answers return after 1, 3, 7, 14, 30, 60, and 120 days. A streak advances only with a correct answer on a new local calendar day.
- Incorrect answers reset the recognition streak and return in 10 minutes. “I don’t know” is tracked separately and returns in 5 minutes.
- Three successful separate days mark a word as consistently recognized. This measures recognition in this quiz, not complete proficiency.
- Answers save immediately, including the feedback and current question. Leaving a session pauses it. Starting practice again resumes it.
- Daily goals count questions answered, including incorrect and unknown answers. Daily activity uses the device’s local calendar.
- Keyboard: **1–4** chooses a definition, **0** or **?** selects unknown, and **Enter** advances after feedback. Dialogs support Escape and trap keyboard focus.
- “Question unclear?” hides an entry locally from future sessions. Hidden questions can be restored in Settings or the library.

## Word collection and quality

`public/data/words.json` contains 60 original editorial entries and 14,000 filtered WordNet entries. The database is checked into the project so the app never fetches dictionary data at runtime. WordNet examples are displayed when available; not every entry has an example.

The extended bank uses Princeton WordNet 3.1, distributed through `wordnet-db` 3.1.14. A build script selects first senses, filters entries for general vocabulary, and prepares alternatives using matching parts of speech, related-sense exclusions, and definition similarity checks. It excludes synonyms and directly linked meanings where the source exposes those links. It does **not** constitute expert review of all 14,000 questions, and automatic checks cannot guarantee semantic uniqueness. Difficulty bands are approximate, based on WordNet usage counts and selection order; obscure and specialized meanings remain possible. Source information is visible in the app.

To regenerate the extended bank from the pinned development dependency:

```powershell
npm run data:build
npm test
npm run build
```

Keep IDs stable when editing the word bank to preserve existing progress. The generation seed is fixed for reproducible choice selection. Edit `scripts/curated.mjs` to add editorial entries.

Princeton University, *WordNet 3.1* (2011), https://wordnet.princeton.edu/. Its full copyright notice and license ship in `public/data/WORDNET-LICENSE.txt` and are readable inside the app. Modifications include filtering, formatting, and question preparation. Lexicon is not affiliated with Princeton University. Font licenses for DM Sans and Lora are in `public/licenses/`.

## Data and security

Desktop data is stored in `lexicon.sqlite` under Electron’s per-user application data directory (`%APPDATA%/lexicon-desktop` by default). Back up through Settings rather than copying a live SQLite database. Upgrading or reinstalling the app does not intentionally remove this directory. Set `LEXICON_USER_DATA` to an absolute directory to use an isolated development/test profile.

The renderer uses context isolation, sandboxing, no Node integration, a restrictive content security policy, and a narrow validated IPC bridge. Only bundled local content is loaded. External windows, navigation, and permission requests are blocked. Backups are validated and capped at 16 MB; importing requires an explicit replacement step. The most recent 365 completed sessions are retained; daily activity and per-word progress remain stored.

No dictionary service, analytics, telemetry, or AI endpoint is called by the application. To expand the collection, ship a new bundled word bank or implement validated downloadable packs in a future release. Online dictionary lookups, pronunciation, cloud sync, and automatic updates are not part of this version.

## Source layout

- `src/` — interface, learning engine, browser/desktop persistence adapter
- `electron/` — secure desktop host, SQLite and native backup dialogs
- `shared/` — shared runtime validation of persisted/imported state
- `scripts/` — reproducible dataset, icon, and runtime preparation
- `public/data/` — offline dictionary, manifest, and source license
- `tests/` — engine/data tests and real desktop integration test
