import {
  APP_CONFIG,
  COURSE_CATALOG,
  OFFICIAL_REQUIREMENT_IDS,
  PLAN_CONFIG,
  REQUIREMENTS,
} from "./curriculum.js";
import { getDefaultOffering } from "./term-data.js";

export { APP_CONFIG, COURSE_CATALOG, OFFICIAL_REQUIREMENT_IDS, PLAN_CONFIG, REQUIREMENTS };
export const COMPLETED_STATUSES = new Set(["已修", "已抵免", "已認列"]);
export const COURSE_STATUSES = ["未修", "候選", "已修", "已抵免", "已認列", "重修"];
export const DECISIONS = ["none", "priority", "backup", "next", "later", "ask"];
export const REQUIREMENT_GROUPS = [
  "major-core",
  "major-design",
  "major-required-elective",
  "general",
  "elective",
  "cross-domain",
  "gate",
  "other",
];

const byCode = new Map(COURSE_CATALOG.map((course) => [course.courseCode, course]));
const byName = new Map(COURSE_CATALOG.map((course) => [course.courseName, course]));
const officialMajorCore = new Set(OFFICIAL_REQUIREMENT_IDS.majorCore);
const officialDesign = new Set(OFFICIAL_REQUIREMENT_IDS.design);
const num = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const bool = (value, fallback = false) =>
  value == null || value === ""
    ? fallback
    : [true, "true", "on", 1, "1", "yes", "是"].includes(value);
const clean = (value) => String(value ?? "").trim();

export const isCompleted = (course) => COMPLETED_STATUSES.has(course.status);

export function decisionLabel(decision, config = APP_CONFIG) {
  return (
    {
      none: "未設定",
      priority: `${config.currentTerm} 優先`,
      backup: `${config.currentTerm} 備選`,
      next: `${config.nextTerm} 預備`,
      later: "畢業前處理",
      ask: "待問系辦",
    }[decision] || "未設定"
  );
}

function legacyDecision(source = {}) {
  const text = clean(source.decisionStatus);
  if (text.includes("優先")) return "priority";
  if (text.includes("備選")) return "backup";
  if (text.includes("預備")) return "next";
  if (text.includes("畢業前")) return "later";
  if (text.includes("待問")) return "ask";
  return null;
}

function inferRequirementGroup(source, catalog) {
  if (catalog?.requirementGroup) return catalog.requirementGroup;
  if (source.requirementGroup) return source.requirementGroup;
  const name = clean(source.courseName);
  if (["防洪排水工程設計", "水資源工程設計", "海洋工程設計", "海岸工程設計"].includes(name)) {
    return "major-design";
  }
  if (name === "水利及海洋工程概論") return "major-required-elective";
  if (name.includes("英語畢業門檻") || name.includes("體育（必修四學期）")) return "gate";
  if (source.category === "水利必修") return "major-core";
  if (source.category === "通識") return "general";
  if (source.category === "自由選修") return "elective";
  if (source.category === "跨域") return "cross-domain";
  return "other";
}

export function parseLegacySlots(schedule) {
  const slots = [];
  for (const match of clean(schedule).matchAll(/\[(\d)\](\d+)(?:~(\d+))?/g)) {
    slots.push({
      day: Number(match[1]),
      start: Number(match[2]),
      end: Number(match[3] || match[2]),
    });
  }
  return slots;
}

