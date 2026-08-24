# NCKU Credit Map

[![verify](https://github.com/yoya9933/ncku-credit-map_202606210334_XY/actions/workflows/verify.yml/badge.svg)](https://github.com/yoya9933/ncku-credit-map_202606210334_XY/actions/workflows/verify.yml)

Rule-based academic planning and graduation decision-support system for NCKU Hydraulic and Ocean Engineering.

**Portfolio demo:** https://yoya9933.github.io/ncku-credit-map_202606210334_XY/demo.html

## Why this project exists

Degree planning is not only about adding credits. A feasible semester depends on official required-course identity, general-education subrules, prerequisites, recognition caps, timetable conflicts, department-elective minimums, GPA risk and course-load limits. This project turns those interacting rules into explicit, testable decisions.

## Official 114-entry graduation model

The v1.2 engine follows the department's official 114-entry checklist and required-course table:

- 135 total graduation credits.
- 71 credits from the 30 canonical professional-required courses.
- 4 design-required credits from two of the four official design courses; extra completed design credits move into electives.
- Hydraulic and Ocean Engineering Introduction: 1-credit required-elective course with a required course record.
- 28 general-education credits with explicit subrules:
  - 4 credits basic Chinese + 4 credits foreign language.
  - 1 credit Exploring Tainan.
  - at least three of the five general-education domains; domain credits are capped at 18.
  - Natural and Engineering Science: at most one course recognized.
  - Fusion General Education: at least 1 credit, capped at 15; Life Practice is capped at 4 credits.
- 31 open-elective credits, including at least 10 department-elective credits.
- PE completed for four semesters.
- English graduation gate satisfied through the department-recognized B2 / remedial-English path.

The department also states that the first attempt of department-required courses must be a course offered by the department. The application surfaces this as a manual check because local course-state data alone cannot prove the offering authority.

Official sources are encoded in `curriculum.js` under `OFFICIAL_RULE_SOURCES`.

## Core capabilities

- Canonical-ID graduation engine that prevents custom courses from masquerading as official professional requirements.
- Official general-education subrule engine rather than total-credit-only approximation.
- Structured AND/OR prerequisite eligibility and automatic timetable conflict detection.
- Official prerequisite score thresholds for the 114-entry required-course table.
- A/B/C plan validation and explainable automatic current-term planner.
- NCKU 4.3 GPA projection limited to incomplete courses in the selected semester.
- Full local course CRUD, including general-education classification and AND/OR prerequisite editing.
- JSON backup and CSV import/export with `generalSubarea` preservation.
- Five-step LocalStorage undo snapshots.
- Responsive mobile UI and print-friendly graduation progress.

## Automatic planner

A schedule is rejected if it violates configured credit limits, prerequisite eligibility, timetable conflicts, average-risk limits or high-risk-course limits. Valid schedules are ranked using course necessity, explicit user decision priority, downstream prerequisite unlock value and closeness to the requested target load.

The recommendation remains explainable: the UI shows selected credits, high-necessity courses, risk count and downstream unlock value before the user applies it to plan A/B/C.

## Architecture

```text
curriculum.js        official/stable curriculum facts + rule sources
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

The current repository tree contains sanitized curriculum/demo data only. Personal grades, completed-course states, recognition decisions and schedules belong in browser LocalStorage or ignored local export folders. `courseCode` is a stable application identifier; `officialCourseCode` is separate and only populated when independently verified.

## Verification

```bash
npm run verify
```

The suite includes syntax checks, ESLint, formatting checks, legacy regressions, dedicated official-rule tests, a complete 135-credit graduation-readiness end-to-end case, prerequisite thresholds/OR conditions, timetable conflicts, CRUD integrity, CSV safety, GPA conversion, auto-planner constraints, accessibility checks and sanitized demo loading.

## Run locally

No build step is required. Serve the repository as static files with any local HTTP server and open `index.html`. Open `demo.html` to load the sanitized portfolio state.

## Deployment

`.github/workflows/pages.yml` publishes the static site through GitHub Pages after pushes to `main`. If Pages has never been enabled for the repository, GitHub may require selecting **GitHub Actions** once under **Settings → Pages → Build and deployment**.

## Data trust boundary

Stable graduation rules are encoded from official NCKU sources. Semester offerings, teachers, rooms and registration conditions can change and must still be checked against the official NCKU course query before registration. User-added general-education classifications and department-elective flags are treated as user-supplied recognition data.

## Version

`1.2.0` — official 114 graduation-rule hardening. See [`CHANGELOG.md`](CHANGELOG.md).

## License

MIT License.
