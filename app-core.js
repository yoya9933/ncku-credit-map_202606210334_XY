import { APP_CONFIG, COURSE_CATALOG, PLAN_CONFIG, REQUIREMENTS } from "./curriculum.js";
import { getDefaultOffering } from "./term-data.js";

export { APP_CONFIG, COURSE_CATALOG, PLAN_CONFIG, REQUIREMENTS };
export const COMPLETED_STATUSES = new Set(["已修", "已抵免", "已認列"]);
export const COURSE_STATUSES = ["未修", "候選", "已修", "已抵免", "已認列", "重修"];
export const DECISIONS = ["none", "priority", "backup", "next", "later", "ask"];
export const REQUIREMENT_GROUPS = ["major-core", "major-design", "major-required-elective", "general", "elective", "cross-domain", "gate", "other"];

const byCode = new Map(COURSE_CATALOG.map((c) => [c.courseCode, c]));
const byName = new Map(COURSE_CATALOG.map((c) => [c.courseName, c]));
const num = (v, f = 0) => Number.isFinite(Number(v)) ? Number(v) : f;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const bool = (v, f = false) => v == null || v === "" ? f : [true, "true", "on", 1, "1", "yes", "是"].includes(v);
const clean = (v) => String(v ?? "").trim();

export const isCompleted = (course) => COMPLETED_STATUSES.has(course.status);

export function decisionLabel(decision, config = APP_CONFIG) {
  return ({ none: "未設定", priority: `${config.currentTerm} 優先`, backup: `${config.currentTerm} 備選`, next: `${config.nextTerm} 預備`, later: "畢業前處理", ask: "待問系辦" })[decision] || "未設定";
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
  if (source.requirementGroup) return source.requirementGroup;
  if (catalog?.requirementGroup) return catalog.requirementGroup;
  const name = clean(source.courseName);
  if (["防洪排水工程設計", "水資源工程設計", "海洋工程設計", "海岸工程設計"].includes(name)) return "major-design";
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
  for (const m of clean(schedule).matchAll(/\[(\d)\](\d+)(?:~(\d+))?/g)) slots.push({ day: Number(m[1]), start: Number(m[2]), end: Number(m[3] || m[2]) });
  return slots;
}

export function normalizeCourse(source = {}) {
  const catalog = byCode.get(source.courseCode) || byName.get(source.courseName) || null;
  const base = { ...(catalog || {}), ...source };
  const requirementGroup = inferRequirementGroup(source, catalog);
  const offering = getDefaultOffering(base.courseCode || catalog?.courseCode, APP_CONFIG.currentTerm, APP_CONFIG.nextTerm);
  const credits = Math.max(0, num(base.credits));
  const defaultCounts = credits > 0 && !["gate", "other"].includes(requirementGroup);
  const recognizedCredits = base.recognizedCredits == null || base.recognizedCredits === "" ? credits : clamp(num(base.recognizedCredits), 0, credits);
  const migratedDecision = legacyDecision(source);
  const decision = migratedDecision || (DECISIONS.includes(source.decision) ? source.decision : (DECISIONS.includes(catalog?.decision) ? catalog.decision : "none"));
  const term = clean(source.term || offering?.term || "");
  const slots = Array.isArray(source.slots) && source.slots.length ? source.slots : (offering?.slots || parseLegacySlots(source.schedule));
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
    planA: bool(base.planA), planB: bool(base.planB), planC: bool(base.planC),
    decisionNote: clean(base.decisionNote),
    term,
    teacher: clean(source.teacher || offering?.teacher),
    location: clean(source.location || offering?.location),
    offeringCertainty: clean(source.offeringCertainty || offering?.certainty),
    slots: (slots || []).map((s) => ({ day: num(s.day), start: num(s.start), end: num(s.end, num(s.start)) })),
    prerequisites: Array.isArray(source.prerequisites) ? source.prerequisites : (catalog?.prerequisites || []),
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
  courses.forEach((c, index) => {
    if (!c.id) errors.push(`第 ${index + 1} 筆缺少 id`);
    else if (ids.has(c.id)) errors.push(`重複 id：${c.id}`);
    else ids.add(c.id);
    if (!c.courseName) errors.push(`第 ${index + 1} 筆缺少課程名稱`);
    if (c.courseCode) {
      if (codes.has(c.courseCode)) errors.push(`重複內部課程代碼：${c.courseCode}`);
      codes.add(c.courseCode);
    }
  });
  return { valid: errors.length === 0, errors, courses };
}

