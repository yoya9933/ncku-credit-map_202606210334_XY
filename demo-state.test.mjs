import assert from "node:assert/strict";
import fs from "node:fs";
import { COURSE_CATALOG, createCleanDefaultState, upsertCourse } from "./app-core.js";

const demo = JSON.parse(fs.readFileSync(new URL("./demo-state.json", import.meta.url), "utf8"));
const known = new Set(COURSE_CATALOG.map((c) => c.courseCode));
assert.ok(Array.isArray(demo.courses) && demo.courses.length > 0);
assert.equal(demo.courses.every((c) => known.has(c.courseCode)), true);
assert.equal(JSON.stringify(demo).includes("@"), false);
let courses = createCleanDefaultState().courses;
for (const override of demo.courses) {
  const existing = courses.find((c) => c.courseCode === override.courseCode);
  courses = upsertCourse(courses, { ...existing, ...override, id: existing.id });
}
assert.equal(courses.length, COURSE_CATALOG.length);
assert.equal(courses.find((c) => c.courseCode === "PHYS-1").status, "已修");
console.log("sanitized demo state passed");
