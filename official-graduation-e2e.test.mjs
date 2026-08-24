import assert from "node:assert/strict";
import {
  COURSE_CATALOG,
  OFFICIAL_REQUIREMENT_IDS,
  calculateGraduation,
  normalizeCourse,
} from "./app-core.js";

const complete = (course, extra = {}) =>
  normalizeCourse({ ...course, status: "已修", grade: "80", ...extra });

const core = COURSE_CATALOG.filter((course) =>
  OFFICIAL_REQUIREMENT_IDS.majorCore.includes(course.courseCode),
).map((course) => complete(course));

const design = COURSE_CATALOG.filter((course) =>
  OFFICIAL_REQUIREMENT_IDS.design.slice(0, 2).includes(course.courseCode),
).map((course) => complete(course));

const intro = complete(COURSE_CATALOG.find((course) => course.courseCode === "HOE-INTRO"));

const general = (id, credits, subarea) =>
  complete({
    id,
    courseCode: id,
    courseName: id,
    credits,
    recognizedCredits: credits,
    requirementGroup: "general",
    generalSubarea: subarea,
    countsTowardGraduation: true,
  });

const generalCourses = [
  general("E2E-CH", 4, "languageChinese"),
  general("E2E-EN", 4, "languageForeign"),
  general("E2E-TAINAN", 1, "tainan"),
  general("E2E-HUM", 6, "humanities"),
  general("E2E-SOC", 6, "socialSciences"),
  general("E2E-LIFE", 6, "lifeHealth"),
  general("E2E-FUSION", 1, "fusion"),
];

const electives = [
  ...Array.from({ length: 10 }, (_, index) =>
    complete({
      id: `E2E-E-${index}`,
      courseCode: `E2E-E-${index}`,
      courseName: `E2E 選修 ${index}`,
      credits: 3,
      recognizedCredits: 3,
      requirementGroup: "elective",
      departmentElective: index < 4,
      countsTowardGraduation: true,
    }),
  ),
  complete({
    id: "E2E-E-10",
    courseCode: "E2E-E-10",
    courseName: "E2E 選修 10",
    credits: 1,
    recognizedCredits: 1,
    requirementGroup: "elective",
    countsTowardGraduation: true,
  }),
];

const pe = normalizeCourse({
  ...COURSE_CATALOG.find((course) => course.courseCode === "GATE-PE"),
  gateProgress: 4,
});
const english = complete(
  COURSE_CATALOG.find((course) => course.courseCode === "GATE-ENGLISH"),
);

const completeState = [...core, ...design, intro, ...generalCourses, ...electives, pe, english];
const ready = calculateGraduation(completeState);
assert.equal(ready.total.recognized, 135);
assert.equal(ready.major.satisfied, true);
assert.equal(ready.requiredElective.recordSatisfied, true);
assert.equal(ready.general.satisfied, true);
assert.equal(ready.elective.satisfied, true);
assert.equal(ready.gates.pe.satisfied, true);
assert.equal(ready.gates.english.satisfied, true);
assert.equal(ready.graduationReady, true);

const noEnglish = calculateGraduation(
  completeState.filter((course) => course.courseCode !== "GATE-ENGLISH"),
);
assert.equal(noEnglish.total.recognized, 135, "non-credit gate should not alter total credits");
assert.equal(noEnglish.graduationReady, false);

const noIntroRecord = calculateGraduation(
  completeState.filter((course) => course.courseCode !== "HOE-INTRO"),
);
assert.equal(noIntroRecord.total.recognized, 134);
assert.equal(noIntroRecord.requiredElective.recordSatisfied, false);
assert.equal(noIntroRecord.graduationReady, false);

console.log("official graduation end-to-end readiness tests passed");
