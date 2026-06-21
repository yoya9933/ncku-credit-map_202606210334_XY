import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL("./app.js", import.meta.url), "utf8"), context);
const indexHtml = readFileSync(new URL("./index.html", import.meta.url), "utf8");

const {
  COURSE_DECISION_STATUSES,
  DEFAULT_REQUIREMENTS,
  DEFAULT_COURSES,
  CONFLICT_MATRIX,
  DESIGN_REQUIRED_COURSE_NAMES,
  PROFESSIONAL_REQUIRED_COURSES,
  applyFilters,
  calculateCandidateCourses1151,
  calculateDashboard,
  calculateGapAnalysis,
  buildCourseDecisionViewModel,
  buildGapAnalysisViewModel,
  calculatePlanningAnalysis,
  calculateSummerPrepPlan,
  completedStatuses,
  exportCoursesToCsv,
  getCourseQuadrant,
  getCourseRecommendation,
  getCourseDetailRows,
  getCourseTableSummary,
  getPlanStats,
} = context.CreditMapLogic;

assert.equal(DEFAULT_REQUIREMENTS.totalRequiredCredits, 135);
assert.equal(DEFAULT_REQUIREMENTS.majorRequiredCredits, 76);
assert.equal(DEFAULT_REQUIREMENTS.generalCredits, 28);
assert.equal(DEFAULT_REQUIREMENTS.electiveCredits, 31);
assert.equal(
  PROFESSIONAL_REQUIRED_COURSES.reduce((total, course) => total + course.credits, 0),
  71,
);
assert.equal(PROFESSIONAL_REQUIRED_COURSES.length, 30);
assert.equal(DESIGN_REQUIRED_COURSE_NAMES.length, 4);
assert.equal(DEFAULT_COURSES.some((course) => course.courseName === "水利及海洋工程概論"), true);

