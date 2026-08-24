import { APP_CONFIG, COURSE_CATALOG, PLAN_CONFIG, REQUIREMENTS } from "./curriculum.js";

export const COMPLETED_STATUSES = new Set(["已修", "已抵免", "已認列"]);
export const COURSE_STATUSES = ["未修", "候選", "已修", "已抵免", "已認列", "重修"];
export const DECISIONS = ["none", "priority", "backup", "next", "later", "ask"];

const byCode = new Map(COURSE_CATALOG.map((course) => [course.courseCode, course]));
const byName = new Map(COURSE_CATALOG.map((course) => [course.courseName, course]));

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

export function isCompleted(course) {
  return COMPLETED_STATUSES.has(course.status);
}

export function decisionLabel(decision, config = APP_CONFIG) {
  return ({
    none: "未設定",
    priority: `${config.currentTerm} 優先`,
    backup: `${config.currentTerm} 備選`,
    next: `${config.nextTerm} 預備`,
    later: "畢業前處理",
    ask: "待問系辦",
  })[decision] || "未設定";
}

function migrateDecision(source) {
  if (DECISIONS.includes(source.decision)) return source.decision;
  const legacy = String(source.decisionStatus || "");
  if (legacy.includes("優先")) return "priority";
  if (legacy.includes("備選")) return "backup";
  if (legacy.includes("預備")) return "next";
  if (legacy.includes("畢業前")) return "later";
  if (legacy.includes("待問")) return "ask";
  return "none";
}

function inferRequirementGroup(source, catalog) {
  if (source.requirementGroup) return source.requirementGroup;
  if (catalog?.requirementGroup) return catalog.requirementGroup;
  const name = String(source.courseName || "");
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
  const text = String(schedule || "");
  const slots = [];
  for (const match of text.matchAll(/\[(\d)\](\d+)(?:~(\d+))?/g)) {
    slots.push({ day: Number(match[1]), start: Number(match[2]), end: Number(match[3] || match[2]) });
  }
  return slots;
}