export function normalizeCourse(source = {}) {
  const catalog = byCode.get(source.courseCode) || byName.get(source.courseName) || null;
  const base = { ...(catalog || {}), ...source };
  const requirementGroup = inferRequirementGroup(source, catalog);
  const offering = getDefaultOffering(
    base.courseCode || catalog?.courseCode,
    APP_CONFIG.currentTerm,
    APP_CONFIG.nextTerm,
  );
  const credits = Math.max(0, num(base.credits));
  const defaultCounts = credits > 0 && !["gate", "other"].includes(requirementGroup);
  const recognizedCredits =
    base.recognizedCredits == null || base.recognizedCredits === ""
      ? credits
      : clamp(num(base.recognizedCredits), 0, credits);
  const migratedDecision = legacyDecision(source);
  const decision =
    migratedDecision ||
    (DECISIONS.includes(source.decision)
      ? source.decision
      : DECISIONS.includes(catalog?.decision)
        ? catalog.decision
        : "none");
  const term = clean(source.term || offering?.term || "");
  const slots =
    Array.isArray(source.slots) && source.slots.length
      ? source.slots
      : offering?.slots || parseLegacySlots(source.schedule);

  return {
    id: clean(base.id || base.courseCode),
    courseCode: clean(base.courseCode || catalog?.courseCode),
    officialCourseCode: clean(base.officialCourseCode || catalog?.officialCourseCode),
    courseName: clean(base.courseName),
    credits,
    recognizedCredits,
    requirementGroup,
    category: clean(base.category || catalog?.category || "其他"),
    countsTowardGraduation: bool(base.countsTowardGraduation, defaultCounts),
    status: COURSE_STATUSES.includes(base.status) ? base.status : "未修",
    semester: clean(base.semester || "待排"),
    grade: clean(base.grade),
    expectedGrade: clean(base.expectedGrade),
    gpaRisk: ["低", "中", "高"].includes(base.gpaRisk) ? base.gpaRisk : "中",
    necessityScore: clamp(Math.round(num(base.necessityScore, 3)), 1, 5),
    riskScore: clamp(Math.round(num(base.riskScore, 3)), 1, 5),
    decision,
    planA: bool(base.planA),
    planB: bool(base.planB),
    planC: bool(base.planC),
    decisionNote: clean(base.decisionNote),
    term,
    teacher: clean(source.teacher || offering?.teacher),
    location: clean(source.location || offering?.location),
    offeringCertainty: clean(source.offeringCertainty || offering?.certainty),
    slots: (slots || []).map((slot) => ({
      day: num(slot.day),
      start: num(slot.start),
      end: num(slot.end, num(slot.start)),
    })),
    prerequisites: Array.isArray(source.prerequisites)
      ? source.prerequisites
      : catalog?.prerequisites || [],
    departmentElective: bool(base.departmentElective),
    generalSubarea: clean(base.generalSubarea || catalog?.generalSubarea),
    gateType: clean(base.gateType || catalog?.gateType),
    gateProgress: Math.max(0, num(base.gateProgress)),
    source: clean(base.source || "user"),
    verifiedAt: clean(base.verifiedAt),
  };
}

export function validateCourseCollection(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  const errors = [];
  const ids = new Set();
  const codes = new Set();
  courses.forEach((course, index) => {
    if (!course.id) errors.push(`第 ${index + 1} 筆缺少 id`);
    else if (ids.has(course.id)) errors.push(`重複 id：${course.id}`);
    else ids.add(course.id);
    if (!course.courseName) errors.push(`第 ${index + 1} 筆缺少課程名稱`);
    if (course.courseCode) {
      if (codes.has(course.courseCode)) errors.push(`重複內部課程代碼：${course.courseCode}`);
      codes.add(course.courseCode);
    }
  });
  return { valid: errors.length === 0, errors, courses };
}

export function upsertCourse(inputCourses, inputCourse) {
  const course = normalizeCourse(inputCourse);
  if (!course.id || !course.courseName) throw new Error("課程需要 id 與課程名稱。");
  const exists = inputCourses.some((item) => normalizeCourse(item).id === course.id);
  const next = exists
    ? inputCourses.map((item) =>
        normalizeCourse(item).id === course.id ? course : normalizeCourse(item),
      )
    : [...inputCourses.map(normalizeCourse), course];
  const check = validateCourseCollection(next);
  if (!check.valid) throw new Error(check.errors.join("；"));
  return check.courses;
}

export function deleteCourse(inputCourses, id) {
  return inputCourses.map(normalizeCourse).filter((course) => course.id !== id);
}