const defaultDashboard = calculateDashboard(DEFAULT_COURSES, DEFAULT_REQUIREMENTS);
assert.equal(defaultDashboard.completedCredits, 24);
assert.equal(defaultDashboard.remainingCredits, 111);
assert.equal(defaultDashboard.generalCompletedCredits, 16);
assert.equal(defaultDashboard.majorRequiredCompletedCredits, 8);
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "微積分（一）").status, "已抵免");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "海洋物理學").status, "已抵免");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "工程數學（一）").status, "已抵免");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "大學國文（一）").status, "已抵免");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "應用化學與實驗").status, "已抵免");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "普通物理學（一）").planSemester, "115-1 可修");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "普通物理學（一）").priority, "立即");
assert.match(DEFAULT_COURSES.find((course) => course.courseName === "流體力學（一）").prerequisites, /普通物理學（一）/);
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "流體力學（一）").priority, "先補先修");
assert.match(DEFAULT_COURSES.find((course) => course.courseName === "工程圖學").schedule, /\[5\]5/);
assert.ok(Array.isArray(COURSE_DECISION_STATUSES), "COURSE_DECISION_STATUSES should be exported");
assert.deepEqual(JSON.parse(JSON.stringify(COURSE_DECISION_STATUSES)), [
  "已完成",
  "115-1 優先",
  "115-1 備選",
  "115-2 預備",
  "先修未滿",
  "畢業前處理",
  "待問系辦",
]);
const defaultPhysics = DEFAULT_COURSES.find((course) => course.courseName === "普通物理學（一）");
assert.equal(defaultPhysics.decisionStatus, "115-1 優先");
assert.equal(defaultPhysics.offeringCadence, "上學期");
assert.equal(defaultPhysics.delayRisk, "高");
assert.equal(defaultPhysics.summerPrepPriority, "A");
assert.equal(defaultPhysics.formalScheduleDecision, "是");
assert.equal(defaultPhysics.necessityScore, 3);
assert.equal(defaultPhysics.riskScore, 3);
assert.equal(defaultPhysics.planA, false);
assert.equal(defaultPhysics.planB, false);
assert.equal(defaultPhysics.planC, false);
assert.equal(defaultPhysics.decisionNote, "");
assert.match(defaultPhysics.conflictWith, /工程地質學/);
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "微積分（二）").decisionStatus, "115-2 預備");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "流體力學（一）").decisionStatus, "先修未滿");
assert.equal(DEFAULT_COURSES.find((course) => course.courseName === "專題研究（二）").decisionStatus, "畢業前處理");
assert.deepEqual(JSON.parse(JSON.stringify(getCourseTableSummary(defaultPhysics))), {
  courseName: "普通物理學（一）",
  credits: 3,
  category: "水利必修",
  status: "未修",
  decisionStatus: "115-1 優先",
  gpaRisk: "中",
  delayRisk: "高",
  formalScheduleDecision: "是",
  hasConflict: "有",
});
assert.deepEqual(JSON.parse(JSON.stringify(getCourseDetailRows(defaultPhysics))), [
  ["學期", "待排"],
  ["成績", "-"],
  ["必修", "是"],
  ["卡畢業", "是"],
  ["重修", "否"],
  ["建議修課時間", "大一上"],
  ["開課節奏", "上學期"],
  ["預計/可修學期", "115-1 可修"],
  ["優先順序", "立即"],
  ["暑假預習優先度", "A"],
  ["先修限制", "-"],
  ["上課時間", "[1]8、[4]5~6，理學教學大樓 36173"],
  ["教師", "管培辰"],
  ["衝堂對象", "工程地質學"],
  ["備註", "114 檢核表專業必修；第一次修課須為本系所開課程。"],
]);
const courseListMarkup = indexHtml.match(/<h2>課程列表<\/h2>[\s\S]*?<thead>([\s\S]*?)<\/thead>/)?.[1] || "";
assert.deepEqual(
  [...courseListMarkup.matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]),
  ["課名", "學分", "類別", "學分狀態", "決策狀態", "GPA", "延後風險", "正式課表", "衝堂", "操作"],
);
assert.match(indexHtml, /name="necessityScore"/);
assert.match(indexHtml, /name="riskScore"/);
assert.match(indexHtml, /name="planA"/);
assert.match(indexHtml, /name="planB"/);
assert.match(indexHtml, /name="planC"/);
assert.match(indexHtml, /name="decisionNote"/);
const courseDecisionMarkup = indexHtml.match(/<h2>課程決策器<\/h2>[\s\S]*?<thead>([\s\S]*?)<\/thead>/)?.[1] || "";
assert.deepEqual(
  [...courseDecisionMarkup.matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]),
  ["課名", "學分", "必要性", "風險", "四象限", "建議", "A案", "B案", "C案", "決策備註"],
);

const defaultGapAnalysis = calculateGapAnalysis(DEFAULT_COURSES, DEFAULT_REQUIREMENTS);
assert.equal(defaultGapAnalysis.categoryRemainingCredits["通識"], 12);
assert.equal(defaultGapAnalysis.categoryRemainingCredits["水利必修"], 68);
const defaultPlanning = calculatePlanningAnalysis(DEFAULT_COURSES);
const defaultGapView = buildGapAnalysisViewModel(DEFAULT_COURSES, DEFAULT_REQUIREMENTS);
assert.deepEqual(JSON.parse(JSON.stringify(defaultGapView.summaryCards.slice(0, 3))), [
  {
    label: "畢業總缺口",
    value: 111,
    unit: "學分",
    detail: "已完成 24 / 135 學分",
    tone: "warning",
  },
  {
    label: "水利必修缺口",
    value: 68,
    unit: "學分",
    detail: "已完成 8 / 76 學分",
    tone: "danger",
  },
  {
    label: "通識缺口",
    value: 12,
    unit: "學分",
    detail: "已完成 16 / 28 學分",
    tone: "warning",
  },
]);
assert.deepEqual(JSON.parse(JSON.stringify(defaultGapView.categoryRows.slice(0, 2))), [
  {
    category: "水利必修",
    completedCredits: 8,
    requiredCredits: 76,
    remainingCredits: 68,
    progressPercent: 11,
  },
  {
    category: "通識",
    completedCredits: 16,
    requiredCredits: 28,
    remainingCredits: 12,
    progressPercent: 57,
  },
]);
assert.deepEqual(
  JSON.parse(JSON.stringify(defaultGapView.actionSections.map((section) => [section.title, section.items.length]))),
  [
    ["尚未修完的必修", defaultGapAnalysis.unfinishedRequiredCourses.length],
    ["GPA 高風險課", defaultGapAnalysis.highRiskCourses.length],
    ["卡畢業課", defaultGapAnalysis.blockingCourses.length],
    ["115-1 候選課", defaultGapAnalysis.septemberCandidateCourses.length],
    ["特殊規則缺口", defaultGapAnalysis.specialRuleGaps.length],
    ["先修未滿", defaultPlanning.prerequisiteBlocked.length],
  ],
);

