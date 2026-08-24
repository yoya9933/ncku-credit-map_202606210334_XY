import {
  APP_CONFIG,
  COURSE_STATUSES,
  DECISIONS,
  PLAN_CONFIG,
  REQUIREMENTS,
  calculateConflicts,
  calculateGraduation,
  calculateRiskSummary,
  candidateCourses,
  createCleanDefaultState,
  decisionLabel,
  exportCoursesToCsv,
  normalizeCourse,
  parseBackupPayload,
  planStats,
  serializeBackup,
} from "./app-core.js";

const storage = (() => { try { return localStorage; } catch { return null; } })();
let state = createCleanDefaultState();
const $ = (selector) => document.querySelector(selector);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

function setStatus(text, error = false) {
  const node = $("#status");
  if (!node) return;
  node.textContent = text;
  node.className = error ? "status error" : "status";
}

function save() {
  if (!storage) return;
  try { storage.setItem(APP_CONFIG.storageKey, JSON.stringify(state)); }
  catch (error) { setStatus(`儲存失敗：${error.message}`, true); }
}

function load() {
  if (!storage) return;
  const current = storage.getItem(APP_CONFIG.storageKey);
  if (current) {
    try { state = parseBackupPayload(current); return; }
    catch { storage.setItem(`${APP_CONFIG.storageKey}-corrupt-${Date.now()}`, current); }
  }
  const legacy = storage.getItem(APP_CONFIG.legacyStorageKey);
  if (!legacy) return;
  try {
    state = parseBackupPayload(legacy);
    storage.setItem(`${APP_CONFIG.legacyStorageKey}-pre-v2-backup`, legacy);
    save();
    setStatus("已自動從 V1 遷移到 V2；舊資料已保留備份。");
  } catch {
    storage.setItem(`${APP_CONFIG.legacyStorageKey}-corrupt-${Date.now()}`, legacy);
    setStatus("舊資料格式異常，已保留原始備份並載入乾淨預設資料。", true);
  }
}

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
  $("#dashboard").replaceChildren(...cards.map(([label, value]) => {
    const node = el("div", null, "metric"); node.append(el("strong", label), el("span", value)); return node;
  }));
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
  const tbody = $("#candidateBody"); tbody.replaceChildren();
  rows.forEach((course) => {
    const tr = document.createElement("tr");
    [course.courseName, `${course.credits}`, decisionLabel(course.decision), course.eligibility.eligible ? "可修" : `先修未滿：${course.eligibility.missing.map((r) => r.courseCode || r.courseName).join("、")}`]
      .forEach((value) => tr.append(el("td", value)));
    tbody.append(tr);
  });
  if (!rows.length) { const tr = document.createElement("tr"); const td = el("td", "目前沒有候選課"); td.colSpan = 4; tr.append(td); tbody.append(tr); }
}

function renderConflicts() {
  const eligible = candidateCourses(state.courses).filter((course) => course.eligibility.eligible);
  const conflicts = calculateConflicts(eligible);
  const list = $("#conflictList");
  list.replaceChildren(...conflicts.map((item) => el("li", `${item.courseA.courseName} ↔ ${item.courseB.courseName}`)));
  if (!conflicts.length) list.append(el("li", "目前候選課沒有自動偵測到衝堂。"));
}

function renderPlans() {
  $("#plans").replaceChildren(...PLAN_CONFIG.map((plan) => {
    const stats = planStats(state.courses, plan);
    const card = el("div", null, `decision-plan-card ${stats.valid ? "" : "warning"}`.trim());
    card.append(
      el("h3", plan.label),
      el("p", `${stats.totalCredits} 學分｜平均風險 ${stats.averageRisk}｜先修缺口 ${stats.prerequisiteMissing}｜衝堂 ${stats.conflicts}`),
      el("p", stats.valid ? "符合方案限制" : `未符合：目標 ${plan.minCredits}-${plan.maxCredits} 學分，並需通過風險、先修、衝堂檢查`, "decision-plan-guidance"),
    );
    return card;
  }));
}

function renderCourses() {
  const tbody = $("#courseBody"); tbody.replaceChildren();
  state.courses.map(normalizeCourse).forEach((course) => {
    const tr = document.createElement("tr"); tr.dataset.id = course.id;
    tr.append(el("td", course.courseName), el("td", `${course.recognizedCredits}/${course.credits}`), el("td", course.requirementGroup));

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
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function bind() {
  $("#courseBody").addEventListener("change", (event) => {
    const field = event.target.dataset.field; const row = event.target.closest("tr");
    if (field && row) updateCourse(row.dataset.id, field, event.target);
  });
  $("#exportJson").addEventListener("click", () => download("ncku-credit-map-v2.json", serializeBackup(state.courses), "application/json;charset=utf-8"));
  $("#exportCsv").addEventListener("click", () => download("ncku-credit-map-v2.csv", exportCoursesToCsv(state.courses), "text/csv;charset=utf-8"));
  $("#importJson").addEventListener("change", (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { state = parseBackupPayload(reader.result); save(); render(); setStatus(`已匯入 ${state.courses.length} 門課。`); }
      catch (error) { setStatus(error.message, true); }
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  });
  $("#resetDemo").addEventListener("click", () => {
    if (!confirm("重置為公開、去識別化的課程資料？目前個人狀態會被取代。")) return;
    state = createCleanDefaultState(); save(); render(); setStatus("已重置為去識別化預設資料。");
  });
}

document.addEventListener("DOMContentLoaded", () => { load(); bind(); render(); });
