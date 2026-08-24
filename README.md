# NCKU Credit Map

Rule-based academic planning and graduation decision-support system for NCKU Hydraulic and Ocean Engineering.

## v0.3 features
- Graduation recognition engine for the 114-entry rule set.
- 71-credit professional-required catalog + 4-credit design cap + 1-credit required elective.
- General-education recognition cap and department-elective minimum tracking.
- Structured prerequisite eligibility and automatic schedule conflict detection.
- A/B/C course-load validation.
- Full course CRUD and search.
- JSON backup plus CSV import/export.
- Five LocalStorage undo snapshots.
- Simple prerequisite dependency-chain view.
- NCKU 4.3 GPA projection from expected percentage grades.
- Responsive mobile card UI.

## Run
No build step is required. Serve the repository as static files, or open it through a local static server.

Verification:

```bash
npm run verify
```

## Architecture
```text
curriculum.js       stable curriculum facts + verified official codes
term-data.js        semester-specific teachers / rooms / time slots
app-core.js         pure rules, planning, imports, GPA, validation
app-ui.js           LocalStorage, snapshots, CRUD, rendering
index.html          application shell
style.css           responsive UI
credit-map-v2.test.mjs
.github/workflows/verify.yml
```

`courseCode` is an internal stable identifier. `officialCourseCode` is separate and is only populated when independently verified. Future offering information can be marked estimated rather than presented as confirmed.

## Privacy model
The repository contains sanitized curriculum/demo data only. Personal grades, completed-course states, credit recognition and schedules should remain in browser LocalStorage or ignored local export folders. Do not commit personal transcript data.

## Authoritative references
Curriculum requirements are based on the NCKU Hydraulic and Ocean Engineering 114-entry required-course table and graduation-credit checklist. Official course codes are cross-checked against the department undergraduate-course page. GPA conversion follows the NCKU Registrar's post-2015 4.3 grade-point table.

Because course offerings, teachers, rooms and registration rules can change by semester, verify them against NCKU's official course query before registration.

## Current limits
- No authenticated SIS integration.
- No automatic course registration.
- No full constraint-solver auto-scheduler yet.
- Some official course codes remain intentionally blank when the current source does not unambiguously identify the 114-entry version.
