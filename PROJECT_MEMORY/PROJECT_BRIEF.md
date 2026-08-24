# Project Brief — NCKU Credit Map v0.3

## Goal
A local-first academic planning and graduation decision-support tool for NCKU Hydraulic and Ocean Engineering.

## Product principles
- Graduation recognition is rule-based, not a raw sum of completed credits.
- Public source code contains sanitized curriculum/demo data only.
- Personal academic state lives in LocalStorage or user-exported files.
- Stable curriculum facts and term-specific offering data are separate.
- Unknown official values stay blank rather than being guessed.

## Current scope
- 114-entry graduation rule engine.
- Structured prerequisites and schedule conflict detection.
- A/B/C course-load plans.
- Full course CRUD, search, JSON/CSV import/export.
- Five local undo snapshots.
- Dependency-chain summary.
- NCKU 4.3 GPA projection.
- Responsive mobile card layout.

## Data layers
- `curriculum.js`: stable curriculum requirements, internal IDs, verified official course codes.
- `term-data.js`: term-specific teachers, locations, slots, certainty.
- `app-core.js`: pure normalization/rules/calculation/import logic.
- `app-ui.js`: browser state, storage, CRUD and rendering.

## Non-goals for v0.3
- Automatic registration.
- Scraping SIS behind authentication.
- Full constraint-solver schedule generation.
- Treating estimated future offerings as confirmed facts.