export function upsertCourse(inputCourses, inputCourse) {
  const course = normalizeCourse(inputCourse);
  if (!course.id || !course.courseName) throw new Error("課程需要 id 與課程名稱。");
  const exists = inputCourses.some((c) => normalizeCourse(c).id === course.id);
  const next = exists ? inputCourses.map((c) => normalizeCourse(c).id === course.id ? course : normalizeCourse(c)) : [...inputCourses.map(normalizeCourse), course];
  const check = validateCourseCollection(next);
  if (!check.valid) throw new Error(check.errors.join("；"));
  return check.courses;
}

export function deleteCourse(inputCourses, id) {
  return inputCourses.map(normalizeCourse).filter((c) => c.id !== id);
}

export function migrateState(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const courses = Array.isArray(source.courses) ? source.courses.map(normalizeCourse) : COURSE_CATALOG.map(normalizeCourse);
  const validation = validateCourseCollection(courses);
  if (!validation.valid) throw new Error(`課程資料完整性錯誤：${validation.errors.join("；")}`);
  return { version: APP_CONFIG.backupVersion, config: { currentTerm: source.config?.currentTerm || APP_CONFIG.currentTerm, nextTerm: source.config?.nextTerm || APP_CONFIG.nextTerm }, courses: validation.courses };
}

const recognized = (c) => isCompleted(c) && c.countsTowardGraduation ? c.recognizedCredits : 0;
const sumGroup = (courses, group) => courses.filter((c) => c.requirementGroup === group).reduce((s, c) => s + recognized(c), 0);

export function calculateGraduation(inputCourses, requirements = REQUIREMENTS) {
  const courses = inputCourses.map(normalizeCourse);
  const core = Math.min(sumGroup(courses, "major-core"), requirements.major.core);
  const design = Math.min(sumGroup(courses, "major-design"), requirements.major.design.maxRecognizedCredits);
  const requiredElective = Math.min(sumGroup(courses, "major-required-elective"), requirements.major.requiredElective);
  const major = Math.min(core + design + requiredElective, requirements.major.total);
  const generalCompleted = courses.filter((c) => c.requirementGroup === "general" && isCompleted(c) && c.countsTowardGraduation);
  const naturalRaw = generalCompleted.filter((c) => c.generalSubarea === "naturalEngineering").reduce((s, c) => s + c.recognizedCredits, 0);
  const natural = Math.min(naturalRaw, requirements.general.caps.naturalEngineering);
  const generalOther = generalCompleted.filter((c) => c.generalSubarea !== "naturalEngineering").reduce((s, c) => s + c.recognizedCredits, 0);
  const general = Math.min(generalOther + natural, requirements.general.total);
  const electiveCompleted = courses.filter((c) => c.requirementGroup === "elective" && isCompleted(c) && c.countsTowardGraduation);
  const elective = Math.min(electiveCompleted.reduce((s, c) => s + c.recognizedCredits, 0), requirements.elective.total);
  const department = Math.min(electiveCompleted.filter((c) => c.departmentElective).reduce((s, c) => s + c.recognizedCredits, 0), requirements.elective.departmentMinimum);
  const cross = requirements.crossDomain > 0 ? Math.min(sumGroup(courses, "cross-domain"), requirements.crossDomain) : 0;
  const total = Math.min(core + design + requiredElective + general + elective + cross, requirements.totalCredits);
  const pe = courses.find((c) => c.gateType === "pe");
  const english = courses.find((c) => c.gateType === "english");
  const gates = { pe: { required: requirements.gates.peTerms, completed: pe?.gateProgress || 0, satisfied: (pe?.gateProgress || 0) >= requirements.gates.peTerms }, english: { required: true, satisfied: Boolean(english && isCompleted(english)) } };
  return {
    total: { recognized: total, required: requirements.totalCredits, remaining: Math.max(requirements.totalCredits - total, 0) },
    major: { recognized: major, required: requirements.major.total, remaining: Math.max(requirements.major.total - major, 0), core, design, requiredElective },
    general: { recognized: general, required: requirements.general.total, remaining: Math.max(requirements.general.total - general, 0), naturalEngineeringRaw: naturalRaw, naturalEngineeringRecognized: natural },
    elective: { recognized: elective, required: requirements.elective.total, remaining: Math.max(requirements.elective.total - elective, 0), departmentRecognized: department, departmentRequired: requirements.elective.departmentMinimum, departmentRemaining: Math.max(requirements.elective.departmentMinimum - department, 0) },
    gates,
    graduationReady: total >= requirements.totalCredits && major >= requirements.major.total && general >= requirements.general.total && elective >= requirements.elective.total && department >= requirements.elective.departmentMinimum && gates.pe.satisfied && gates.english.satisfied,
  };
}

