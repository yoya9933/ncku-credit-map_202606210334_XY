# NCKU Credit Map

[![verify](https://github.com/yoya9933/ncku-credit-map_202606210334_XY/actions/workflows/verify.yml/badge.svg)](https://github.com/yoya9933/ncku-credit-map_202606210334_XY/actions/workflows/verify.yml)

Rule-based academic planning and graduation decision-support system for NCKU Hydraulic and Ocean Engineering.

**Portfolio demo:** https://yoya9933.github.io/ncku-credit-map_202606210334_XY/demo.html

## Why this project exists

Degree planning is not only about adding credits. A feasible semester also depends on recognition caps, department-elective minimums, prerequisites, timetable conflicts, GPA risk and course-load limits. This project turns those interacting rules into explicit, testable decisions.

## Core capabilities

- Graduation recognition engine for the 114-entry rule set.
- 71-credit professional-required catalog, design-credit cap and required-elective tracking.
- General-education recognition caps and department-elective minimum tracking.
- Structured prerequisite eligibility and automatic timetable conflict detection.
- A/B/C plan validation.
- Automatic constraint-based current-term planner with explainable ranking.
- NCKU 4.3 GPA projection from expected percentage grades.
- Full local course CRUD, search, JSON backup and CSV import/export.
- Five-step LocalStorage undo snapshots.
- Responsive mobile UI.
- Sanitized one-click portfolio demo with no personal transcript data committed.

## Automatic planner

A schedule is rejected if it violates configured credit limits, prerequisite eligibility, timetable conflicts, average-risk limits or high-risk-course limits. Valid schedules are ranked using course necessity, explicit user decision priority, downstream prerequisite unlock value and closeness to the requested target load.

The recommendation remains explainable: the UI shows the selected credits, high-necessity courses, risk count and downstream unlock value before the user applies it to plan A/B/C.

## Architecture

```text
curriculum.js        stable curriculum facts + verified official codes
term-data.js         semester-specific offerings / teachers / rooms / slots
app-core.js          graduation rules, prerequisites, conflicts, GPA, imports
auto-planner.js      deterministic constraint search and plan ranking
app-ui.js            LocalStorage, snapshots, CRUD and rendering
auto-planner-ui.js   planner controls and recommendation application
index.html           application shell
demo.html            sanitized portfolio-demo bootstrap
demo-state.json      non-personal demo overrides
```

Detailed architecture: [`docs/architecture.md`](docs/architecture.md)

Portfolio case study: [`docs/case-study.md`](docs/case-study.md)

## Privacy model

The repository contains sanitized curriculum/demo data only. Personal grades, completed-course states, recognition decisions and schedules belong in browser LocalStorage or ignored local export folders. `courseCode` is a stable application identifier; `officialCourseCode` is separate and only populated when independently verified.

## Verification

```bash
npm run verify
```

The regression suite covers graduation caps, migration, prerequisite thresholds, timetable conflicts, CRUD integrity, CSV safety, GPA conversion, auto-planner constraints and sanitized demo loading.

## Run locally

No build step is required. Serve the repository as static files with any local HTTP server and open `index.html`. Open `demo.html` to load the sanitized portfolio state.

## Deployment

`.github/workflows/pages.yml` publishes the static site through GitHub Pages after pushes to `main`. If Pages has never been enabled for the repository, GitHub may require selecting **GitHub Actions** once under **Settings → Pages → Build and deployment**.

## Data trust boundary

Curriculum requirements are based on the NCKU Hydraulic and Ocean Engineering 114-entry required-course table and graduation-credit checklist. GPA conversion follows NCKU's 4.3 grade-point table. Semester offerings, teachers, rooms and registration conditions can change and must be verified against the official NCKU course query before registration.

## Version

`1.0.0` portfolio release candidate. See [`CHANGELOG.md`](CHANGELOG.md).

## License

MIT License.