export function migrateState(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const courses = Array.isArray(source.courses)
    ? source.courses.map(normalizeCourse)
    : COURSE_CATALOG.map(normalizeCourse);
  const validation = validateCourseCollection(courses);
  if (!validation.valid) {
    throw new Error(`課程資料完整性錯誤：${validation.errors.join("；")}`);
  }
  return {
    version: APP_CONFIG.backupVersion,
    config: {
      currentTerm: source.config?.currentTerm || APP_CONFIG.currentTerm,
      nextTerm: source.config?.nextTerm || APP_CONFIG.nextTerm,
    },
    courses: validation.courses,
  };
}

const recognized = (course) =>
  isCompleted(course) && course.countsTowardGraduation ? course.recognizedCredits : 0;

function sumRecognized(courses) {
  return courses.reduce((sum, course) => sum + recognized(course), 0);
}

function officialCourses(courses, allowedCodes) {
  return courses.filter((course) => allowedCodes.has(course.courseCode));
}

function completedGeneral(courses, subarea) {
  return courses.filter(
    (course) =>
      course.requirementGroup === "general" &&
      course.generalSubarea === subarea &&
      isCompleted(course) &&
      course.countsTowardGraduation,
  );
}

function hasCourseRecord(course) {
  if (!course) return false;
  return (
    isCompleted(course) ||
    course.status === "重修" ||
    course.grade !== "" ||
    (course.semester !== "" && course.semester !== "待排")
  );
}

export function calculateGeneralEducation(inputCourses, requirements = REQUIREMENTS.general) {
  const courses = inputCourses.map(normalizeCourse);
  const languageChinese = sumRecognized(completedGeneral(courses, "languageChinese"));
  const languageForeign = sumRecognized(completedGeneral(courses, "languageForeign"));
  const language = Math.min(languageChinese + languageForeign, requirements.language.total);
  const tainan = Math.min(sumRecognized(completedGeneral(courses, "tainan")), requirements.tainan);

  const domainAreaCredits = Object.fromEntries(
    requirements.domain.areas.map((area) => [area, sumRecognized(completedGeneral(courses, area))]),
  );
  const naturalCourses = completedGeneral(courses, "naturalEngineering").sort(
    (a, b) => b.recognizedCredits - a.recognizedCredits,
  );
  const naturalRecognized = naturalCourses
    .slice(0, requirements.domain.naturalEngineeringMaxCourses)
    .reduce((sum, course) => sum + course.recognizedCredits, 0);
  domainAreaCredits.naturalEngineering = naturalRecognized;
  const domainRaw = Object.values(domainAreaCredits).reduce((sum, credits) => sum + credits, 0);
  const domain = Math.min(domainRaw, requirements.domain.maxRecognizedCredits);
  const domainDistinctAreas = Object.values(domainAreaCredits).filter((credits) => credits > 0).length;

  const fusionRegular = sumRecognized(completedGeneral(courses, "fusion"));
  const fusionLifePracticeRaw = sumRecognized(completedGeneral(courses, "fusionLifePractice"));
  const fusionLifePractice = Math.min(
    fusionLifePracticeRaw,
    requirements.fusion.lifePracticeMaxCredits,
  );
  const fusionRaw = fusionRegular + fusionLifePractice;
  const fusion = Math.min(fusionRaw, requirements.fusion.maxRecognizedCredits);

  const recognizedCredits = Math.min(language + tainan + domain + fusion, requirements.total);
  const rules = {
    language: {
      recognized: language,
      required: requirements.language.total,
      chinese: languageChinese,
      chineseRequired: requirements.language.chinese,
      foreign: languageForeign,
      foreignRequired: requirements.language.foreign,
      satisfied:
        languageChinese >= requirements.language.chinese &&
        languageForeign >= requirements.language.foreign,
    },
    tainan: {
      recognized: tainan,
      required: requirements.tainan,
      satisfied: tainan >= requirements.tainan,
    },
    domain: {
      recognized: domain,
      minimum: requirements.domain.minCredits,
      maximum: requirements.domain.maxRecognizedCredits,
      distinctAreas: domainDistinctAreas,
      requiredDistinctAreas: requirements.domain.minDistinctAreas,
      areaCredits: domainAreaCredits,
      naturalEngineeringRawCourses: naturalCourses.length,
      naturalEngineeringRecognizedCourses: Math.min(
        naturalCourses.length,
        requirements.domain.naturalEngineeringMaxCourses,
      ),
      satisfied:
        domain >= requirements.domain.minCredits &&
        domainDistinctAreas >= requirements.domain.minDistinctAreas,
    },
    fusion: {
      recognized: fusion,
      minimum: requirements.fusion.minCredits,
      maximum: requirements.fusion.maxRecognizedCredits,
      lifePracticeRaw: fusionLifePracticeRaw,
      lifePracticeRecognized: fusionLifePractice,
      satisfied: fusion >= requirements.fusion.minCredits,
    },
  };
  const satisfied =
    recognizedCredits >= requirements.total &&
    rules.language.satisfied &&
    rules.tainan.satisfied &&
    rules.domain.satisfied &&
    rules.fusion.satisfied;

  return {
    recognized: recognizedCredits,
    required: requirements.total,
    remaining: Math.max(requirements.total - recognizedCredits, 0),
    satisfied,
    rules,
  };
}