function gradeMeets(course, minimumGrade) {
  if (!isCompleted(course)) return false;
  if (!minimumGrade || ["已抵免", "已認列"].includes(course.status) || course.grade === "") return true;
  const grade = Number(course.grade);
  return !Number.isFinite(grade) || grade >= minimumGrade;
}

export function getEligibility(inputCourse, inputCourses) {
  const course = normalizeCourse(inputCourse);
  const courses = inputCourses.map(normalizeCourse);
  const lookup = new Map();
  courses.forEach((c) => { if (c.courseCode) lookup.set(c.courseCode, c); lookup.set(c.courseName, c); });
  const missing = course.prerequisites.filter((r) => { const prerequisite = lookup.get(r.courseCode) || lookup.get(r.courseName); return !prerequisite || !gradeMeets(prerequisite, r.minimumGrade); });
  return { eligible: missing.length === 0, missing };
}

export const slotsConflict = (a, b) => a.day === b.day && Math.max(a.start, b.start) <= Math.min(a.end, b.end);

export function calculateConflicts(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses.map(normalizeCourse).filter((c) => !isCompleted(c) && c.term === currentTerm && c.slots.length);
  const out = [];
  for (let i = 0; i < courses.length; i += 1) for (let j = i + 1; j < courses.length; j += 1) {
    const overlaps = [];
    courses[i].slots.forEach((a) => courses[j].slots.forEach((b) => { if (slotsConflict(a, b)) overlaps.push({ a, b }); }));
    if (overlaps.length) out.push({ courseA: courses[i], courseB: courses[j], overlaps });
  }
  return out;
}

export function buildDependencyGraph(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  const lookup = new Map(courses.map((c) => [c.courseCode, c]));
  const edges = [];
  courses.forEach((course) => course.prerequisites.forEach((p) => {
    const from = lookup.get(p.courseCode);
    if (from) edges.push({ from: from.courseCode, fromName: from.courseName, to: course.courseCode, toName: course.courseName, minimumGrade: p.minimumGrade || null });
  }));
  const downstream = new Map(courses.map((c) => [c.courseCode, []]));
  edges.forEach((e) => downstream.get(e.from)?.push(e));
  return { nodes: courses.map((c) => ({ courseCode: c.courseCode, courseName: c.courseName, completed: isCompleted(c), downstreamCount: downstream.get(c.courseCode)?.length || 0 })), edges };
}

export function getQuadrant(course) {
  const c = normalizeCourse(course);
  if (c.necessityScore >= 4 && c.riskScore >= 4) return "高必要高風險";
  if (c.necessityScore >= 4) return "高必要低/中風險";
  if (c.riskScore >= 4) return "低必要高風險";
  return "低必要低/中風險";
}

export function planStats(inputCourses, plan) {
  const courses = inputCourses.map(normalizeCourse);
  const selected = courses.filter((c) => c[plan.key]);
  const totalCredits = selected.reduce((s, c) => s + c.credits, 0);
  const averageRisk = selected.length ? selected.reduce((s, c) => s + c.riskScore, 0) / selected.length : 0;
  const highNeedHighRisk = selected.filter((c) => getQuadrant(c) === "高必要高風險").length;
  const prerequisiteMissing = selected.filter((c) => !getEligibility(c, courses).eligible).length;
  const conflicts = calculateConflicts(selected).length;
  const creditValid = totalCredits >= plan.minCredits && totalCredits <= plan.maxCredits;
  return { totalCredits, averageRisk: Math.round(averageRisk * 10) / 10, highNeedHighRisk, prerequisiteMissing, conflicts, creditValid, valid: creditValid && averageRisk <= plan.maxAverageRisk && highNeedHighRisk <= plan.maxHighNeedHighRisk && prerequisiteMissing === 0 && conflicts === 0, selected };
}

