import assert from "node:assert/strict";
import {
  APP_CONFIG,
  PLAN_CONFIG,
  REQUIREMENTS,
  calculateConflicts,
  calculateGraduation,
  calculateRiskSummary,
  candidateCourses,
  createCleanDefaultState,
  decisionLabel,
  exportCoursesToCsv,
  getEligibility,
  migrateState,
  normalizeCourse,
  parseBackupPayload,
  planStats,
  serializeBackup,
} from "./app-core.js";

const complete = (course, extra = {}) => normalizeCourse({ ...course, status: "已修", ...extra });

const designOverflow = [
  complete({ courseCode: "DESIGN-FLOOD", courseName: "防洪排水工程設計", credits: 2, requirementGroup: "major-design" }),
  complete({ courseCode: "DESIGN-WATER", courseName: "水資源工程設計", credits: 2, requirementGroup: "major-design" }),
  complete({ courseCode: "DESIGN-OCEAN", courseName: "海洋工程設計", credits: 2, requirementGroup: "major-design" }),
  complete({ courseCode: "DESIGN-COAST", courseName: "海岸工程設計", credits: 2, requirementGroup: "major-design" }),
];
assert.equal(calculateGraduation(designOverflow).major.design, 4);
assert.equal(calculateGraduation(designOverflow).major.recognized, 4);

const generalCap = [
  complete({ courseCode: "GEN-PHYS", courseName: "應用物理與實驗", credits: 2, requirementGroup: "general", generalSubarea: "naturalEngineering" }),
  complete({ courseCode: "GEN-CHEM", courseName: "應用化學與實驗", credits: 2, requirementGroup: "general", generalSubarea: "naturalEngineering" }),
];
const generalResult = calculateGraduation(generalCap);
assert.equal(generalResult.general.naturalEngineeringRaw, 4);
assert.equal(generalResult.general.naturalEngineeringRecognized, REQUIREMENTS.general.caps.naturalEngineering);
assert.equal(generalResult.general.recognized, 2);

const unrelated = [complete({ courseName: "不認列活動", credits: 3, requirementGroup: "other", category: "其他", countsTowardGraduation: false })];
assert.equal(calculateGraduation(unrelated).total.recognized, 0);

const partialRecognition = [complete({ courseName: "部分認列", credits: 3, recognizedCredits: 2, requirementGroup: "elective", countsTowardGraduation: true })];
assert.equal(calculateGraduation(partialRecognition).elective.recognized, 2);
assert.equal(normalizeCourse({ courseName: "bad", credits: 3, recognizedCredits: 99, requirementGroup: "elective" }).recognizedCredits, 3);

const electives = Array.from({ length: 11 }, (_, index) => complete({
  id: `e-${index}`, courseName: `選修 ${index}`, credits: 3, recognizedCredits: 3,
  requirementGroup: "elective", category: "自由選修", departmentElective: index < 3,
}));
const electiveResult = calculateGraduation(electives);
assert.equal(electiveResult.elective.recognized, 31);
assert.equal(electiveResult.elective.departmentRecognized, 9);
assert.equal(electiveResult.elective.departmentRemaining, 1);
assert.equal(electiveResult.graduationReady, false);

const riskSummary = calculateRiskSummary([
  complete({ courseName: "已完成高風險", credits: 3, requirementGroup: "major-core", gpaRisk: "高" }),
  normalizeCourse({ courseName: "未完成高風險", credits: 3, requirementGroup: "major-core", gpaRisk: "高" }),
]);
assert.deepEqual(riskSummary.highRisk.map((course) => course.courseName), ["未完成高風險"]);
assert.deepEqual(riskSummary.blocking.map((course) => course.courseName), ["未完成高風險"]);

assert.equal(decisionLabel("priority"), `${APP_CONFIG.currentTerm} 優先`);
assert.equal(decisionLabel("next"), `${APP_CONFIG.nextTerm} 預備`);