assert.deepEqual(
  JSON.parse(JSON.stringify(defaultPlanning.currentTermPriority.map((course) => course.courseName).slice(0, 4))),
  ["普通物理學（一）", "普通物理學實驗（一）", "工程圖學", "水利及海洋工程概論"],
);
assert.equal(
  defaultPlanning.prerequisiteBlocked.some((course) => course.courseName === "流體力學（一）"),
  true,
);
assert.deepEqual(
  JSON.parse(
    JSON.stringify(
      calculateCandidateCourses1151(DEFAULT_COURSES)
        .slice(0, 6)
        .map((course) => [course.courseName, course.formalScheduleDecision]),
    ),
  ),
  [
    ["普通物理學（一）", "是"],
    ["普通物理學實驗（一）", "是"],
    ["工程圖學", "備選"],
    ["水利及海洋工程概論", "備選"],
    ["工程地質學", "備選"],
    ["水資源工程（一）", "備選"],
  ],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(CONFLICT_MATRIX.map((item) => [item.courseA, item.timeA, item.courseB, item.timeB, item.conclusion]))),
  [
    ["普通物理學（一）", "一 8", "工程地質學", "一 7-8", "不能同修"],
    ["普通物理學實驗（一）", "三 1-3", "水資源工程（一）", "三 3-4", "不能同修"],
    ["工程圖學", "五 5-8", "防洪排水工程設計", "五 6-8", "不同修"],
    ["水利及海洋工程概論", "一 7", "工程地質學", "一 7-8", "不能同修"],
    ["水利及海洋工程概論", "一 7", "海洋工程設計", "一 6-8", "不能同修"],
  ],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(calculateSummerPrepPlan(DEFAULT_COURSES).map((item) => [item.courseName, item.likelihood, item.weeklyLoad]))),
  [
    ["普通物理學（一）", "高", "每週 3 次"],
    ["普通物理學實驗（一）", "高", "每週 1 次"],
    ["工程圖學", "中高", "每週 1-2 次"],
    ["工程地質學", "中", "每週 0-1 次"],
    ["水資源工程（一）", "中", "每週 0-1 次"],
    ["微積分（二）", "高但 115-2", "每週 2-3 次"],
    ["工程力學", "中高但 115-2", "每週 1-2 次"],
  ],
);

const decisionCourses = [
  {
    id: "decision-1",
    courseName: "流體力學（一）",
    credits: 3,
    category: "水利必修",
    status: "未修",
    decisionStatus: "115-1 優先",
    necessityScore: 5,
    riskScore: 5,
    planA: true,
    planB: true,
    planC: false,
    decisionNote: "核心課但需要限量",
  },
  {
    id: "decision-2",
    courseName: "水利及海洋工程概論",
    credits: 1,
    category: "水利必修",
    status: "未修",
    decisionStatus: "115-1 備選",
    necessityScore: 5,
    riskScore: 2,
    planA: true,
    planB: true,
    planC: false,
  },
  {
    id: "decision-3",
    courseName: "通識 A",
    credits: 2,
    category: "通識",
    status: "未修",
    decisionStatus: "115-1 備選",
    necessityScore: 3,
    riskScore: 2,
    planA: true,
    planB: true,
    planC: true,
  },
  {
    id: "decision-4",
    courseName: "高風險選修",
    credits: 3,
    category: "自由選修",
    status: "未修",
    decisionStatus: "待問系辦",
    necessityScore: 2,
    riskScore: 4,
    planA: false,
    planB: true,
    planC: false,
  },
  {
    id: "decision-5",
    courseName: "先修未滿課",
    credits: 3,
    category: "水利必修",
    status: "未修",
    decisionStatus: "先修未滿",
    necessityScore: 5,
    riskScore: 5,
    planA: true,
    planB: false,
    planC: false,
  },
];

