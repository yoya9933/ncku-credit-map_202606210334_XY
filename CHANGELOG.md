# Changelog

## 1.2.0 — Official 114 rule hardening

- Rebuilt graduation readiness around the official 114-entry NCKU Hydraulic and Ocean Engineering checklist.
- Enforced 71 professional-required credits using canonical official course IDs instead of editable requirement groups.
- Enforced 4 design-required credits and moved excess completed design credits into the elective pool.
- Treated Hydraulic and Ocean Engineering Introduction as the official 1-credit required-elective course-record requirement.
- Added general-education subrules for Chinese/foreign language, Exploring Tainan, domain coverage, the one-course natural-and-engineering cap, fusion credits, and life-practice limits.
- Added AND/OR prerequisite expressions and corrected official score thresholds for Structural Analysis I, Reinforced Concrete, and Engineering Statistics.
- Rejected missing/non-numeric grades when a numeric prerequisite threshold is required.
- Restricted GPA simulation to incomplete courses in the selected semester.
- Added editable general-education classification and CSV preservation of `generalSubarea`.
- Added dedicated official-rule regression tests and an end-to-end 135-credit graduation-readiness test.

## 1.1.0 — Engineering quality

- Added ESLint and Prettier verification.
- Added accessibility, loading, empty/error-state and metadata regression checks.
- Added favicon, 404 page and print-friendly graduation progress.

## 1.0.0 — Portfolio release candidate

- Graduation-rule engine with recognition caps and graduation gates.
- Structured prerequisite and timetable conflict detection.
- Full local course CRUD with JSON/CSV portability.
- Local snapshots and undo.
- NCKU 4.3 GPA projection.
- Automatic current-term constraint planner with explainable ranking.
- Responsive mobile UI.
- Sanitized one-click demo state.
- Architecture and case-study documentation.
- GitHub Actions verification and Pages deployment workflow.

## 0.4.0

- Added automatic planner and recommendation application to A/B/C plans.

## 0.3.0

- Added CRUD, responsive UI, term-data separation, GPA simulation, dependency summary, CSV import and snapshots.

## 0.2.0

- Rebuilt graduation rules, privacy model, prerequisites, conflict detection, migration and CI.
