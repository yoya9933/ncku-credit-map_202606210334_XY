import {
  APP_CONFIG,
  buildDependencyGraph,
  calculateConflicts,
  getEligibility,
  getQuadrant,
  isCompleted,
  normalizeCourse,
} from "./app-core.js";

const round1 = (value) => Math.round(value * 10) / 10;

function decisionBonus(decision) {
  return ({ priority: 5, backup: 3, ask: 1, next: -3, later: -4, none: 0 })[decision] ?? 0;
}

function unlockCounts(courses) {
  const graph = buildDependencyGraph(courses);
  const counts = new Map(graph.nodes.map((node) => [node.courseCode, 0]));
  graph.edges.forEach((edge) => counts.set(edge.from, (counts.get(edge.from) || 0) + 1));
  return counts;
}

export function explainPlan(selected, allCourses, targetCredits) {
  const unlocks = unlockCounts(allCourses);
  const totalCredits = selected.reduce((sum, course) => sum + course.credits, 0);
  const highNeed = selected.filter((course) => course.necessityScore >= 4).length;
  const highRisk = selected.filter((course) => course.riskScore >= 4).length;
  const unlockTotal = selected.reduce((sum, course) => sum + (unlocks.get(course.courseCode) || 0), 0);
  const reasons = [];
  if (Math.abs(totalCredits - targetCredits) <= 1) reasons.push(`學分接近目標 ${targetCredits}`);
  else reasons.push(`總學分 ${totalCredits}`);
  if (highNeed) reasons.push(`${highNeed} 門高必要課`);
  if (unlockTotal) reasons.push(`可直接解鎖 ${unlockTotal} 個後續先修關係`);
  reasons.push(highRisk ? `${highRisk} 門高風險課` : "無高風險課");
  return reasons;
}

function scorePlan(selected, allCourses, options) {
  const unlocks = unlockCounts(allCourses);
  const credits = selected.reduce((sum, course) => sum + course.credits, 0);
  const averageRisk = selected.length ? selected.reduce((sum, course) => sum + course.riskScore, 0) / selected.length : 0;
  const highRisk = selected.filter((course) => course.riskScore >= 4).length;
  const necessity = selected.reduce((sum, course) => sum + course.necessityScore, 0);
  const decision = selected.reduce((sum, course) => sum + decisionBonus(course.decision), 0);
  const unlock = selected.reduce((sum, course) => sum + (unlocks.get(course.courseCode) || 0), 0);
  const targetPenalty = Math.abs(credits - options.targetCredits) * 3;
  const riskPenalty = averageRisk * 2 + highRisk * 2;
  return necessity * 3 + decision + unlock * 2 - targetPenalty - riskPenalty;
}

export function generateAutoPlans(inputCourses, options = {}) {
  const settings = {
    term: options.term || APP_CONFIG.currentTerm,
    minCredits: Number(options.minCredits ?? 12),
    targetCredits: Number(options.targetCredits ?? 15),
    maxCredits: Number(options.maxCredits ?? 18),
    maxAverageRisk: Number(options.maxAverageRisk ?? 3.5),
    maxHighRisk: Number(options.maxHighRisk ?? 2),
    limit: Math.max(1, Number(options.limit ?? 3)),
  };
  if (settings.minCredits < 0 || settings.maxCredits < settings.minCredits || settings.targetCredits < settings.minCredits || settings.targetCredits > settings.maxCredits) {
    throw new Error("自動排課的學分範圍設定不合法。");
  }

  const courses = inputCourses.map(normalizeCourse);
  const pool = courses
    .filter((course) => !isCompleted(course) && course.term === settings.term && course.credits > 0)
    .filter((course) => getEligibility(course, courses).eligible)
    .sort((a, b) => (b.necessityScore - b.riskScore) - (a.necessityScore - a.riskScore));

  const results = [];
  const selected = [];

  function visit(index, credits) {
    if (credits > settings.maxCredits) return;
    if (index === pool.length) {
      if (credits < settings.minCredits || !selected.length) return;
      const conflicts = calculateConflicts(selected, settings.term);
      if (conflicts.length) return;
      const averageRisk = selected.reduce((sum, course) => sum + course.riskScore, 0) / selected.length;
      const highRisk = selected.filter((course) => getQuadrant(course) === "高必要高風險" || course.riskScore >= 4).length;
      if (averageRisk > settings.maxAverageRisk || highRisk > settings.maxHighRisk) return;
      const picked = selected.map((course) => ({ ...course }));
      results.push({
        courses: picked,
        totalCredits: credits,
        averageRisk: round1(averageRisk),
        highRisk,
        score: round1(scorePlan(picked, courses, settings)),
        reasons: explainPlan(picked, courses, settings.targetCredits),
      });
      return;
    }
    visit(index + 1, credits);
    selected.push(pool[index]);
    visit(index + 1, credits + pool[index].credits);
    selected.pop();
  }

  visit(0, 0);
  results.sort((a, b) => b.score - a.score || Math.abs(a.totalCredits - settings.targetCredits) - Math.abs(b.totalCredits - settings.targetCredits) || a.averageRisk - b.averageRisk);

  const unique = [];
  const seen = new Set();
  for (const plan of results) {
    const key = plan.courses.map((course) => course.courseCode).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(plan);
    if (unique.length >= settings.limit) break;
  }

  return {
    settings,
    candidateCount: pool.length,
    plans: unique,
    message: unique.length ? `從 ${pool.length} 門可修課中找到 ${unique.length} 個方案。` : `目前 ${pool.length} 門可修課無法組成符合限制的方案。`,
  };
}