export function calculateRiskSummary(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  return { highRisk: courses.filter((c) => !isCompleted(c) && c.gpaRisk === "高"), blocking: courses.filter((c) => !isCompleted(c) && c.countsTowardGraduation && ["major-core", "major-design", "major-required-elective", "general", "elective"].includes(c.requirementGroup)) };
}

export function candidateCourses(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses.map(normalizeCourse);
  return courses.filter((c) => !isCompleted(c) && c.term === currentTerm && ["priority", "backup", "ask"].includes(c.decision)).map((c) => ({ ...c, eligibility: getEligibility(c, courses) }));
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

export function calculateGpaProjection({ currentGpa = 0, currentCredits = 0, courses = [] } = {}) {
  const planned = courses.map(normalizeCourse).filter((c) => c.credits > 0 && c.expectedGrade !== "" && gradeToPoint(c.expectedGrade) != null);
  const semesterCredits = planned.reduce((s, c) => s + c.credits, 0);
  const semesterPoints = planned.reduce((s, c) => s + c.credits * gradeToPoint(c.expectedGrade), 0);
  const semesterGpa = semesterCredits ? semesterPoints / semesterCredits : 0;
  const oldCredits = Math.max(0, num(currentCredits));
  const oldGpa = clamp(num(currentGpa), 0, 4.3);
  const cumulativeCredits = oldCredits + semesterCredits;
  const projectedGpa = cumulativeCredits ? (oldGpa * oldCredits + semesterPoints) / cumulativeCredits : oldGpa;
  return { semesterCredits, semesterGpa: Math.round(semesterGpa * 100) / 100, projectedGpa: Math.round(projectedGpa * 100) / 100, courses: planned };
}

export function serializeBackup(courses, config = APP_CONFIG) {
  return JSON.stringify({ version: APP_CONFIG.backupVersion, exportedAt: new Date().toISOString(), config: { currentTerm: config.currentTerm, nextTerm: config.nextTerm }, courses: courses.map(normalizeCourse) }, null, 2);
}

export function parseBackupPayload(payload) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.courses)) throw new Error("備份格式錯誤：缺少 courses 陣列。");
  const version = Number(parsed.version || 1);
  if (version > APP_CONFIG.backupVersion) throw new Error(`備份版本 ${version} 高於目前支援版本 ${APP_CONFIG.backupVersion}。`);
  return migrateState(parsed);
}

const csvSafe = (v) => { const text = String(v ?? ""); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; };

export function exportCoursesToCsv(inputCourses) {
  const columns = ["id", "courseCode", "officialCourseCode", "courseName", "credits", "recognizedCredits", "requirementGroup", "status", "semester", "grade", "expectedGrade", "countsTowardGraduation", "departmentElective", "decision", "gpaRisk"];
  return `\uFEFF${[columns.join(","), ...inputCourses.map(normalizeCourse).map((c) => columns.map((k) => csvSafe(c[k])).join(","))].join("\n")}`;
}

export function parseCsv(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ""; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  row.push(cell.replace(/\r$/, "")); if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

export function importCoursesFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV 沒有資料列。");
  const headers = rows[0].map(clean);
  if (!headers.includes("courseName")) throw new Error("CSV 必須包含 courseName 欄位。");
  const courses = rows.slice(1).filter((r) => r.some((v) => clean(v))).map((row, index) => {
    const raw = Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""]));
    raw.id = clean(raw.id) || clean(raw.courseCode) || `import-${index + 1}`;
    ["credits", "recognizedCredits"].forEach((k) => { if (raw[k] !== "") raw[k] = Number(raw[k]); });
    ["countsTowardGraduation", "departmentElective"].forEach((k) => { if (raw[k] !== "") raw[k] = bool(raw[k]); });
    return normalizeCourse(raw);
  });
  const validation = validateCourseCollection(courses);
  if (!validation.valid) throw new Error(validation.errors.join("；"));
  return validation.courses;
}

export const createCleanDefaultState = () => migrateState({ version: APP_CONFIG.backupVersion, courses: COURSE_CATALOG });
