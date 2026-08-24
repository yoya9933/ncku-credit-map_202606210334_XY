# Case Study — NCKU Credit Map

## Problem

Degree planning is not just a credit counter. Students need to reason about recognition caps, department-elective minimums, prerequisites, timetable conflicts, GPA risk and semester load at the same time. A spreadsheet can store rows, but it does not reliably enforce those interacting rules.

## Product goal

Build a browser-only academic planning tool that turns graduation rules into explicit, testable decisions while keeping personal academic data out of the public repository.

## Key engineering decisions

- Modeled graduation requirements as pure calculation rules instead of UI conditions.
- Separated stable curriculum facts from semester-specific offerings.
- Represented prerequisites and class meetings as structured data.
- Added migration from a legacy personalized LocalStorage schema to a governed public schema.
- Added a deterministic constraint search for feasible course plans.
- Ranked plans with explainable scoring instead of returning an opaque recommendation.
- Added five-step local snapshots for destructive edits/imports/reset.
- Added CSV formula-injection protection to exported spreadsheet data.

## What the planner considers

A proposed schedule can be rejected when it:

1. falls outside the requested credit range;
2. contains a course whose prerequisite is not satisfied;
3. creates a timetable overlap;
4. exceeds the configured average risk;
5. exceeds the allowed number of high-risk courses.

Valid plans are ranked using course necessity, explicit user decision priority, prerequisite-unlock value and closeness to the target load.

## Result

The project evolved from a personalized credit tracker into a small decision-support system with:

- a graduation recognition engine;
- prerequisite and timetable engines;
- A/B/C plan validation;
- automatic plan generation;
- GPA projection;
- full course CRUD;
- JSON/CSV portability;
- local undo snapshots;
- responsive mobile UI;
- CI-backed regression tests.

## Privacy and trust

The repository contains only sanitized curriculum and demo data. Personal grades and completion states live in browser storage. Rules and future offerings are kept distinguishable so an estimate is not presented as an official fact.

## Next extensions

- import from official course-query exports;
- richer prerequisite graph visualization;
- multi-semester path optimization;
- accessibility and print/report views;
- authenticated sync without moving academic-rule logic into the client UI.
