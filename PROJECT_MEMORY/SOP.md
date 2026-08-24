# Development SOP — v0.3

1. Change stable curriculum facts only in `curriculum.js`.
2. Change semester-specific teacher/room/time data only in `term-data.js`.
3. Do not invent official course codes or future schedules; blank/estimated is acceptable.
4. Put reusable calculations in `app-core.js`; keep DOM and LocalStorage in `app-ui.js`.
5. Add a regression test for every graduation-rule, import, migration, prerequisite, conflict or GPA change.
6. Run `npm run verify` before merge.
7. Never commit personal transcript/grade/credit-recognition data. Use LocalStorage or ignored `private/`, `backups/`, `exports/` paths.
8. Keep public defaults sanitized.
9. Use a feature branch and PR for non-trivial changes.
10. After structural changes, update `PROJECT_BRIEF.md`, `TECH_STACK.md` and README in the same PR.