assert.equal(getCourseQuadrant(decisionCourses[0]), "高必要高風險");
assert.equal(getCourseQuadrant(decisionCourses[1]), "高必要低/中風險");
assert.equal(getCourseQuadrant(decisionCourses[2]), "低必要低/中風險");
assert.equal(getCourseQuadrant(decisionCourses[3]), "低必要高風險");
assert.equal(getCourseRecommendation(decisionCourses[0]), "核心但限量");
assert.equal(getCourseRecommendation(decisionCourses[1]), "優先");
assert.equal(getCourseRecommendation(decisionCourses[2]), "平衡用");
assert.equal(getCourseRecommendation(decisionCourses[3]), "暫緩");
assert.equal(getCourseRecommendation(decisionCourses[4]), "先修未滿");

const planAStats = getPlanStats(decisionCourses, "planA");
assert.equal(planAStats.totalCredits, 9);
assert.equal(planAStats.courseCount, 4);
assert.equal(planAStats.highNeedHighRiskCount, 2);
assert.equal(planAStats.averageRisk, 3.5);
assert.equal(planAStats.balanceCourseCount, 1);
assert.equal(planAStats.prerequisiteMissingCount, 1);
assert.deepEqual(
  JSON.parse(JSON.stringify(planAStats.courses.map((course) => course.courseName))),
  ["流體力學（一）", "水利及海洋工程概論", "通識 A", "先修未滿課"],
);

const decisionView = buildCourseDecisionViewModel(decisionCourses);
assert.deepEqual(JSON.parse(JSON.stringify(decisionView.quadrantSummary.map((item) => [item.label, item.count]))), [
  ["高必要高風險", 2],
  ["高必要低/中風險", 1],
  ["低必要高風險", 1],
  ["低必要低/中風險", 1],
]);
assert.deepEqual(JSON.parse(JSON.stringify(decisionView.planStats.map((item) => [item.label, item.stats.totalCredits]))), [
  ["A 案：穩健復學", 9],
  ["B 案：正常推進", 9],
  ["C 案：保守修復", 2],
]);

const decisionCsv = exportCoursesToCsv(decisionCourses);
assert.match(decisionCsv, /必要性分數,風險分數,四象限,建議等級,A案,B案,C案,決策備註/);
assert.match(decisionCsv, /"高必要高風險","核心但限量","是","是","否","核心課但需要限量"/);
const courses = [
  {
    id: "c1",
    courseName: "微積分（一）",
    credits: 3,
    category: "水利必修",
    status: "已修",
    semester: "已完成",
    grade: "",
    isRequired: true,
    isBlocking: false,
    gpaRisk: "中",
    retakeNeeded: false,
    note: "基礎課程",
  },
  {
    id: "c2",
    courseName: "微積分（二）",
    credits: 3,
    category: "水利必修",
    status: "未修",
    semester: "待排",
    grade: "",
    isRequired: true,
    isBlocking: true,
    gpaRisk: "高",
    retakeNeeded: false,
    note: "復學後需優先處理",
  },
  {
    id: "c3",
    courseName: "工程數學（二）",
    credits: 3,
    category: "水利必修",
    status: "候選",
    semester: "114-1",
    grade: "",
    isRequired: true,
    isBlocking: true,
    gpaRisk: "高",
    retakeNeeded: false,
    note: "需評估是否和其他高壓課同修",
  },
  {
    id: "c4",
    courseName: "通識課程",
    credits: 2,
    category: "通識",
    status: "已抵免",
    semester: "已完成",
    grade: "",
    isRequired: false,
    isBlocking: false,
    gpaRisk: "低",
    retakeNeeded: false,
    note: "可作為 GPA 緩衝課",
  },
];

