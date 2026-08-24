import assert from "node:assert/strict";
import {
  APP_CONFIG,
  COURSE_CATALOG,
  OFFICIAL_REQUIREMENT_IDS,
  REQUIREMENTS,
  calculateGeneralEducation,
  calculateGpaProjection,
  calculateGraduation,
  getEligibility,
  normalizeCourse,
} from "./app-core.js";

const complete = (course, extra = {}) =>
  normalizeCourse({ ...course, status: "已修", grade: "80", ...extra });

const officialCore = COURSE_CATALOG.filter((course) =>
  OFFICIAL_REQUIREMENT_IDS.majorCore.includes(course.courseCode),
);
assert.equal(officialCore.length, 30);
assert.equal(officialCore.reduce((sum, course) => sum + course.credits, 0), 71);
assert.equal(REQUIREMENTS.major.total, 75);
assert.equal(REQUIREMENTS.elective.total, 31);
assert.equal(REQUIREMENTS.requiredElective.credits, 1);
assert.equal(
  REQUIREMENTS.major.total +
    REQUIREMENTS.requiredElective.credits +
    REQUIREMENTS.general.total +
    REQUIREMENTS.elective.total,
  REQUIREMENTS.totalCredits,
);

const fakeMajor = complete({
  id: "fake-major",
  courseCode: "FAKE-MAJOR",
  courseName: "自訂假必修",
  credits: 71,
  recognizedCredits: 71,
  requirementGroup: "major-core",
  countsTowardGraduation: true,
});
const fakeMajorResult = calculateGraduation([fakeMajor]);
assert.equal(fakeMajorResult.major.core, 0, "custom major-core must not satisfy official required courses");
assert.equal(fakeMajorResult.major.coreAllSatisfied, false);

const allCoreCompleted = officialCore.map((course) => complete(course));
const coreResult = calculateGraduation(allCoreCompleted);
assert.equal(coreResult.major.core, 71);
assert.equal(coreResult.major.coreCompletedCount, 30);
assert.equal(coreResult.major.coreAllSatisfied, true);
assert.equal(coreResult.major.satisfied, false, "design requirement must remain separate");

const allDesignCompleted = COURSE_CATALOG.filter((course) =>
  OFFICIAL_REQUIREMENT_IDS.design.includes(course.courseCode),
).map((course) => complete(course));
const majorResult = calculateGraduation([...allCoreCompleted, ...allDesignCompleted]);
assert.equal(majorResult.major.design, 4);
assert.equal(majorResult.major.designRaw, 8);
assert.equal(majorResult.major.designOverflow, 4);
assert.equal(majorResult.elective.designOverflow, 4);
assert.equal(majorResult.major.recognized, 75);
assert.equal(majorResult.major.satisfied, true);

const intro = COURSE_CATALOG.find((course) => course.courseCode === "HOE-INTRO");
const withoutIntro = calculateGraduation([...allCoreCompleted, ...allDesignCompleted]);
assert.equal(withoutIntro.requiredElective.satisfied, false);
const withIntro = calculateGraduation([...allCoreCompleted, ...allDesignCompleted, complete(intro)]);
assert.equal(withIntro.requiredElective.satisfied, true);
assert.equal(withIntro.requiredElective.recordSatisfied, true);
assert.equal(withIntro.requiredElective.creditEarned, true);
assert.equal(withIntro.requiredElective.recognized, 1);

const failedIntroRecord = normalizeCourse({
  ...intro,
  status: "重修",
  grade: "45",
  semester: "115-1",
});
const failedIntroResult = calculateGraduation([
  ...allCoreCompleted,
  ...allDesignCompleted,
  failedIntroRecord,
]);
assert.equal(failedIntroResult.requiredElective.recordSatisfied, true);
assert.equal(failedIntroResult.requiredElective.creditEarned, false);
assert.equal(failedIntroResult.requiredElective.recognized, 0);
assert.equal(failedIntroResult.requiredElective.satisfied, true);

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
  general("CH-1", 2, "languageChinese"),
  general("CH-2", 2, "languageChinese"),
  general("EN", 4, "languageForeign"),
  general("TAINAN-X", 1, "tainan"),
  general("HUM-1", 4, "humanities"),
  general("SOC-1", 4, "socialSciences"),
  general("NAT-1", 2, "naturalEngineering"),
  general("NAT-2", 2, "naturalEngineering"),
  general("LIFE-1", 4, "lifeHealth"),
  general("FUSION-X", 1, "fusion"),
  general("FUSION-X2", 4, "fusion"),
];
const generalResult = calculateGeneralEducation(generalCourses);
assert.equal(generalResult.rules.language.satisfied, true);
assert.equal(generalResult.rules.tainan.satisfied, true);
assert.equal(generalResult.rules.domain.distinctAreas, 4);
assert.equal(generalResult.rules.domain.naturalEngineeringRawCourses, 2);
assert.equal(generalResult.rules.domain.naturalEngineeringRecognizedCourses, 1);
assert.equal(generalResult.rules.domain.areaCredits.naturalEngineering, 2);
assert.equal(generalResult.rules.fusion.satisfied, true);
assert.equal(generalResult.recognized, 28);
assert.equal(generalResult.satisfied, true);

