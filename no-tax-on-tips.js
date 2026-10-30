/*
 * No Tax on Tips calculator: the qualified tips deduction (Form 1040, Schedule 1-A, Part II)
 * and an estimate of the federal income tax it saves.
 *
 * Sources (checked October 2026):
 *   - Schedule 1-A (2025), lines 7-13: https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf
 *   - Rev. Proc. 2024-40 (2025 tax tables): https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
 *   - Rev. Proc. 2025-32 (2026 tables, and the 2025 standard deduction as amended):
 *     https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
 *
 * MIT License. Made by Tipling (https://tiplingapp.com).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NoTaxOnTips = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CAP = 25000;
  var YEARS = [2025, 2026, 2027, 2028];

  // [upper bound of bracket, rate]; the last bracket has no upper bound.
  var TABLES = {
    2025: {
      standard: { single: 15750, hoh: 23625, mfj: 31500, mfs: 15750 },
      brackets: {
        single: [[11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]],
        hoh: [[17000, 0.10], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]],
        mfj: [[23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
      },
    },
    2026: {
      standard: { single: 16100, hoh: 24150, mfj: 32200, mfs: 16100 },
      brackets: {
        single: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
        hoh: [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]],
        mfj: [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
      },
    },
  };

  function money(n) {
    return Math.round(n * 100) / 100;
  }

  /** Federal income tax on taxable income from the year's rate table. */
  function incomeTax(taxable, year, status) {
    var brackets = TABLES[year].brackets[status];
    var tax = 0, lower = 0, x = Math.max(0, taxable);
    for (var i = 0; i < brackets.length; i++) {
      var upper = brackets[i][0], rate = brackets[i][1];
      if (x > lower) tax += (Math.min(x, upper) - lower) * rate;
      lower = upper;
    }
    return money(tax);
  }

  /** The rate on the last dollar of taxable income. */
  function marginalRate(taxable, year, status) {
    var brackets = TABLES[year].brackets[status];
    for (var i = 0; i < brackets.length; i++) if (taxable <= brackets[i][0]) return brackets[i][1];
    return brackets[brackets.length - 1][1];
  }

  /**
   * The qualified tips deduction, following Schedule 1-A lines 7 to 13:
   * the smaller of tips or $25,000, minus $100 for every full $1,000 of MAGI over $150,000
   * ($300,000 if married filing jointly), never below zero.
   */
  function tipsDeduction(tips, magi, status) {
    var line7 = Math.min(Math.max(0, tips), CAP);
    var threshold = status === "mfj" ? 300000 : 150000;
    var excess = magi - threshold;
    if (excess <= 0) return { line7: line7, threshold: threshold, excess: 0, thousands: 0, reduction: 0, deduction: line7 };
    var thousands = Math.floor(excess / 1000); // line 11: round down to a whole number
    var reduction = thousands * 100; // line 12
    return { line7: line7, threshold: threshold, excess: excess, thousands: thousands, reduction: reduction, deduction: Math.max(0, line7 - reduction) };
  }

  /**
   * Estimate for one return.
   * input: { year, status: "single" | "hoh" | "mfj" | "mfs", tips, otherIncome, adjustments, itemized, eligible }
   *   tips: qualified tips for the year
   *   otherIncome: everything else in total income (wages without tips, interest, etc.)
   *   adjustments: adjustments to income (Schedule 1, Part II), if any
   *   itemized: itemized deductions if larger than the standard deduction, else 0
   *   eligible: occupation on the IRS list, valid SSN, tips reported
   */
  function estimate(input) {
    var year = YEARS.indexOf(+input.year) >= 0 ? +input.year : 2026;
    // Tables for 2027 and 2028 aren't published yet; the latest ones stand in for them.
    var tableYear = TABLES[year] ? year : 2026;
    var status = input.status || "single";
    var tips = Math.max(0, +input.tips || 0);
    var otherIncome = Math.max(0, +input.otherIncome || 0);
    var adjustments = Math.max(0, +input.adjustments || 0);
    var agi = Math.max(0, tips + otherIncome - adjustments);
    var magi = agi; // Schedule 1-A adds certain excluded foreign and Puerto Rico income; not modelled here.

    var reasons = [];
    if (status === "mfs") reasons.push("Married couples have to file jointly to claim the deduction.");
    if (input.eligible === false) reasons.push("Tips only qualify from a listed occupation, with a valid SSN, when they're reported.");

    var standard = TABLES[tableYear].standard[status];
    var baseDeduction = Math.max(standard, Math.max(0, +input.itemized || 0));
    var calcStatus = status === "mfs" ? "single" : status;
    var parts = tipsDeduction(tips, magi, status);
    var deduction = reasons.length ? 0 : parts.deduction;

    var taxableBefore = Math.max(0, agi - baseDeduction);
    var taxableAfter = Math.max(0, taxableBefore - deduction);
    // Married filing separately has its own table; it can't use this deduction, so only "no savings" is shown.
    var taxBefore = incomeTax(taxableBefore, tableYear, calcStatus);
    var taxAfter = incomeTax(taxableAfter, tableYear, calcStatus);

    return {
      year: year,
      tableYear: tableYear,
      status: status,
      eligible: reasons.length === 0,
      reasons: reasons,
      agi: money(agi),
      magi: money(magi),
      standardDeduction: standard,
      baseDeduction: baseDeduction,
      lines: parts,
      deduction: deduction,
      taxableBefore: money(taxableBefore),
      taxableAfter: money(taxableAfter),
      taxBefore: taxBefore,
      taxAfter: taxAfter,
      savings: money(taxBefore - taxAfter),
      marginalRate: marginalRate(taxableBefore, tableYear, calcStatus),
      // Tips stay subject to Social Security (6.2%, up to the wage base) and Medicare (1.45%).
      payrollTaxOnTips: money(tips * 0.0765),
    };
  }

  return { CAP: CAP, TABLES: TABLES, incomeTax: incomeTax, marginalRate: marginalRate, tipsDeduction: tipsDeduction, estimate: estimate };
});