export function calculateGraduation(inputCourses, requirements = REQUIREMENTS) {
  const courses = inputCourses.map(normalizeCourse);

  const coreCourses = officialCourses(courses, officialMajorCore);
  const core = Math.min(sumRecognized(coreCourses), requirements.major.core);
  const coreCompletedCount = coreCourses.filter(isCompleted).length;
  const coreAllSatisfied = coreCompletedCount === OFFICIAL_REQUIREMENT_IDS.majorCore.length;

  const designCourses = officialCourses(courses, officialDesign);
  const designRaw = sumRecognized(designCourses);
  const design = Math.min(designRaw, requirements.major.design.maxRecognizedCredits);
  const designOverflow = Math.max(designRaw - design, 0);
  const designSatisfied = design >= requirements.major.design.requiredCredits;
  const major = Math.min(core + design, requirements.major.total);
  const majorSatisfied =
    coreAllSatisfied &&
    core >= requirements.major.core &&
    designSatisfied &&
    major >= requirements.major.total;

  const requiredElectiveCourse = courses.find(
    (course) => course.courseCode === OFFICIAL_REQUIREMENT_IDS.requiredElective,
  );
  const requiredElectiveEarned = requiredElectiveCourse ? recognized(requiredElectiveCourse) : 0;
  const requiredElectiveRecordSatisfied = hasCourseRecord(requiredElectiveCourse);

  const general = calculateGeneralEducation(courses, requirements.general);

  const electiveCompleted = courses.filter(
    (course) =>
      course.requirementGroup === "elective" &&
      isCompleted(course) &&
      course.countsTowardGraduation,
  );
  const electiveRaw = sumRecognized(electiveCompleted) + designOverflow;
  const elective = Math.min(electiveRaw, requirements.elective.total);
  const departmentRaw =
    sumRecognized(electiveCompleted.filter((course) => course.departmentElective)) + designOverflow;
  const department = Math.min(departmentRaw, requirements.elective.departmentMinimum);
  const electiveSatisfied =
    elective >= requirements.elective.total && department >= requirements.elective.departmentMinimum;

  const cross =
    requirements.crossDomain > 0
      ? Math.min(
          sumRecognized(courses.filter((course) => course.requirementGroup === "cross-domain")),
          requirements.crossDomain,
        )
      : 0;

  const totalRecognized = Math.min(
    major + general.recognized + electiveRaw + requiredElectiveEarned + cross,
    requirements.totalCredits,
  );
  const pe = courses.find((course) => course.gateType === "pe");
  const english = courses.find((course) => course.gateType === "english");
  const gates = {
    pe: {
      required: requirements.gates.peTerms,
      completed: pe?.gateProgress || 0,
      satisfied: (pe?.gateProgress || 0) >= requirements.gates.peTerms,
    },
    english: {
      required: requirements.gates.englishThreshold,
      satisfied: Boolean(english && isCompleted(english)),
    },
  };

  return {
    total: {
      recognized: totalRecognized,
      required: requirements.totalCredits,
      remaining: Math.max(requirements.totalCredits - totalRecognized, 0),
    },
    major: {
      recognized: major,
      required: requirements.major.total,
      remaining: Math.max(requirements.major.total - major, 0),
      core,
      coreRequired: requirements.major.core,
      coreCompletedCount,
      coreRequiredCount: OFFICIAL_REQUIREMENT_IDS.majorCore.length,
      coreAllSatisfied,
      design,
      designRaw,
      designOverflow,
      designSatisfied,
      satisfied: majorSatisfied,
    },
    requiredElective: {
      recognized: requiredElectiveEarned,
      required: requirements.requiredElective.credits,
      courseCode: requirements.requiredElective.courseCode,
      recordSatisfied: requiredElectiveRecordSatisfied,
      creditEarned: requiredElectiveEarned >= requirements.requiredElective.credits,
      satisfied: requiredElectiveRecordSatisfied,
    },
    general,
    elective: {
      recognized: elective,
      rawRecognized: electiveRaw,
      required: requirements.elective.total,
      remaining: Math.max(requirements.elective.total - elective, 0),
      departmentRecognized: department,
      departmentRawRecognized: departmentRaw,
      departmentRequired: requirements.elective.departmentMinimum,
      departmentRemaining: Math.max(requirements.elective.departmentMinimum - department, 0),
      designOverflow,
      satisfied: electiveSatisfied,
    },
    gates,
    manualChecks: requirements.manualChecks,
    graduationReady:
      totalRecognized >= requirements.totalCredits &&
      majorSatisfied &&
      requiredElectiveRecordSatisfied &&
      general.satisfied &&
      electiveSatisfied &&
      gates.pe.satisfied &&
      gates.english.satisfied,
  };
}

