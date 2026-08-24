import {
  APP_CONFIG, COURSE_STATUSES, DECISIONS, PLAN_CONFIG, REQUIREMENT_GROUPS, REQUIREMENTS,
  buildDependencyGraph, calculateConflicts, calculateGpaProjection, calculateGraduation,
  calculateRiskSummary, candidateCourses, createCleanDefaultState, decisionLabel, deleteCourse,
  exportCoursesToCsv, importCoursesFromCsv, normalizeCourse, parseBackupPayload, planStats,
  serializeBackup, upsertCourse,
} from "./app-core.js";

const storage = (() => { try { return localStorage; } catch { return null; } })();
let state = createCleanDefaultState();
let searchText = "";
const $ = (selector) => document.querySelector(selector);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

function setStatus(text, error = false) {
  const node = $("#status"); if (!node) return;
  node.textContent = text; node.className = error ? "status error" : "status";
}

function save() {
  if (!storage) return;
  try { storage.setItem(APP_CONFIG.storageKey, JSON.stringify(state)); }
  catch (error) { setStatus(`儲存失敗：${error.message}`, true); }
}

function readSnapshots() {
  if (!storage) return [];
  try { const value = JSON.parse(storage.getItem(APP_CONFIG.snapshotKey) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

function writeSnapshots(items) {
  if (!storage) return;
  try { storage.setItem(APP_CONFIG.snapshotKey, JSON.stringify(items.slice(-APP_CONFIG.maxSnapshots))); }
  catch (error) { setStatus(`快照儲存失敗：${error.message}`, true); }
}

function snapshot(reason) {
  const items = readSnapshots();
  items.push({ at: new Date().toISOString(), reason, state });
  writeSnapshots(items);
  renderSnapshotStatus();
}

function undo() {
  const items = readSnapshots();
  const last = items.pop();
  if (!last) { setStatus("目前沒有可復原的快照。", true); return; }
  state = parseBackupPayload(last.state); writeSnapshots(items); save(); render();
  setStatus(`已復原：${last.reason}`);
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
    save(); setStatus("已從 V1 遷移到 V2；舊資料已保留備份。");
  } catch {
    storage.setItem(`${APP_CONFIG.legacyStorageKey}-corrupt-${Date.now()}`, legacy);
    setStatus("舊資料格式異常，已保留原始備份。", true);
  }
}

function renderDashboard() {
  const g = calculateGraduation(state.courses); const risk = calculateRiskSummary(state.courses);
  const cards = [
    ["畢業認列", `${g.total.recognized} / ${g.total.required}`], ["水利必修", `${g.major.recognized} / ${g.major.required}`],
    ["通識", `${g.general.recognized} / ${g.general.required}`], ["選修", `${g.elective.recognized} / ${g.elective.required}`],
    ["本系選修", `${g.elective.departmentRecognized} / ${g.elective.departmentRequired}`], ["未完成高風險", String(risk.highRisk.length)],
  ];
  $("#dashboard").replaceChildren(...cards.map(([label, value]) => { const node = el("div", null, "metric"); node.append(el("strong", label), el("span", value)); return node; }));
  const rules = [
    `專業必修 ${g.major.core}/${REQUIREMENTS.major.core}`,
    `設計必修 ${g.major.design}/${REQUIREMENTS.major.design.requiredCredits}`,
    `必選修 ${g.major.requiredElective}/${REQUIREMENTS.major.requiredElective}`,
    `通識自然與工程科學 ${g.general.naturalEngineeringRecognized}/${g.general.naturalEngineeringRaw}（認列上限 ${REQUIREMENTS.general.caps.naturalEngineering}）`,
    `體育 ${g.gates.pe.completed}/${g.gates.pe.required} 學期`, `英語門檻 ${g.gates.english.satisfied ? "完成" : "未完成"}`,
  ];
  $("#ruleSummary").replaceChildren(...rules.map((text) => el("li", text)));
}

function renderCandidates() {
  const rows = candidateCourses(state.courses); const tbody = $("#candidateBody"); tbody.replaceChildren();
  rows.forEach((course) => {
    const tr = document.createElement("tr");
    const values = [course.courseName, `${course.credits}`, decisionLabel(course.decision), course.eligibility.eligible ? "可修" : `先修未滿：${course.eligibility.missing.map((r) => r.courseCode || r.courseName).join("、")}`];
    ["課程", "學分", "決策", "資格"].forEach((label, index) => { const td = el("td", values[index]); td.dataset.label = label; tr.append(td); }); tbody.append(tr);
  });
  if (!rows.length) { const tr = document.createElement("tr"); const td = el("td", "目前沒有候選課"); td.colSpan = 4; tr.append(td); tbody.append(tr); }
}

function renderConflicts() {
  const eligible = candidateCourses(state.courses).filter((course) => course.eligibility.eligible);
  const conflicts = calculateConflicts(eligible); const list = $("#conflictList");
  list.replaceChildren(...conflicts.map((item) => el("li", `${item.courseA.courseName} ↔ ${item.courseB.courseName}`)));
  if (!conflicts.length) list.append(el("li", "目前候選課沒有自動偵測到衝堂。"));
}

function renderPlans() {
  $("#plans").replaceChildren(...PLAN_CONFIG.map((plan) => {
    const stats = planStats(state.courses, plan); const card = el("div", null, `decision-plan-card ${stats.valid ? "" : "warning"}`.trim());
    card.append(el("h3", plan.label), el("p", `${stats.totalCredits} 學分｜平均風險 ${stats.averageRisk}｜先修缺口 ${stats.prerequisiteMissing}｜衝堂 ${stats.conflicts}`), el("p", stats.valid ? "符合方案限制" : `目標 ${plan.minCredits}-${plan.maxCredits} 學分，並需通過風險、先修、衝堂檢查`, "decision-plan-guidance"));
    return card;
  }));
}

function fieldSelect(values, current, field) {
  const select = document.createElement("select"); select.dataset.field = field;
  values.forEach((value) => { const option = el("option", field === "decision" ? decisionLabel(value) : value); option.value = value; option.selected = current === value; select.append(option); });
  return select;
}

function renderCourses() {
  const tbody = $("#courseBody"); tbody.replaceChildren();
  const courses = state.courses.map(normalizeCourse).filter((c) => !searchText || `${c.courseName} ${c.courseCode} ${c.officialCourseCode}`.toLowerCase().includes(searchText));
  courses.forEach((course) => {
    const tr = document.createElement("tr"); tr.dataset.id = course.id;
    const staticCells = [["課程", `${course.courseName}${course.officialCourseCode ? `\n${course.officialCourseCode}` : ""}`], ["認列/學分", `${course.recognizedCredits}/${course.credits}`], ["群組", course.requirementGroup]];
    staticCells.forEach(([label, value]) => { const td = el("td", value); td.dataset.label = label; tr.append(td); });
    const statusTd = document.createElement("td"); statusTd.dataset.label = "狀態"; statusTd.append(fieldSelect(COURSE_STATUSES, course.status, "status")); tr.append(statusTd);
    const gradeTd = document.createElement("td"); gradeTd.dataset.label = "成績"; const grade = document.createElement("input"); grade.value = course.grade; grade.placeholder = "實際"; grade.dataset.field = "grade"; gradeTd.append(grade); tr.append(gradeTd);
    const expectedTd = document.createElement("td"); expectedTd.dataset.label = "預估"; const expected = document.createElement("input"); expected.value = course.expectedGrade; expected.placeholder = "預估"; expected.dataset.field = "expectedGrade"; expectedTd.append(expected); tr.append(expectedTd);
    const decisionTd = document.createElement("td"); decisionTd.dataset.label = "決策"; decisionTd.append(fieldSelect(DECISIONS, course.decision, "decision")); tr.append(decisionTd);
    ["planA", "planB", "planC"].forEach((field) => { const td = document.createElement("td"); td.dataset.label = field.toUpperCase(); const input = document.createElement("input"); input.type = "checkbox"; input.checked = course[field]; input.dataset.field = field; td.append(input); tr.append(td); });
    const actions = document.createElement("td"); actions.dataset.label = "操作"; actions.className = "row-actions";
    const edit = el("button", "編輯", "secondary"); edit.type = "button"; edit.dataset.action = "edit";
    const remove = el("button", "刪除", "delete"); remove.type = "button"; remove.dataset.action = "delete"; actions.append(edit, remove); tr.append(actions); tbody.append(tr);
  });
  if (!courses.length) { const tr = document.createElement("tr"); const td = el("td", "找不到符合的課程"); td.colSpan = 11; tr.append(td); tbody.append(tr); }
}

function renderDependencies() {
  const graph = buildDependencyGraph(state.courses); const list = $("#dependencyList");
  const important = graph.nodes.filter((n) => n.downstreamCount > 0).sort((a, b) => b.downstreamCount - a.downstreamCount);
  list.replaceChildren(...important.map((node) => {
    const outgoing = graph.edges.filter((e) => e.from === node.courseCode).map((e) => `${e.toName}${e.minimumGrade ? ` (${e.minimumGrade}+)` : ""}`);
    return el("li", `${node.completed ? "✓ " : ""}${node.courseName} → ${outgoing.join("、")}`);
  }));
  if (!important.length) list.append(el("li", "目前沒有結構化先修鏈。"));
}

function renderGpa() {
  const result = calculateGpaProjection({ currentGpa: $("#currentGpa")?.value, currentCredits: $("#currentGpaCredits")?.value, courses: state.courses });
  $("#gpaResult").textContent = result.semesterCredits ? `預估本學期 GPA ${result.semesterGpa}；累積 GPA 約 ${result.projectedGpa}（${result.semesterCredits} 學分納入模擬）` : "在課程表的「預估」欄填入百分制成績後即可模擬。";
}

function renderSnapshotStatus() {
  const count = readSnapshots().length; const button = $("#undoButton"); if (button) button.disabled = count === 0;
  const node = $("#snapshotStatus"); if (node) node.textContent = `可復原快照：${count}/${APP_CONFIG.maxSnapshots}`;
}

function render() { renderDashboard(); renderCandidates(); renderConflicts(); renderPlans(); renderCourses(); renderDependencies(); renderGpa(); renderSnapshotStatus(); }

function mutate(reason, operation) {
  snapshot(reason); operation(); save(); render();
}

function updateCourse(id, field, target) {
  const value = target.type === "checkbox" ? target.checked : target.value;
  mutate(`修改課程 ${id}`, () => { const course = state.courses.map(normalizeCourse).find((c) => c.id === id); state.courses = upsertCourse(state.courses, { ...course, [field]: value }); });
}

function parsePrerequisites(text) {
  return String(text || "").split(",").map((part) => part.trim()).filter(Boolean).map((part) => { const [courseCode, grade] = part.split(":").map((v) => v.trim()); return { courseCode, ...(grade ? { minimumGrade: Number(grade) } : {}) }; });
}

function openEditor(course = null) {
  const c = course ? normalizeCourse(course) : null; const form = $("#courseForm"); form.reset();
  form.elements.id.value = c?.id || `custom-${Date.now()}`;
  form.elements.courseCode.value = c?.courseCode || ""; form.elements.officialCourseCode.value = c?.officialCourseCode || ""; form.elements.courseName.value = c?.courseName || "";
  form.elements.credits.value = c?.credits ?? 0; form.elements.recognizedCredits.value = c?.recognizedCredits ?? 0; form.elements.requirementGroup.value = c?.requirementGroup || "elective";
  form.elements.status.value = c?.status || "未修"; form.elements.grade.value = c?.grade || ""; form.elements.expectedGrade.value = c?.expectedGrade || ""; form.elements.term.value = c?.term || "";
  form.elements.teacher.value = c?.teacher || ""; form.elements.location.value = c?.location || ""; form.elements.prerequisites.value = (c?.prerequisites || []).map((p) => `${p.courseCode}${p.minimumGrade ? `:${p.minimumGrade}` : ""}`).join(", ");
  form.elements.departmentElective.checked = Boolean(c?.departmentElective); form.elements.countsTowardGraduation.checked = c ? c.countsTowardGraduation : true; form.elements.gateProgress.value = c?.gateProgress || 0;
  $("#courseDialogTitle").textContent = c ? "編輯課程" : "新增課程"; $("#courseDialog").showModal();
}

function submitEditor(event) {
  event.preventDefault(); const f = event.currentTarget.elements; const existing = state.courses.map(normalizeCourse).find((c) => c.id === f.id.value);
  const draft = {
    ...(existing || {}), id: f.id.value.trim(), courseCode: f.courseCode.value.trim() || f.id.value.trim(), officialCourseCode: f.officialCourseCode.value.trim(), courseName: f.courseName.value.trim(),
    credits: Number(f.credits.value), recognizedCredits: Number(f.recognizedCredits.value), requirementGroup: f.requirementGroup.value, status: f.status.value, grade: f.grade.value.trim(), expectedGrade: f.expectedGrade.value.trim(),
    term: f.term.value.trim(), teacher: f.teacher.value.trim(), location: f.location.value.trim(), prerequisites: parsePrerequisites(f.prerequisites.value), departmentElective: f.departmentElective.checked,
    countsTowardGraduation: f.countsTowardGraduation.checked, gateProgress: Number(f.gateProgress.value || 0), source: existing?.source || "user", verifiedAt: existing?.verifiedAt || "",
  };
  try { mutate(`${existing ? "編輯" : "新增"} ${draft.courseName}`, () => { state.courses = upsertCourse(state.courses, draft); }); $("#courseDialog").close(); setStatus(`已${existing ? "更新" : "新增"} ${draft.courseName}。`); }
  catch (error) { setStatus(error.message, true); }
}

function download(filename, content, type) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

function readFile(file, onLoad) { const reader = new FileReader(); reader.onload = () => onLoad(reader.result); reader.readAsText(file, "utf-8"); }

function bind() {
  $("#courseBody").addEventListener("change", (event) => { const field = event.target.dataset.field; const row = event.target.closest("tr"); if (field && row) updateCourse(row.dataset.id, field, event.target); });
  $("#courseBody").addEventListener("click", (event) => {
    const action = event.target.dataset.action; const row = event.target.closest("tr"); if (!action || !row) return;
    const course = state.courses.map(normalizeCourse).find((c) => c.id === row.dataset.id); if (!course) return;
    if (action === "edit") openEditor(course);
    if (action === "delete" && confirm(`刪除「${course.courseName}」？可用復原按鈕救回。`)) mutate(`刪除 ${course.courseName}`, () => { state.courses = deleteCourse(state.courses, course.id); });
  });
  $("#addCourse").addEventListener("click", () => openEditor()); $("#courseForm").addEventListener("submit", submitEditor); $("#cancelCourseEdit").addEventListener("click", () => $("#courseDialog").close());
  $("#courseSearch").addEventListener("input", (event) => { searchText = event.target.value.trim().toLowerCase(); renderCourses(); });
  $("#undoButton").addEventListener("click", undo);
  ["#currentGpa", "#currentGpaCredits"].forEach((selector) => $(selector).addEventListener("input", renderGpa));
  $("#exportJson").addEventListener("click", () => download("ncku-credit-map-v2.json", serializeBackup(state.courses), "application/json;charset=utf-8"));
  $("#exportCsv").addEventListener("click", () => download("ncku-credit-map-v2.csv", exportCoursesToCsv(state.courses), "text/csv;charset=utf-8"));
  $("#importJson").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; readFile(file, (text) => { try { snapshot("匯入 JSON 前"); state = parseBackupPayload(text); save(); render(); setStatus(`已匯入 ${state.courses.length} 門課。`); } catch (error) { setStatus(error.message, true); } event.target.value = ""; }); });
  $("#importCsv").addEventListener("change", (event) => { const file = event.target.files?.[0]; if (!file) return; readFile(file, (text) => { try { const imported = importCoursesFromCsv(text); snapshot("匯入 CSV 前"); let courses = state.courses; imported.forEach((course) => { courses = upsertCourse(courses, course); }); state.courses = courses; save(); render(); setStatus(`CSV 已合併 ${imported.length} 門課。`); } catch (error) { setStatus(error.message, true); } event.target.value = ""; }); });
  $("#resetDemo").addEventListener("click", () => { if (!confirm("重置為公開課程資料？可用復原按鈕救回目前狀態。")) return; mutate("重置前", () => { state = createCleanDefaultState(); }); setStatus("已重置為去識別化預設資料。"); });
}

document.addEventListener("DOMContentLoaded", () => { load(); bind(); render(); });
