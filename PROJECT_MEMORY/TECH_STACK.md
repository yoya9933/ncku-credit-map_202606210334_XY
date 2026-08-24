# Technical Architecture — v0.3

## Runtime
- Static HTML/CSS.
- Vanilla JavaScript ES modules.
- Browser LocalStorage for personal state and undo snapshots.
- No backend and no authentication.

## Modules
- `curriculum.js` — stable 114-entry curriculum/rules metadata.
- `term-data.js` — term-specific offering snapshots and certainty.
- `app-core.js` — pure domain logic: normalization, recognition, prerequisites, conflicts, plans, CSV, GPA.
- `app-ui.js` — DOM rendering, CRUD, imports/exports, snapshots.
- `credit-map-v2.test.mjs` — Node regression tests.

## Verification
`npm run verify` performs syntax checks for all JS modules and executes regression tests. GitHub Actions runs the same command for pushes and pull requests.

## Data integrity rules
- Internal `courseCode` is stable application identity.
- `officialCourseCode` stores an independently verifiable NCKU code when known.
- Duplicate IDs/internal codes are rejected.
- `recognizedCredits` is capped by course credits.
- Unknown official codes or future offering details stay blank/estimated.

## Privacy
Do not commit personal transcripts, complete schedules, student IDs, grades, credit-recognition exports, or LocalStorage backups. `.gitignore` blocks the common local/private export paths.