function gradeMeets(course, minimumGrade) {
  if (!isCompleted(course)) return false;
  if (!minimumGrade || ["已抵免", "已認列"].includes(course.status)) return true;
  if (course.grade === "") return false;
  const grade = Number(course.grade);
  return Number.isFinite(grade) && grade >= minimumGrade;
}

function requirementSatisfied(requirement, lookup) {
  if (Array.isArray(requirement?.anyOf)) {
    return requirement.anyOf.some((alternative) => requirementSatisfied(alternative, lookup));
  }
  if (Array.isArray(requirement?.allOf)) {
    return requirement.allOf.every((item) => requirementSatisfied(item, lookup));
  }
  const prerequisite = lookup.get(requirement?.courseCode) || lookup.get(requirement?.courseName);
  return Boolean(prerequisite && gradeMeets(prerequisite, requirement?.minimumGrade));
}

function requirementLabel(requirement) {
  if (Array.isArray(requirement?.anyOf)) {
    return `任一：${requirement.anyOf.map(requirementLabel).join(" / ")}`;
  }
  if (Array.isArray(requirement?.allOf)) {
    return requirement.allOf.map(requirementLabel).join(" + ");
  }
  const name = requirement?.courseCode || requirement?.courseName || "未知先修";
  return `${name}${requirement?.minimumGrade ? `:${requirement.minimumGrade}` : ""}`;
}

export function getEligibility(inputCourse, inputCourses) {
  const course = normalizeCourse(inputCourse);
  const courses = inputCourses.map(normalizeCourse);
  const lookup = new Map();
  courses.forEach((item) => {
    if (item.courseCode) lookup.set(item.courseCode, item);
    lookup.set(item.courseName, item);
  });
  const missing = course.prerequisites
    .filter((requirement) => !requirementSatisfied(requirement, lookup))
    .map((requirement) => ({ ...requirement, label: requirementLabel(requirement) }));
  return { eligible: missing.length === 0, missing };
}

export const slotsConflict = (a, b) =>
  a.day === b.day && Math.max(a.start, b.start) <= Math.min(a.end, b.end);

export function calculateConflicts(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses
    .map(normalizeCourse)
    .filter(
      (course) => !isCompleted(course) && course.term === currentTerm && course.slots.length,
    );
  const out = [];
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const overlaps = [];
      courses[i].slots.forEach((a) =>
        courses[j].slots.forEach((b) => {
          if (slotsConflict(a, b)) overlaps.push({ a, b });
        }),
      );
      if (overlaps.length) out.push({ courseA: courses[i], courseB: courses[j], overlaps });
    }
  }
  return out;
}