assert.equal(completedStatuses.has("已修"), true);
assert.equal(completedStatuses.has("候選"), false);

const dashboard = calculateDashboard(courses, {
  ...DEFAULT_REQUIREMENTS,
  totalRequiredCredits: 128,
  generalCredits: 4,
});

assert.equal(dashboard.completedCredits, 5);
assert.equal(dashboard.remainingCredits, 123);
assert.equal(dashboard.majorRequiredCompletedCredits, 3);
assert.equal(dashboard.generalCompletedCredits, 2);
assert.equal(dashboard.highRiskCount, 2);
assert.equal(dashboard.blockingCount, 2);

const gaps = calculateGapAnalysis(courses, {
  ...DEFAULT_REQUIREMENTS,
  totalRequiredCredits: 128,
  majorRequiredCredits: 6,
  generalCredits: 4,
});

assert.equal(gaps.totalRemainingCredits, 123);
assert.equal(gaps.categoryRemainingCredits["水利必修"], 3);
assert.equal(gaps.categoryRemainingCredits["通識"], 2);
assert.deepEqual(
  gaps.unfinishedRequiredCourses.map((course) => course.courseName),
  ["微積分（二）", "工程數學（二）"],
);
assert.deepEqual(
  gaps.highRiskCourses.map((course) => course.courseName),
  ["微積分（二）", "工程數學（二）"],
);
assert.deepEqual(
  gaps.septemberCandidateCourses.map((course) => course.courseName),
  ["工程數學（二）"],
);
assert.deepEqual(
  JSON.parse(JSON.stringify(gaps.specialRuleGaps.map((gap) => [gap.label, gap.remainingCredits]))),
  [
    ["設計必修（任選二科）", 4],
    ["必選修：水利及海洋工程概論", 1],
  ],
);

const designRuleSatisfied = calculateGapAnalysis(
  [
    {
      id: "d1",
      courseName: "防洪排水工程設計",
      credits: 2,
      category: "水利必修",
      status: "已修",
      semester: "114-1",
      grade: "",
      isRequired: false,
      isBlocking: false,
      gpaRisk: "中",
      retakeNeeded: false,
      note: "",
    },
    {
      id: "d2",
      courseName: "水資源工程設計",
      credits: 2,
      category: "水利必修",
      status: "已修",
      semester: "114-1",
      grade: "",
      isRequired: false,
      isBlocking: false,
      gpaRisk: "中",
      retakeNeeded: false,
      note: "",
    },
    {
      id: "r1",
      courseName: "水利及海洋工程概論",
      credits: 1,
      category: "水利必修",
      status: "已認列",
      semester: "114-1",
      grade: "",
      isRequired: true,
      isBlocking: true,
      gpaRisk: "低",
      retakeNeeded: false,
      note: "",
    },
  ],
  DEFAULT_REQUIREMENTS,
);
assert.deepEqual(JSON.parse(JSON.stringify(designRuleSatisfied.specialRuleGaps)), []);

const filtered = applyFilters(courses, {
  category: "水利必修",
  status: "未修",
  gpaRisk: "高",
  isRequired: "true",
  isBlocking: "true",
});
assert.deepEqual(filtered.map((course) => course.courseName), ["微積分（二）"]);

const csv = exportCoursesToCsv(courses);
assert.match(csv, /課名,學分,類別,狀態/);
assert.match(csv, /開課節奏,延後風險,決策狀態,必要性分數,風險分數,四象限,建議等級,A案,B案,C案,決策備註,暑假預習優先度,衝堂對象,是否放入正式課表/);
assert.match(csv, /"微積分（一）"/);
