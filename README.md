# No Tax on Tips calculator

A small, dependency-free calculator for the US federal **qualified tips deduction** ("No Tax on Tips", tax years 2025 to 2028). It works out the deduction the way IRS **Schedule 1-A, Part II** does, then estimates how much federal income tax it saves.

**Live version, with explanations and examples: [tiplingapp.com/no-tax-on-tips-calculator](https://tiplingapp.com/no-tax-on-tips-calculator/)**


## What it calculates

Following Schedule 1-A (2025), lines 7 to 13:

1. **Line 7:** qualified tips, up to $25,000.
2. **Lines 8 to 10:** modified AGI over $150,000 ($300,000 married filing jointly).
3. **Line 11:** that excess divided by $1,000, **rounded down** to a whole number.
4. **Lines 12 to 13:** $100 per whole $1,000 comes off line 7, never below zero.

The rounding in line 11 is easy to miss. At $150,999 of MAGI (single) nothing is lost; at $151,000, $100 is.

The tax saving compares federal income tax on taxable income with and without the deduction, using the standard deduction (or itemized deductions if larger) and the year's rate tables.

| Year | Rate tables | Standard deduction |
|---|---|---|
| 2025 | [Rev. Proc. 2024-40](https://www.irs.gov/pub/irs-drop/rp-24-40.pdf) | $15,750 / $23,625 / $31,500 (single / HOH / MFJ), as amended, per [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| 2026 | [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) | $16,100 / $24,150 / $32,200 |
| 2027, 2028 | not published yet; 2026 tables are used | |

Married filing separately can't claim the deduction. Social Security and Medicare still apply to tips; the calculator shows 7.65% of tips as a rough reminder.

**Not modelled:** credits, the other 2025 deductions (overtime, seniors, car loan interest), AMT, state income tax, the excluded foreign and Puerto Rico income that Schedule 1-A adds to MAGI, and the net-profit limit for self-employed tips. It's an estimate, not tax advice.

## Use it

Open `index.html`, or embed it on any page:

```html
<link rel="stylesheet" href="calculator.css">
<div id="no-tax-on-tips-calculator"></div>
<script src="no-tax-on-tips.js"></script>
<script src="calculator.js"></script>
```

Or use the math on its own (browser global `NoTaxOnTips`, or CommonJS):

```js
const T = require("./no-tax-on-tips.js");
T.tipsDeduction(30000, 200000, "single").deduction; // 20000
T.estimate({ year: 2026, status: "single", tips: 30000, otherIncome: 28000 }).savings; // 3000
```

Everything runs in the browser. Nothing is sent anywhere.

## Tests

```bash
npm test
```

The tests check every bracket boundary against the IRS tables, the regulation's own example (single, MAGI $200,000 → $20,000), and the line 11 rounding.

## Sources

- [Schedule 1-A (Form 1040)](https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf)
- [IRS: What the "No Tax on Tips" deduction means for you](https://www.irs.gov/newsroom/what-the-no-tax-on-tips-deduction-means-for-you)
- [IRS: tipped occupations list](https://www.irs.gov/TippedOccupations)
- [Rev. Proc. 2024-40](https://www.irs.gov/pub/irs-drop/rp-24-40.pdf), [Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)

Found a mistake? Please open an issue with the IRS source.

## About

Made by [Tipling](https://tiplingapp.com), a tip tracker app for servers, bartenders and other tipped workers. MIT licensed.
