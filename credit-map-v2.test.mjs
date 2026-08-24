import assert from "node:assert/strict";
import {
  APP_CONFIG,
  COURSE_CATALOG,
  PLAN_CONFIG,
  buildDependencyGraph,
  calculateConflicts,
  calculateGpaProjection,
  calculateGraduation,
  calculateRiskSummary,
  candidateCourses,
  createCleanDefaultState,
  decisionLabel,
  deleteCourse,
  exportCoursesToCsv,
  getEligibility,
  gradeToPoint,
  importCoursesFromCsv,
  migrateState,
  normalizeCourse,
  parseBackupPayload,
  planStats,
  serializeBackup,
  upsertCourse,
  validateCourseCollection,
} from "./app-core.js";

const complete = (course, extra = {}) => normalizeCourse({ ...course, status: "已修", ...extra });

const coreCatalog = COURSE_CATALOG.filter((course) => course.requirementGroup === "major-core");
assert.equal(coreCatalog.length, 30);
assert.equal(coreCatalog.reduce((sum, course) => sum + course.credits, 0), 71);
assert.equal(
  COURSE_CATALOG.find((course) => course.courseCode === "PHYS-1").officialCourseCode,
  "E815710",
);
assert.equal(
  COURSE_CATALOG.find((course) => course.courseCode === "FLUID-1").officialCourseCode,
  "E827110",
);

const normalizedPhysics = normalizeCourse({
  courseCode: "PHYS-1",
  courseName: "普通物理學（一）",
});
assert.equal(normalizedPhysics.term, APP_CONFIG.currentTerm);
assert.equal(normalizedPhysics.teacher, "管培辰");
assert.equal(normalizedPhysics.slots.length, 2);

const designOverflow = [
  complete({
    courseCode: "DESIGN-FLOOD",
    courseName: "防洪排水工程設計",
    credits: 2,
    requirementGroup: "major-design",
  }),
  complete({
    courseCode: "DESIGN-WATER",
    courseName: "水資源工程設計",
    credits: 2,
    requirementGroup: "major-design",
  }),
  complete({
    courseCode: "DESIGN-OCEAN",
    courseName: "海洋工程設計",
    credits: 2,
    requirementGroup: "major-design",
  }),
  complete({
    courseCode: "DESIGN-COAST",
    courseName: "海岸工程設計",
    credits: 2,
    requirementGroup: "major-design",
  }),
];
assert.equal(calculateGraduation(designOverflow).major.design, 4);

const generalCap = [
  complete({
    id: "gp",
    courseCode: "GEN-PHYS",
    courseName: "應用物理與實驗",
    credits: 2,
    requirementGroup: "general",
    generalSubarea: "naturalEngineering",
  }),
  complete({
    id: "gc",
    courseCode: "GEN-CHEM",
    courseName: "應用化學與實驗",
    credits: 2,
    requirementGroup: "general",
    generalSubarea: "naturalEngineering",
  }),
];
const generalResult = calculateGraduation(generalCap);
assert.equal(generalResult.general.rules.domain.naturalEngineeringRawCourses, 2);
assert.equal(generalResult.general.rules.domain.naturalEngineeringRecognizedCourses, 1);
assert.equal(generalResult.general.rules.domain.areaCredits.naturalEngineering, 2);

const unrelated = [
  complete({
    id: "x",
    courseCode: "x",
    courseName: "不認列活動",
    credits: 3,
    requirementGroup: "other",
    countsTowardGraduation: false,
  }),
];
assert.equal(calculateGraduation(unrelated).total.recognized, 0);

const electives = Array.from({ length: 11 }, (_, index) =>
  complete({
    id: `e-${index}`,
    courseCode: `e-${index}`,
    courseName: `選修 ${index}`,
    credits: 3,
    requirementGroup: "elective",
    departmentElective: index < 3,
  }),
);
const electiveResult = calculateGraduation(electives);
assert.equal(electiveResult.elective.recognized, 31);
assert.equal(electiveResult.elective.departmentRecognized, 9);
assert.equal(electiveResult.elective.departmentRemaining, 1);

const riskSummary = calculateRiskSummary([
  complete({
    id: "done",
    courseCode: "done",
    courseName: "已完成高風險",
    credits: 3,
    requirementGroup: "major-core",
    gpaRisk: "高",
  }),
  normalizeCourse({
    id: "todo",
    courseCode: "todo",
    courseName: "未完成高風險",
    credits: 3,
    requirementGroup: "major-core",
    gpaRisk: "高",
  }),
]);
assert.deepEqual(riskSummary.highRisk.map((course) => course.courseName), ["未完成高風險"]);

assert.equal(decisionLabel("priority"), `${APP_CONFIG.currentTerm} 優先`);
assert.equal(decisionLabel("next"), `${APP_CONFIG.nextTerm} 預備`);

const physics = normalizeCourse({
  courseCode: "PHYS-1",
  courseName: "普通物理學（一）",
  credits: 3,
  requirementGroup: "major-core",
  status: "未修",
});
const fluid = normalizeCourse({
  courseCode: "FLUID-1",
  courseName: "流體力學（一）",
  credits: 3,
  requirementGroup: "major-core",
  prerequisites: [{ courseCode: "PHYS-1", minimumGrade: 45 }],
});
assert.equal(getEligibility(fluid, [physics, fluid]).eligible, false);
assert.equal(getEligibility(fluid, [complete(physics, { grade: "50" }), fluid]).eligible, true);
assert.equal(getEligibility(fluid, [complete(physics, { grade: "40" }), fluid]).eligible, false);
assert.equal(
  getEligibility(fluid, [normalizeCourse({ ...physics, status: "已抵免" }), fluid]).eligible,
  true,
);