function flattenPrerequisiteLeaves(requirement) {
  if (Array.isArray(requirement?.anyOf)) return requirement.anyOf.flatMap(flattenPrerequisiteLeaves);
  if (Array.isArray(requirement?.allOf)) return requirement.allOf.flatMap(flattenPrerequisiteLeaves);
  return requirement?.courseCode ? [requirement] : [];
}

export function buildDependencyGraph(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  const lookup = new Map(courses.map((course) => [course.courseCode, course]));
  const edges = [];
  courses.forEach((course) =>
    course.prerequisites.forEach((requirement) =>
      flattenPrerequisiteLeaves(requirement).forEach((prerequisite) => {
        const from = lookup.get(prerequisite.courseCode);
        if (from) {
          edges.push({
            from: from.courseCode,
            fromName: from.courseName,
            to: course.courseCode,
            toName: course.courseName,
            minimumGrade: prerequisite.minimumGrade || null,
          });
        }
      }),
    ),
  );
  const downstream = new Map(courses.map((course) => [course.courseCode, []]));
  edges.forEach((edge) => downstream.get(edge.from)?.push(edge));
  return {
    nodes: courses.map((course) => ({
      courseCode: course.courseCode,
      courseName: course.courseName,
      completed: isCompleted(course),
      downstreamCount: downstream.get(course.courseCode)?.length || 0,
    })),
    edges,
  };
}

export function getQuadrant(course) {
  const normalized = normalizeCourse(course);
  if (normalized.necessityScore >= 4 && normalized.riskScore >= 4) return "高必要高風險";
  if (normalized.necessityScore >= 4) return "高必要低/中風險";
  if (normalized.riskScore >= 4) return "低必要高風險";
  return "低必要低/中風險";
}

export function planStats(inputCourses, plan) {
  const courses = inputCourses.map(normalizeCourse);
  const selected = courses.filter((course) => course[plan.key]);
  const totalCredits = selected.reduce((sum, course) => sum + course.credits, 0);
  const averageRisk = selected.length
    ? selected.reduce((sum, course) => sum + course.riskScore, 0) / selected.length
    : 0;
  const highNeedHighRisk = selected.filter(
    (course) => getQuadrant(course) === "高必要高風險",
  ).length;
  const prerequisiteMissing = selected.filter(
    (course) => !getEligibility(course, courses).eligible,
  ).length;
  const conflicts = calculateConflicts(selected).length;
  const creditValid = totalCredits >= plan.minCredits && totalCredits <= plan.maxCredits;
  return {
    totalCredits,
    averageRisk: Math.round(averageRisk * 10) / 10,
    highNeedHighRisk,
    prerequisiteMissing,
    conflicts,
    creditValid,
    valid:
      creditValid &&
      averageRisk <= plan.maxAverageRisk &&
      highNeedHighRisk <= plan.maxHighNeedHighRisk &&
      prerequisiteMissing === 0 &&
      conflicts === 0,
    selected,
  };
}

export function calculateRiskSummary(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  return {
    highRisk: courses.filter((course) => !isCompleted(course) && course.gpaRisk === "高"),
    blocking: courses.filter(
      (course) =>
        !isCompleted(course) &&
        course.countsTowardGraduation &&
        ["major-core", "major-design", "major-required-elective", "general", "elective"].includes(
          course.requirementGroup,
        ),
    ),
  };
}

export function candidateCourses(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses.map(normalizeCourse);
  return courses
    .filter(
      (course) =>
        !isCompleted(course) &&
        course.term === currentTerm &&
        ["priority", "backup", "ask"].includes(course.decision),
    )
    .map((course) => ({ ...course, eligibility: getEligibility(course, courses) }));
}

export function gradeToPoint(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  if (score >= 90) return 4.3;
  if (score >= 85) return 4.0;
  if (score >= 80) return 3.7;
  if (score >= 77) return 3.3;
  if (score >= 73) return 3.0;
  if (score >= 70) return 2.7;
  if (score >= 67) return 2.3;
  if (score >= 63) return 2.0;
  if (score >= 60) return 1.7;
  return 0;
}

