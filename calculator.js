/*
 * No Tax on Tips calculator widget. Needs no-tax-on-tips.js and calculator.css.
 * Usage: <div id="no-tax-on-tips-calculator"></div>
 * MIT License. Made by Tipling (https://tiplingapp.com).
 */
(function () {
  "use strict";
  var T = window.NoTaxOnTips;
  var root = document.getElementById("no-tax-on-tips-calculator");
  if (!T || !root) return;

  var usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  var fmt = function (n) { return usd.format(Math.round(n)); };
  var pct = function (n) { return Math.round(n * 100) + "%"; };

  root.innerHTML =
    '<form class="nttc-form" novalidate>' +
    '  <div class="nttc-row">' +
    '    <label>Tax year<select name="year"><option>2025</option><option selected>2026</option><option>2027</option><option>2028</option></select></label>' +
    '    <label>Filing status<select name="status">' +
    '      <option value="single">Single</option><option value="hoh">Head of household</option>' +
    '      <option value="mfj">Married filing jointly</option><option value="mfs">Married filing separately</option>' +
    '    </select></label>' +
    '  </div>' +
    '  <label>Qualified tips for the year<span class="nttc-hint">Cash and card tips you reported, including tips from a pool</span>' +
    '    <span class="nttc-money"><input name="tips" inputmode="decimal" placeholder="0" value="30000"></span></label>' +
    '  <label>Other income for the year<span class="nttc-hint">Wages without tips, plus interest and anything else on your return</span>' +
    '    <span class="nttc-money"><input name="otherIncome" inputmode="decimal" placeholder="0" value="28000"></span></label>' +
    '  <details class="nttc-more"><summary>More options</summary>' +
    '    <label>Adjustments to income<span class="nttc-hint">For example IRA contributions or student loan interest, if any</span>' +
    '      <span class="nttc-money"><input name="adjustments" inputmode="decimal" placeholder="0"></span></label>' +
    '    <label>Itemized deductions<span class="nttc-hint">Only if you itemize and they\'re more than the standard deduction</span>' +
    '      <span class="nttc-money"><input name="itemized" inputmode="decimal" placeholder="0"></span></label>' +
    '  </details>' +
    '  <fieldset class="nttc-check"><legend>Do these apply to you?</legend>' +
    '    <label><input type="checkbox" name="occupation" checked> My job is on the IRS list of tipped occupations</label>' +
    '    <label><input type="checkbox" name="ssn" checked> I have a Social Security number valid for work</label>' +
    '    <label><input type="checkbox" name="reported" checked> My tips are on my W-2, a 1099, or I report them on Form 4137</label>' +
    '  </fieldset>' +
    '</form>' +
    '<div class="nttc-result" aria-live="polite"></div>';

  var form = root.querySelector("form");
  var out = root.querySelector(".nttc-result");
  var num = function (name) { return parseFloat(String(form.elements[name].value).replace(/[$,\s]/g, "")) || 0; };

  function render() {
    var eligible = form.elements.occupation.checked && form.elements.ssn.checked && form.elements.reported.checked;
    var r = T.estimate({
      year: form.elements.year.value,
      status: form.elements.status.value,
      tips: num("tips"),
      otherIncome: num("otherIncome"),
      adjustments: num("adjustments"),
      itemized: num("itemized"),
      eligible: eligible,
    });
    var l = r.lines;
    var head;
    if (!r.eligible) {
      head = '<p class="nttc-label">Your tips deduction</p><p class="nttc-big">$0</p>' +
        r.reasons.map(function (x) { return '<p class="nttc-warn">' + x + "</p>"; }).join("");
    } else {
      head = '<p class="nttc-label">Your tips deduction</p><p class="nttc-big">' + fmt(r.deduction) + "</p>" +
        '<p class="nttc-save">Estimated federal income tax saved: <b>' + fmt(r.savings) + "</b></p>";
    }
    var rows = r.eligible ? [
      ["Qualified tips, up to $25,000 (line 7)", fmt(l.line7)],
      ["Income over " + fmt(l.threshold) + " (line 10)", fmt(l.excess)],
      ["Reduction: $100 per full $1,000 over (line 12)", "− " + fmt(l.reduction)],
      ["Tips deduction (line 13)", fmt(r.deduction)],
    ] : [];
    rows = rows.concat([
      ["Adjusted gross income", fmt(r.agi)],
      [r.baseDeduction > r.standardDeduction ? "Itemized deductions" : "Standard deduction (" + r.tableYear + ")", "− " + fmt(r.baseDeduction)],
      ["Taxable income without the deduction", fmt(r.taxableBefore)],
      ["Taxable income with it", fmt(r.taxableAfter)],
      ["Federal income tax without / with", fmt(r.taxBefore) + " / " + fmt(r.taxAfter)],
      ["Your top tax bracket", pct(r.marginalRate)],
    ]);
    var table = '<table class="nttc-table"><tbody>' + rows.map(function (x) {
      return "<tr><td>" + x[0] + "</td><td>" + x[1] + "</td></tr>";
    }).join("") + "</tbody></table>";
    var notes = '<p class="nttc-note">Social Security and Medicare still apply to these tips: about ' + fmt(r.payrollTaxOnTips) +
      " (7.65%), or less if your wages pass the Social Security wage base.</p>";
    if (r.year !== r.tableYear) notes += '<p class="nttc-note">' + r.year + " tax brackets aren't published yet, so " + r.tableYear + " brackets are used.</p>";
    out.innerHTML = head + table + notes;
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  render();
})();