const missingForeign = calculateGeneralEducation(
  generalCourses.filter((course) => course.generalSubarea !== "languageForeign"),
);
assert.equal(missingForeign.rules.language.satisfied, false);
assert.equal(missingForeign.satisfied, false);

const onlyTwoDomains = calculateGeneralEducation([
  general("CH-A", 4, "languageChinese"),
  general("EN-A", 4, "languageForeign"),
  general("TAINAN-A", 1, "tainan"),
  general("HUM-A", 9, "humanities"),
  general("SOC-A", 9, "socialSciences"),
  general("FUSION-A", 1, "fusion"),
]);
assert.equal(onlyTwoDomains.recognized, 28);
assert.equal(onlyTwoDomains.rules.domain.distinctAreas, 2);
assert.equal(onlyTwoDomains.satisfied, false, "28 credits alone must not bypass the three-domain rule");

const physics = complete(
  {
    id: "PHYS-1",
    courseCode: "PHYS-1",
    courseName: "普通物理學（一）",
    credits: 3,
    requirementGroup: "major-core",
  },
  { grade: "F" },
);
const engineeringMechanics = normalizeCourse(
  COURSE_CATALOG.find((course) => course.courseCode === "ENG-MECH"),
);
assert.equal(
  getEligibility(engineeringMechanics, [physics, engineeringMechanics]).eligible,
  false,
  "non-numeric grade must not satisfy a numeric prerequisite threshold",
);

const engMech59 = complete(
  COURSE_CATALOG.find((course) => course.courseCode === "ENG-MECH"),
  { grade: "59" },
);
const engMech60 = complete(
  COURSE_CATALOG.find((course) => course.courseCode === "ENG-MECH"),
  { grade: "60" },
);
const structure = normalizeCourse(COURSE_CATALOG.find((course) => course.courseCode === "STRUCT-1"));
assert.equal(getEligibility(structure, [engMech59, structure]).eligible, false);
assert.equal(getEligibility(structure, [engMech60, structure]).eligible, true);

const rc = normalizeCourse(COURSE_CATALOG.find((course) => course.courseCode === "RC"));
assert.equal(getEligibility(rc, [complete(engMech60, { grade: "49" }), rc]).eligible, false);
assert.equal(getEligibility(rc, [complete(engMech60, { grade: "50" }), rc]).eligible, true);

const stat = normalizeCourse(COURSE_CATALOG.find((course) => course.courseCode === "STAT"));
const calc1Pass = complete(COURSE_CATALOG.find((course) => course.courseCode === "CALC-1"), {
  grade: "45",
});
const calc2Fail = complete(COURSE_CATALOG.find((course) => course.courseCode === "CALC-2"), {
  grade: "44",
});
assert.equal(getEligibility(stat, [stat, calc1Pass, calc2Fail]).eligible, true);
const calc1Fail = complete(calc1Pass, { grade: "44" });
assert.equal(getEligibility(stat, [stat, calc1Fail, calc2Fail]).eligible, false);
assert.match(getEligibility(stat, [stat, calc1Fail, calc2Fail]).missing[0].label, /任一/);

const currentCourse = normalizeCourse({
  id: "GPA-CURRENT",
  courseCode: "GPA-CURRENT",
  courseName: "本學期",
  credits: 3,
  requirementGroup: "elective",
  term: APP_CONFIG.currentTerm,
  expectedGrade: "90",
});
const futureCourse = normalizeCourse({
  id: "GPA-FUTURE",
  courseCode: "GPA-FUTURE",
  courseName: "未來學期",
  credits: 3,
  requirementGroup: "elective",
  term: APP_CONFIG.nextTerm,
  expectedGrade: "90",
});
const completedCourse = complete(currentCourse, { expectedGrade: "90" });
const gpa = calculateGpaProjection({ courses: [currentCourse, futureCourse, completedCourse] });
assert.equal(gpa.semesterCredits, 3);
assert.deepEqual(gpa.courses.map((course) => course.courseCode), ["GPA-CURRENT"]);

console.log("official 114 graduation-rule regressions passed");