const physics = normalizeCourse({ courseCode: "PHYS-1", courseName: "普通物理學（一）", credits: 3, requirementGroup: "major-core", status: "未修" });
const fluid = normalizeCourse({ courseCode: "FLUID-1", courseName: "流體力學（一）", credits: 3, requirementGroup: "major-core", prerequisites: [{ courseCode: "PHYS-1", minimumGrade: 45 }] });
assert.equal(getEligibility(fluid, [physics, fluid]).eligible, false);
assert.equal(getEligibility(fluid, [complete(physics, { grade: "50" }), fluid]).eligible, true);
assert.equal(getEligibility(fluid, [normalizeCourse({ ...physics, status: "已抵免" }), fluid]).eligible, true);

const a = normalizeCourse({ id: "a", courseName: "A", credits: 3, requirementGroup: "major-core", term: APP_CONFIG.currentTerm, slots: [{ day: 1, start: 7, end: 8 }] });
const b = normalizeCourse({ id: "b", courseName: "B", credits: 3, requirementGroup: "major-core", term: APP_CONFIG.currentTerm, slots: [{ day: 1, start: 8, end: 9 }] });
const c = normalizeCourse({ id: "c", courseName: "C", credits: 3, requirementGroup: "major-core", term: APP_CONFIG.currentTerm, slots: [{ day: 2, start: 8, end: 9 }] });
assert.equal(calculateConflicts([a, b, c]).length, 1);
assert.equal(calculateConflicts([a, b, c])[0].courseA.courseName, "A");
assert.equal(calculateConflicts([a, b, c])[0].courseB.courseName, "B");

const plan = PLAN_CONFIG[0];
const tooSmall = [normalizeCourse({ id: "p1", courseName: "P1", credits: 3, requirementGroup: "general", planA: true, riskScore: 1 })];
assert.equal(planStats(tooSmall, plan).creditValid, false);
assert.equal(planStats(tooSmall, plan).valid, false);
const validPlan = Array.from({ length: 4 }, (_, i) => normalizeCourse({ id: `vp-${i}`, courseName: `VP${i}`, credits: 3, requirementGroup: "general", planA: true, riskScore: 2, necessityScore: 3 }));
assert.equal(planStats(validPlan, plan).totalCredits, 12);
assert.equal(planStats(validPlan, plan).valid, true);

const candidate = normalizeCourse({ id: "candidate", courseName: "候選", credits: 3, requirementGroup: "major-core", term: APP_CONFIG.currentTerm, decision: "priority" });
const oldTerm = normalizeCourse({ id: "old", courseName: "舊學期", credits: 3, requirementGroup: "major-core", term: "114-2", decision: "priority" });
assert.deepEqual(candidateCourses([candidate, oldTerm]).map((course) => course.courseName), ["候選"]);

const legacy = { courses: [{ id: "legacy", courseName: "工程圖學", credits: 2, category: "水利必修", status: "已修", decisionStatus: "115-1 優先" }] };
const migrated = migrateState(legacy);
assert.equal(migrated.version, 2);
assert.equal(migrated.courses[0].requirementGroup, "major-core");
assert.equal(migrated.courses[0].decision, "priority");
const roundTrip = parseBackupPayload(serializeBackup(migrated.courses));
assert.equal(roundTrip.version, 2);
assert.equal(roundTrip.courses[0].courseName, "工程圖學");
assert.throws(() => parseBackupPayload({ version: 999, courses: [] }), /高於目前支援版本/);
assert.throws(() => parseBackupPayload({ version: 2 }), /courses/);

const csv = exportCoursesToCsv([normalizeCourse({ courseName: "=HYPERLINK(\"bad\")", credits: 1, requirementGroup: "elective" })]);
assert.match(csv, /'=HYPERLINK/);

const defaults = createCleanDefaultState();
assert.equal(defaults.courses.some((course) => ["已修", "已抵免", "已認列"].includes(course.status)), false);
assert.equal(defaults.courses.some((course) => course.semester !== "待排"), false);

console.log("credit-map P0/P1 tests passed");
