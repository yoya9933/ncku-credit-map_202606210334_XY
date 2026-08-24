import { APP_CONFIG, normalizeCourse } from "./app-core.js";
import { generateAutoPlans } from "./auto-planner.js";

const $ = (selector) => document.querySelector(selector);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };

function loadCourses() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.courses) ? parsed.courses.map(normalizeCourse) : [];
  } catch { return []; }
}

function readOptions() {
  return {
    minCredits: Number($("#autoMinCredits").value || 12),
    targetCredits: Number($("#autoTargetCredits").value || 15),
    maxCredits: Number($("#autoMaxCredits").value || 18),
    maxAverageRisk: Number($("#autoMaxRisk").value || 3.5),
    maxHighRisk: Number($("#autoHighRisk").value || 2),
    limit: 3,
  };
}

function savePlan(plan, planKey) {
  const raw = localStorage.getItem(APP_CONFIG.storageKey);
  if (!raw) return;
  const state = JSON.parse(raw);
  const picked = new Set(plan.courses.map((course) => course.id));
  state.courses = state.courses.map(normalizeCourse).map((course) => ({ ...course, [planKey]: picked.has(course.id) }));
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
  location.reload();
}

function render() {
  const courses = loadCourses();
  const output = $("#autoPlanResults");
  try {
    const result = generateAutoPlans(courses, readOptions());
    output.replaceChildren();
    $("#autoPlanStatus").textContent = result.message;
    result.plans.forEach((plan, index) => {
      const card = el("article", null, "decision-plan-card");
      card.append(el("h3", `推薦 ${index + 1}｜${plan.totalCredits} 學分`));
      card.append(el("p", `平均風險 ${plan.averageRisk}｜評分 ${plan.score}`, "muted"));
      const names = el("ul", null, "plain-list");
      plan.courses.forEach((course) => names.append(el("li", `${course.courseName}（${course.credits}）`)));
      card.append(names, el("p", plan.reasons.join("；"), "decision-plan-guidance"));
      const actions = el("div", null, "tool-row");
      [["planA", "套用 A 案"], ["planB", "套用 B 案"], ["planC", "套用 C 案"]].forEach(([key, label]) => {
        const button = el("button", label, "secondary"); button.type = "button"; button.addEventListener("click", () => savePlan(plan, key)); actions.append(button);
      });
      card.append(actions); output.append(card);
    });
    if (!result.plans.length) output.append(el("p", "放寬學分或風險限制後再試一次。", "muted"));
  } catch (error) {
    $("#autoPlanStatus").textContent = error.message;
    output.replaceChildren();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("#runAutoPlanner")?.addEventListener("click", render);
  render();
});
