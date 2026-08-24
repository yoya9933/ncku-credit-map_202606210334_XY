import assert from "node:assert/strict";
import { APP_CONFIG, normalizeCourse } from "./app-core.js";
import { explainPlan, generateAutoPlans } from "./auto-planner.js";

const course = (id, credits, extra = {}) => normalizeCourse({
  id,
  courseCode: id,
  courseName: id,
  credits,
  recognizedCredits: credits,
  requirementGroup: "elective",
  term: APP_CONFIG.currentTerm,
  necessityScore: 4,
  riskScore: 2,
  decision: "priority",
  ...extra,
});

const courses = [
  course("A", 3, { slots: [{ day: 1, start: 1, end: 2 }] }),
  course("B", 3, { slots: [{ day: 2, start: 1, end: 2 }] }),
  course("C", 3, { slots: [{ day: 3, start: 1, end: 2 }] }),
  course("D", 3, { slots: [{ day: 4, start: 1, end: 2 }] }),
  course("E", 3, { slots: [{ day: 5, start: 1, end: 2 }], riskScore: 4, necessityScore: 5 }),
  course("F", 3, { slots: [{ day: 1, start: 2, end: 3 }] }),
];

const generated = generateAutoPlans(courses, { minCredits: 12, targetCredits: 15, maxCredits: 15, maxAverageRisk: 3.5, maxHighRisk: 1, limit: 3 });
assert.ok(generated.plans.length > 0);
assert.equal(generated.plans[0].totalCredits, 15);
assert.ok(generated.plans.every((plan) => plan.totalCredits >= 12 && plan.totalCredits <= 15));
assert.ok(generated.plans.every((plan) => plan.highRisk <= 1));
assert.ok(generated.plans.every((plan) => !(plan.courses.some((c) => c.courseCode === "A") && plan.courses.some((c) => c.courseCode === "F"))));
assert.ok(explainPlan(generated.plans[0].courses, courses, 15).length >= 2);

const blocked = course("BLOCKED", 3, { prerequisites: [{ courseCode: "MISSING" }] });
const onlyBlocked = generateAutoPlans([blocked], { minCredits: 3, targetCredits: 3, maxCredits: 3 });
assert.equal(onlyBlocked.candidateCount, 0);
assert.equal(onlyBlocked.plans.length, 0);

assert.throws(() => generateAutoPlans(courses, { minCredits: 18, targetCredits: 15, maxCredits: 12 }), /不合法/);

console.log("auto planner regression tests passed");