export function normalizeCourse(source = {}) {
  const catalog = byCode.get(source.courseCode) || byName.get(source.courseName) || null;
  const merged = { ...(catalog || {}), ...source };
  const requirementGroup = inferRequirementGroup(source, catalog);
  const credits = Math.max(0, n(merged.credits));
  const defaultCounts = credits > 0 && !["gate", "other"].includes(requirementGroup);
  const recognized = merged.recognizedCredits === "" || merged.recognizedCredits == null
    ? credits
    : clamp(n(merged.recognizedCredits), 0, credits);
  return {
    id: String(merged.id || merged.courseCode || `course-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    courseCode: String(merged.courseCode || catalog?.courseCode || "").trim(),
    courseName: String(merged.courseName || "").trim(),
    credits,
    recognizedCredits: recognized,
    requirementGroup,
    category: String(merged.category || catalog?.category || "其他"),
    countsTowardGraduation: bool(merged.countsTowardGraduation, defaultCounts),
    status: COURSE_STATUSES.includes(merged.status) ? merged.status : "未修",
    semester: String(merged.semester || "待排"),
    grade: String(merged.grade ?? "").trim(),
    gpaRisk: ["低", "中", "高"].includes(merged.gpaRisk) ? merged.gpaRisk : "中",
    necessityScore: clamp(Math.round(n(merged.necessityScore, 3)), 1, 5),
    riskScore: clamp(Math.round(n(merged.riskScore, 3)), 1, 5),
    decision: migrateDecision(merged),
    planA: bool(merged.planA),
    planB: bool(merged.planB),
    planC: bool(merged.planC),
    decisionNote: String(merged.decisionNote || ""),
    term: String(merged.term || ""),
    slots: Array.isArray(merged.slots) && merged.slots.length ? merged.slots.map((slot) => ({ day: n(slot.day), start: n(slot.start), end: n(slot.end, n(slot.start)) })) : parseLegacySlots(merged.schedule),
    prerequisites: Array.isArray(merged.prerequisites) ? merged.prerequisites : (catalog?.prerequisites || []),
    departmentElective: bool(merged.departmentElective),
    generalSubarea: String(merged.generalSubarea || catalog?.generalSubarea || ""),
    gateType: String(merged.gateType || catalog?.gateType || ""),
    gateProgress: Math.max(0, n(merged.gateProgress)),
  };
}

export function migrateState(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const courses = Array.isArray(source.courses) ? source.courses.map(normalizeCourse) : COURSE_CATALOG.map(normalizeCourse);
  return {
    version: APP_CONFIG.backupVersion,
    config: { currentTerm: source.config?.currentTerm || APP_CONFIG.currentTerm, nextTerm: source.config?.nextTerm || APP_CONFIG.nextTerm },
    courses,
  };
}

function recognized(course) {
  return isCompleted(course) && course.countsTowardGraduation ? course.recognizedCredits : 0;
}

function sumGroup(courses, group) {
  return courses.filter((course) => course.requirementGroup === group).reduce((sum, course) => sum + recognized(course), 0);
}

export function calculateGraduation(inputCourses, requirements = REQUIREMENTS) {
  const courses = inputCourses.map(normalizeCourse);
  const majorCore = Math.min(sumGroup(courses, "major-core"), requirements.major.core);
  const majorDesign = Math.min(sumGroup(courses, "major-design"), requirements.major.design.maxRecognizedCredits);
  const majorRequiredElective = Math.min(sumGroup(courses, "major-required-elective"), requirements.major.requiredElective);
  const majorRecognized = Math.min(majorCore + majorDesign + majorRequiredElective, requirements.major.total);

  const generalCompleted = courses.filter((course) => course.requirementGroup === "general" && isCompleted(course) && course.countsTowardGraduation);
  const naturalEngineeringRaw = generalCompleted.filter((course) => course.generalSubarea === "naturalEngineering").reduce((sum, course) => sum + course.recognizedCredits, 0);
  const generalOther = generalCompleted.filter((course) => course.generalSubarea !== "naturalEngineering").reduce((sum, course) => sum + course.recognizedCredits, 0);
  const naturalEngineeringRecognized = Math.min(naturalEngineeringRaw, requirements.general.caps.naturalEngineering);
  const generalRecognized = Math.min(generalOther + naturalEngineeringRecognized, requirements.general.total);

  const electiveCompleted = courses.filter((course) => course.requirementGroup === "elective" && isCompleted(course) && course.countsTowardGraduation);
  const electiveRaw = electiveCompleted.reduce((sum, course) => sum + course.recognizedCredits, 0);
  const departmentElectiveRaw = electiveCompleted.filter((course) => course.departmentElective).reduce((sum, course) => sum + course.recognizedCredits, 0);
  const electiveRecognized = Math.min(electiveRaw, requirements.elective.total);
  const departmentElectiveRecognized = Math.min(departmentElectiveRaw, requirements.elective.departmentMinimum);

  const crossDomainRaw = sumGroup(courses, "cross-domain");
  const crossDomainRecognized = requirements.crossDomain > 0 ? Math.min(crossDomainRaw, requirements.crossDomain) : 0;
  const totalRecognized = Math.min(majorRecognized + generalRecognized + electiveRecognized + crossDomainRecognized, requirements.totalCredits);

  const pe = courses.find((course) => course.gateType === "pe");
  const english = courses.find((course) => course.gateType === "english");
  const gates = {
    pe: { required: requirements.gates.peTerms, completed: pe?.gateProgress || 0, satisfied: (pe?.gateProgress || 0) >= requirements.gates.peTerms },
    english: { required: requirements.gates.englishThreshold, satisfied: Boolean(english && isCompleted(english)) },
  };

  return {
    total: { recognized: totalRecognized, required: requirements.totalCredits, remaining: Math.max(requirements.totalCredits - totalRecognized, 0) },
    major: { recognized: majorRecognized, required: requirements.major.total, remaining: Math.max(requirements.major.total - majorRecognized, 0), core: majorCore, design: majorDesign, requiredElective: majorRequiredElective },
    general: { recognized: generalRecognized, required: requirements.general.total, remaining: Math.max(requirements.general.total - generalRecognized, 0), naturalEngineeringRaw, naturalEngineeringRecognized },
    elective: { recognized: electiveRecognized, required: requirements.elective.total, remaining: Math.max(requirements.elective.total - electiveRecognized, 0), departmentRecognized: departmentElectiveRecognized, departmentRequired: requirements.elective.departmentMinimum, departmentRemaining: Math.max(requirements.elective.departmentMinimum - departmentElectiveRecognized, 0) },
    gates,
    graduationReady: totalRecognized >= requirements.totalCredits && majorRecognized >= requirements.major.total && generalRecognized >= requirements.general.total && electiveRecognized >= requirements.elective.total && departmentElectiveRecognized >= requirements.elective.departmentMinimum && gates.pe.satisfied && gates.english.satisfied,
  };
}

function gradeMeets(course, minimumGrade) {
  if (!minimumGrade) return isCompleted(course);
  if (course.status === "已抵免" || course.status === "已認列") return true;
  if (!isCompleted(course)) return false;
  const grade = Number(course.grade);
  return !Number.isFinite(grade) || grade >= minimumGrade;
}

export function getEligibility(inputCourse, inputCourses) {
  const course = normalizeCourse(inputCourse);
  const courses = inputCourses.map(normalizeCourse);
  const lookup = new Map();
  courses.forEach((item) => {
    if (item.courseCode) lookup.set(item.courseCode, item);
    lookup.set(item.courseName, item);
  });
  const missing = course.prerequisites.filter((rule) => {
    const prerequisite = lookup.get(rule.courseCode) || lookup.get(rule.courseName);
    return !prerequisite || !gradeMeets(prerequisite, rule.minimumGrade);
  });
  return { eligible: missing.length === 0, missing };
}

export function slotsConflict(a, b) {
  return a.day === b.day && Math.max(a.start, b.start) <= Math.min(a.end, b.end);
}

export function calculateConflicts(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses.map(normalizeCourse).filter((course) => !isCompleted(course) && course.term === currentTerm && course.slots.length > 0);
  const conflicts = [];
  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const overlaps = [];
      courses[i].slots.forEach((a) => courses[j].slots.forEach((b) => { if (slotsConflict(a, b)) overlaps.push({ a, b }); }));
      if (overlaps.length) conflicts.push({ courseA: courses[i], courseB: courses[j], overlaps });
    }
  }
  return conflicts;
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
  const selected = courses.filter((course) => course[plan.key]);
  const totalCredits = selected.reduce((sum, course) => sum + course.credits, 0);
  const averageRisk = selected.length ? selected.reduce((sum, course) => sum + course.riskScore, 0) / selected.length : 0;
  const highNeedHighRisk = selected.filter((course) => getQuadrant(course) === "高必要高風險").length;
  const prerequisiteMissing = selected.filter((course) => !getEligibility(course, courses).eligible).length;
  const conflicts = calculateConflicts(selected).length;
  const creditValid = totalCredits >= plan.minCredits && totalCredits <= plan.maxCredits;
  const valid = creditValid && averageRisk <= plan.maxAverageRisk && highNeedHighRisk <= plan.maxHighNeedHighRisk && prerequisiteMissing === 0 && conflicts === 0;
  return { totalCredits, averageRisk: Math.round(averageRisk * 10) / 10, highNeedHighRisk, prerequisiteMissing, conflicts, creditValid, valid, selected };
}

export function calculateRiskSummary(inputCourses) {
  const courses = inputCourses.map(normalizeCourse);
  return {
    highRisk: courses.filter((course) => !isCompleted(course) && course.gpaRisk === "高"),
    blocking: courses.filter((course) => !isCompleted(course) && course.countsTowardGraduation && ["major-core", "major-design", "major-required-elective", "general", "elective"].includes(course.requirementGroup)),
  };
}

export function candidateCourses(inputCourses, currentTerm = APP_CONFIG.currentTerm) {
  const courses = inputCourses.map(normalizeCourse);
  return courses.filter((course) => !isCompleted(course) && course.term === currentTerm && ["priority", "backup", "ask"].includes(course.decision)).map((course) => ({ ...course, eligibility: getEligibility(course, courses) }));
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

function csvSafe(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportCoursesToCsv(inputCourses) {
  const columns = ["courseCode", "courseName", "credits", "recognizedCredits", "requirementGroup", "status", "semester", "grade", "countsTowardGraduation", "departmentElective", "decision", "gpaRisk"];
  return `\uFEFF${[columns.join(","), ...inputCourses.map(normalizeCourse).map((course) => columns.map((key) => csvSafe(course[key])).join(","))].join("\n")}`;
}

export function createCleanDefaultState() {
  return migrateState({ version: APP_CONFIG.backupVersion, courses: COURSE_CATALOG });
}

// Browser application -------------------------------------------------------
if (typeof document !== "undefined") {
  const storage = (() => { try { return localStorage; } catch { return null; } })();
  let state = createCleanDefaultState();

  function save() {
    if (!storage) return;
    try { storage.setItem(APP_CONFIG.storageKey, JSON.stringify(state)); } catch (error) { setStatus(`儲存失敗：${error.message}`, true); }
  }

  function load() {
    if (!storage) return;
    const current = storage.getItem(APP_CONFIG.storageKey);
    if (current) {
      try { state = parseBackupPayload(current); return; } catch { storage.setItem(`${APP_CONFIG.storageKey}-corrupt-${Date.now()}`, current); }
    }
    const legacy = storage.getItem(APP_CONFIG.legacyStorageKey);
    if (legacy) {
      try {
        state = parseBackupPayload(legacy);
        storage.setItem(`${APP_CONFIG.legacyStorageKey}-pre-v2-backup`, legacy);
        save();
      } catch { storage.setItem(`${APP_CONFIG.legacyStorageKey}-corrupt-${Date.now()}`, legacy); }
    }
  }

  const $ = (selector) => document.querySelector(selector);
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
  function setStatus(text, error = false) { const node = $("#status"); if (node) { node.textContent = text; node.className = error ? "status error" : "status"; } }

  function renderDashboard() {
    const g = calculateGraduation(state.courses);
    const risk = calculateRiskSummary(state.courses);
    const cards = [
      ["畢業認列", `${g.total.recognized} / ${g.total.required}`],
      ["水利必修", `${g.major.recognized} / ${g.major.required}`],
      ["通識", `${g.general.recognized} / ${g.general.required}`],
      ["選修", `${g.elective.recognized} / ${g.elective.required}`],
      ["本系選修", `${g.elective.departmentRecognized} / ${g.elective.departmentRequired}`],
      ["未完成高風險", String(risk.highRisk.length)],
    ];
    $("#dashboard").replaceChildren(...cards.map(([label, value]) => { const node = el("div", null, "metric"); node.append(el("strong", label), el("span", value)); return node; }));
    const rules = [
      `專業必修 ${g.major.core}/${REQUIREMENTS.major.core}`,
      `設計必修 ${g.major.design}/${REQUIREMENTS.major.design.requiredCredits}（超修不重複灌入必修）`,
      `必選修 ${g.major.requiredElective}/${REQUIREMENTS.major.requiredElective}`,
      `通識自然與工程科學認列 ${g.general.naturalEngineeringRecognized}/${g.general.naturalEngineeringRaw}（上限 ${REQUIREMENTS.general.caps.naturalEngineering} 學分）`,
      `體育 ${g.gates.pe.completed}/${g.gates.pe.required} 學期`,
      `英語門檻 ${g.gates.english.satisfied ? "完成" : "未完成"}`,
    ];
    $("#ruleSummary").replaceChildren(...rules.map((text) => el("li", text)));
  }

  function renderCandidates() {
    const rows = candidateCourses(state.courses);
    const tbody = $("#candidateBody");
    tbody.replaceChildren();
    rows.forEach((course) => {
      const tr = document.createElement("tr");
      [course.courseName, `${course.credits}`, decisionLabel(course.decision), course.eligibility.eligible ? "可修" : `先修未滿：${course.eligibility.missing.map((r) => r.courseCode || r.courseName).join("、")}`].forEach((value) => tr.append(el("td", value)));
      tbody.append(tr);
    });
    if (!rows.length) { const tr = document.createElement("tr"); const td = el("td", "目前沒有候選課"); td.colSpan = 4; tr.append(td); tbody.append(tr); }
  }

  function renderConflicts() {
    const conflicts = calculateConflicts(candidateCourses(state.courses).filter((course) => course.eligibility.eligible));
    const list = $("#conflictList");
    list.replaceChildren(...conflicts.map((item) => el("li", `${item.courseA.courseName} ↔ ${item.courseB.courseName}`)));
    if (!conflicts.length) list.append(el("li", "目前候選課沒有自動偵測到衝堂。"));
  }

  function renderPlans() {
    const root = $("#plans");
    root.replaceChildren(...PLAN_CONFIG.map((plan) => {
      const stats = planStats(state.courses, plan);
      const card = el("div", null, `plan ${stats.valid ? "ok" : "warn"}`);
      card.append(el("strong", plan.label), el("div", `${stats.totalCredits} 學分｜平均風險 ${stats.averageRisk}｜先修缺口 ${stats.prerequisiteMissing}｜衝堂 ${stats.conflicts}`), el("small", stats.valid ? "符合方案限制" : `未符合：目標 ${plan.minCredits}-${plan.maxCredits} 學分，並需通過風險/先修/衝堂檢查`));
      return card;
    }));
  }

  function renderCourses() {
    const tbody = $("#courseBody");
    tbody.replaceChildren();
    state.courses.map(normalizeCourse).forEach((course) => {
      const tr = document.createElement("tr");
      tr.dataset.id = course.id;
      tr.append(el("td", course.courseName));
      tr.append(el("td", `${course.recognizedCredits}/${course.credits}`));
      tr.append(el("td", course.requirementGroup));

      const statusTd = document.createElement("td");
      const status = document.createElement("select");
      COURSE_STATUSES.forEach((value) => { const option = el("option", value); option.value = value; option.selected = course.status === value; status.append(option); });
      status.dataset.field = "status"; statusTd.append(status); tr.append(statusTd);

      const gradeTd = document.createElement("td");
      const grade = document.createElement("input"); grade.value = course.grade; grade.placeholder = "成績"; grade.dataset.field = "grade"; gradeTd.append(grade); tr.append(gradeTd);

      const decisionTd = document.createElement("td");
      const decision = document.createElement("select");
      DECISIONS.forEach((value) => { const option = el("option", decisionLabel(value)); option.value = value; option.selected = course.decision === value; decision.append(option); });
      decision.dataset.field = "decision"; decisionTd.append(decision); tr.append(decisionTd);

      const deptTd = document.createElement("td");
      const dept = document.createElement("input"); dept.type = "checkbox"; dept.checked = course.departmentElective; dept.disabled = course.requirementGroup !== "elective"; dept.dataset.field = "departmentElective"; deptTd.append(dept); tr.append(deptTd);

      const countTd = document.createElement("td");
      const count = document.createElement("input"); count.type = "checkbox"; count.checked = course.countsTowardGraduation; count.dataset.field = "countsTowardGraduation"; countTd.append(count); tr.append(countTd);

      tbody.append(tr);
    });
  }

  function render() { renderDashboard(); renderCandidates(); renderConflicts(); renderPlans(); renderCourses(); }

  function updateCourse(id, field, target) {
    state.courses = state.courses.map((course) => {
      if (normalizeCourse(course).id !== id) return course;
      const value = target.type === "checkbox" ? target.checked : target.value;
      return normalizeCourse({ ...course, [field]: value });
    });
    save(); render();
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function bind() {
    $("#courseBody").addEventListener("change", (event) => { const field = event.target.dataset.field; const row = event.target.closest("tr"); if (field && row) updateCourse(row.dataset.id, field, event.target); });
    $("#exportJson").addEventListener("click", () => download("ncku-credit-map-v2.json", serializeBackup(state.courses), "application/json;charset=utf-8"));
    $("#exportCsv").addEventListener("click", () => download("ncku-credit-map-v2.csv", exportCoursesToCsv(state.courses), "text/csv;charset=utf-8"));
    $("#importJson").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { state = parseBackupPayload(reader.result); save(); render(); setStatus(`已匯入 ${state.courses.length} 門課。`); } catch (error) { setStatus(error.message, true); } event.target.value = ""; }; reader.readAsText(file, "utf-8"); });
    $("#resetDemo").addEventListener("click", () => { if (!confirm("重置為公開、去識別化的課程資料？目前個人狀態會被取代。")) return; state = createCleanDefaultState(); save(); render(); setStatus("已重置為去識別化預設資料。"); });
  }

  document.addEventListener("DOMContentLoaded", () => { load(); bind(); render(); });
}