export function calculateGpaProjection({
  currentGpa = 0,
  currentCredits = 0,
  courses = [],
  term = APP_CONFIG.currentTerm,
} = {}) {
  const planned = courses
    .map(normalizeCourse)
    .filter(
      (course) =>
        !isCompleted(course) &&
        course.term === term &&
        course.credits > 0 &&
        course.expectedGrade !== "" &&
        gradeToPoint(course.expectedGrade) != null,
    );
  const semesterCredits = planned.reduce((sum, course) => sum + course.credits, 0);
  const semesterPoints = planned.reduce(
    (sum, course) => sum + course.credits * gradeToPoint(course.expectedGrade),
    0,
  );
  const semesterGpa = semesterCredits ? semesterPoints / semesterCredits : 0;
  const oldCredits = Math.max(0, num(currentCredits));
  const oldGpa = clamp(num(currentGpa), 0, 4.3);
  const cumulativeCredits = oldCredits + semesterCredits;
  const projectedGpa = cumulativeCredits
    ? (oldGpa * oldCredits + semesterPoints) / cumulativeCredits
    : oldGpa;
  return {
    semesterCredits,
    semesterGpa: Math.round(semesterGpa * 100) / 100,
    projectedGpa: Math.round(projectedGpa * 100) / 100,
    courses: planned,
  };
}

export function serializeBackup(courses, config = APP_CONFIG) {
  return JSON.stringify(
    {
      version: APP_CONFIG.backupVersion,
      exportedAt: new Date().toISOString(),
      config: { currentTerm: config.currentTerm, nextTerm: config.nextTerm },
      courses: courses.map(normalizeCourse),
    },
    null,
    2,
  );
}

export function parseBackupPayload(payload) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.courses)) {
    throw new Error("備份格式錯誤：缺少 courses 陣列。");
  }
  const version = Number(parsed.version || 1);
  if (version > APP_CONFIG.backupVersion) {
    throw new Error(`備份版本 ${version} 高於目前支援版本 ${APP_CONFIG.backupVersion}。`);
  }
  return migrateState(parsed);
}

const csvSafe = (value) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function exportCoursesToCsv(inputCourses) {
  const columns = [
    "id",
    "courseCode",
    "officialCourseCode",
    "courseName",
    "credits",
    "recognizedCredits",
    "requirementGroup",
    "generalSubarea",
    "status",
    "semester",
    "grade",
    "expectedGrade",
    "countsTowardGraduation",
    "departmentElective",
    "decision",
    "gpaRisk",
  ];
  return `\uFEFF${[
    columns.join(","),
    ...inputCourses
      .map(normalizeCourse)
      .map((course) => columns.map((key) => csvSafe(course[key])).join(",")),
  ].join("\n")}`;
}

export function parseCsv(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

export function importCoursesFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV 沒有資料列。");
  const headers = rows[0].map(clean);
  if (!headers.includes("courseName")) throw new Error("CSV 必須包含 courseName 欄位。");
  const courses = rows
    .slice(1)
    .filter((row) => row.some((value) => clean(value)))
    .map((row, index) => {
      const raw = Object.fromEntries(headers.map((header, i) => [header, row[i] ?? ""]));
      raw.id = clean(raw.id) || clean(raw.courseCode) || `import-${index + 1}`;
      ["credits", "recognizedCredits"].forEach((key) => {
        if (raw[key] !== "") raw[key] = Number(raw[key]);
      });
      ["countsTowardGraduation", "departmentElective"].forEach((key) => {
        if (raw[key] !== "") raw[key] = bool(raw[key]);
      });
      return normalizeCourse(raw);
    });
  const validation = validateCourseCollection(courses);
  if (!validation.valid) throw new Error(validation.errors.join("；"));
  return validation.courses;
}

export const createCleanDefaultState = () =>
  migrateState({ version: APP_CONFIG.backupVersion, courses: COURSE_CATALOG });