const a = normalizeCourse({
  id: "a",
  courseCode: "a",
  courseName: "A",
  credits: 3,
  requirementGroup: "major-core",
  term: APP_CONFIG.currentTerm,
  slots: [{ day: 1, start: 7, end: 8 }],
});
const b = normalizeCourse({
  id: "b",
  courseCode: "b",
  courseName: "B",
  credits: 3,
  requirementGroup: "major-core",
  term: APP_CONFIG.currentTerm,
  slots: [{ day: 1, start: 8, end: 9 }],
});
assert.equal(calculateConflicts([a, b]).length, 1);

const tooSmall = [
  normalizeCourse({
    id: "p1",
    courseCode: "p1",
    courseName: "P1",
    credits: 3,
    requirementGroup: "general",
    planA: true,
    riskScore: 1,
  }),
];
assert.equal(planStats(tooSmall, PLAN_CONFIG[0]).valid, false);
const validPlan = Array.from({ length: 4 }, (_, i) =>
  normalizeCourse({
    id: `vp-${i}`,
    courseCode: `vp-${i}`,
    courseName: `VP${i}`,
    credits: 3,
    requirementGroup: "general",
    planA: true,
    riskScore: 2,
    necessityScore: 3,
  }),
);
assert.equal(planStats(validPlan, PLAN_CONFIG[0]).valid, true);

const candidate = normalizeCourse({
  id: "candidate",
  courseCode: "candidate",
  courseName: "候選",
  credits: 3,
  requirementGroup: "major-core",
  term: APP_CONFIG.currentTerm,
  decision: "priority",
});
assert.deepEqual(candidateCourses([candidate]).map((course) => course.courseName), ["候選"]);

const legacy = {
  courses: [
    {
      id: "legacy",
      courseName: "工程圖學",
      credits: 2,
      category: "水利必修",
      status: "已修",
      decisionStatus: "115-1 優先",
    },
  ],
};
const migrated = migrateState(legacy);
assert.equal(migrated.courses[0].requirementGroup, "major-core");
assert.equal(migrated.courses[0].decision, "priority");
const roundTrip = parseBackupPayload(serializeBackup(migrated.courses));
assert.equal(roundTrip.courses[0].courseName, "工程圖學");
assert.throws(() => parseBackupPayload({ version: 999, courses: [] }), /高於目前支援版本/);

let crud = createCleanDefaultState().courses;
crud = upsertCourse(crud, {
  id: "custom-ai",
  courseCode: "CUSTOM-AI",
  courseName: "AI 應用",
  credits: 3,
  recognizedCredits: 3,
  requirementGroup: "elective",
  countsTowardGraduation: true,
  departmentElective: true,
});
assert.equal(crud.some((course) => course.id === "custom-ai"), true);
crud = upsertCourse(crud, {
  ...crud.find((course) => course.id === "custom-ai"),
  courseName: "AI 應用實作",
});
assert.equal(crud.find((course) => course.id === "custom-ai").courseName, "AI 應用實作");
crud = deleteCourse(crud, "custom-ai");
assert.equal(crud.some((course) => course.id === "custom-ai"), false);
assert.equal(
  validateCourseCollection([
    { id: "x", courseCode: "x", courseName: "A" },
    { id: "x", courseCode: "y", courseName: "B" },
  ]).valid,
  false,
);

const graph = buildDependencyGraph(COURSE_CATALOG);
assert.equal(graph.edges.some((edge) => edge.from === "PHYS-1" && edge.to === "FLUID-1"), true);
assert.equal(graph.edges.some((edge) => edge.from === "ENG-MECH" && edge.to === "MATERIAL"), true);

assert.equal(gradeToPoint(90), 4.3);
assert.equal(gradeToPoint(85), 4.0);
assert.equal(gradeToPoint(60), 1.7);
assert.equal(gradeToPoint(59), 0);
const gpa = calculateGpaProjection({
  currentGpa: 3,
  currentCredits: 30,
  courses: [
    normalizeCourse({
      id: "g1",
      courseCode: "g1",
      courseName: "GPA 課",
      credits: 3,
      requirementGroup: "elective",
      term: APP_CONFIG.currentTerm,
      expectedGrade: "90",
    }),
  ],
});
assert.equal(gpa.semesterGpa, 4.3);
assert.equal(gpa.semesterCredits, 3);
assert.equal(gpa.projectedGpa, 3.12);

const csvSource = [
  normalizeCourse({
    id: "csv-1",
    courseCode: "CSV-1",
    courseName: "CSV 課程",
    credits: 2,
    recognizedCredits: 2,
    requirementGroup: "elective",
    departmentElective: true,
  }),
];
const csv = exportCoursesToCsv(csvSource);
const imported = importCoursesFromCsv(csv);
assert.equal(imported[0].courseName, "CSV 課程");
assert.equal(imported[0].departmentElective, true);
assert.match(
  exportCoursesToCsv([
    normalizeCourse({
      id: "bad",
      courseCode: "bad",
      courseName: '=HYPERLINK("bad")',
      credits: 1,
      requirementGroup: "elective",
    }),
  ]),
  /'=HYPERLINK/,
);

const defaults = createCleanDefaultState();
assert.equal(
  defaults.courses.some((course) => ["已修", "已抵免", "已認列"].includes(course.status)),
  false,
);

console.log("credit-map P0-P3 regression tests passed");
