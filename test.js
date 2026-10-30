// Run with: node --test
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("./no-tax-on-tips.js");

test("2026 single tax matches Rev. Proc. 2025-32 bracket starts", () => {
  assert.equal(T.incomeTax(12400, 2026, "single"), 1240);
  assert.equal(T.incomeTax(50400, 2026, "single"), 5800);
  assert.equal(T.incomeTax(105700, 2026, "single"), 17966);
  assert.equal(T.incomeTax(201775, 2026, "single"), 41024);
  assert.equal(T.incomeTax(256225, 2026, "single"), 58448);
  assert.equal(T.incomeTax(640600, 2026, "single"), 192979.25);
});

test("2026 joint and head of household match the tables", () => {
  assert.equal(T.incomeTax(100800, 2026, "mfj"), 11600);
  assert.equal(T.incomeTax(211400, 2026, "mfj"), 35932);
  assert.equal(T.incomeTax(768700, 2026, "mfj"), 206583.5);
  assert.equal(T.incomeTax(67450, 2026, "hoh"), 7740);
  assert.equal(T.incomeTax(640600, 2026, "hoh"), 191171);
});

test("2025 tables match Rev. Proc. 2024-40", () => {
  assert.equal(T.incomeTax(48475, 2025, "single"), 5578.5);
  assert.equal(T.incomeTax(626350, 2025, "single"), 188769.75);
  assert.equal(T.incomeTax(206700, 2025, "mfj"), 35302);
  assert.equal(T.incomeTax(751600, 2025, "mfj"), 202154.5);
  assert.equal(T.incomeTax(250500, 2025, "hoh"), 55484);
});

test("deduction is capped at $25,000", () => {
  assert.equal(T.tipsDeduction(40000, 60000, "single").deduction, 25000);
  assert.equal(T.tipsDeduction(18000, 60000, "single").deduction, 18000);
});

test("regulation example: single, MAGI $200,000 → $20,000", () => {
  assert.equal(T.tipsDeduction(30000, 200000, "single").deduction, 20000);
});

test("phase-out counts only whole $1,000s over the threshold (Schedule 1-A line 11)", () => {
  assert.equal(T.tipsDeduction(25000, 150999, "single").deduction, 25000);
  assert.equal(T.tipsDeduction(25000, 151000, "single").deduction, 24900);
  assert.equal(T.tipsDeduction(25000, 151999.99, "single").deduction, 24900);
  assert.equal(T.tipsDeduction(25000, 300500, "mfj").deduction, 25000);
  assert.equal(T.tipsDeduction(25000, 310000, "mfj").deduction, 24000);
});

test("phase-out applies after the cap and never goes below zero", () => {
  assert.equal(T.tipsDeduction(10000, 180000, "single").deduction, 7000);
  assert.equal(T.tipsDeduction(25000, 400000, "single").deduction, 0);
  assert.equal(T.tipsDeduction(25000, 550000, "mfj").deduction, 0);
});

test("estimate: server in the 12% bracket saves about 12% of the deduction", () => {
  const r = T.estimate({ year: 2026, status: "single", tips: 30000, otherIncome: 28000 });
  assert.equal(r.agi, 58000);
  assert.equal(r.deduction, 25000);
  assert.equal(r.taxableBefore, 41900);
  assert.equal(r.taxableAfter, 16900);
  assert.equal(r.savings, T.incomeTax(41900, 2026, "single") - T.incomeTax(16900, 2026, "single"));
  assert.equal(r.savings, 3000);
});

test("estimate: deduction can't push taxable income below zero", () => {
  const r = T.estimate({ year: 2026, status: "single", tips: 20000, otherIncome: 0 });
  assert.equal(r.taxableBefore, 3900);
  assert.equal(r.taxableAfter, 0);
  assert.equal(r.savings, 390);
});

test("married filing separately gets no deduction", () => {
  const r = T.estimate({ year: 2026, status: "mfs", tips: 20000, otherIncome: 30000 });
  assert.equal(r.eligible, false);
  assert.equal(r.deduction, 0);
  assert.equal(r.savings, 0);
});

test("not eligible: no deduction, with a reason", () => {
  const r = T.estimate({ year: 2026, status: "single", tips: 20000, otherIncome: 30000, eligible: false });
  assert.equal(r.deduction, 0);
  assert.equal(r.reasons.length, 1);
});

test("itemized deductions larger than standard are used", () => {
  const r = T.estimate({ year: 2026, status: "single", tips: 10000, otherIncome: 60000, itemized: 20000 });
  assert.equal(r.baseDeduction, 20000);
  assert.equal(r.taxableBefore, 50000);
});

test("2027 and 2028 fall back to the 2026 tables", () => {
  const r = T.estimate({ year: 2028, status: "single", tips: 10000, otherIncome: 40000 });
  assert.equal(r.year, 2028);
  assert.equal(r.tableYear, 2026);
});

test("blank and negative inputs are treated as zero", () => {
  const r = T.estimate({ year: 2026, status: "single", tips: "", otherIncome: -5 });
  assert.equal(r.deduction, 0);
  assert.equal(r.savings, 0);
});
