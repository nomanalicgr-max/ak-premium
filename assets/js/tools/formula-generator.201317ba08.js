/* AK Premium v12 — formula-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

const FORMULA_TASKS = {
  sumif: { name: "SUMIF — add up values that meet one condition", fields: [["f_sum_range", "Range to add up", "B2:B20"], ["f_criteria_range", "Range to check", "A2:A20"], ["f_criteria", "Condition", "\"Approved\" or \">100\""]],
    build: (v) => "=SUMIF(" + v.f_criteria_range + ", " + quoteCriteria(v.f_criteria) + ", " + v.f_sum_range + ")",
    explain: (v) => "Adds up the numbers in " + v.f_sum_range + " only where " + v.f_criteria_range + " meets " + v.f_criteria + ".",
    example: "With sales in B2:B20 and region in A2:A20, =SUMIF(A2:A20, \"Lahore\", B2:B20) adds up Lahore sales only." },
  sumifs: { name: "SUMIFS — add up values that meet several conditions", fields: [["f_sum_range", "Range to add up", "C2:C20"], ["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Lahore\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\"2026\""]],
    build: (v) => "=SUMIFS(" + v.f_sum_range + ", " + v.f_criteria_range1 + ", " + quoteCriteria(v.f_criteria1) + ", " + v.f_criteria_range2 + ", " + quoteCriteria(v.f_criteria2) + ")",
    explain: (v) => "Adds up " + v.f_sum_range + " only where both conditions are true at the same time.",
    example: "Add Lahore 2026 sales: =SUMIFS(C2:C20, A2:A20, \"Lahore\", B2:B20, \"2026\")." },
  countifs: { name: "COUNTIFS — count rows that meet several conditions", fields: [["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Approved\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\">100\""]],
    build: (v) => "=COUNTIFS(" + v.f_criteria_range1 + ", " + quoteCriteria(v.f_criteria1) + ", " + v.f_criteria_range2 + ", " + quoteCriteria(v.f_criteria2) + ")",
    explain: (v) => "Counts the rows where both conditions are true.",
    example: "Count approved orders over 100: =COUNTIFS(A2:A20, \"Approved\", B2:B20, \">100\")." },
  vlookup: { name: "VLOOKUP — find a value in a table", fields: [["f_lookup", "Value to look up", "A2"], ["f_table", "Table to search", "Sheet2!A:B"], ["f_col", "Column number to return", "2"]],
    build: (v) => "=VLOOKUP(" + quoteCriteria(v.f_lookup) + ", " + v.f_table + ", " + v.f_col + ", FALSE)",
    explain: (v) => "Searches the first column of " + v.f_table + " for " + v.f_lookup + " and returns the value from column " + v.f_col + ". FALSE means exact match.",
    example: "Find a product price: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)." },
  xlookup: { name: "XLOOKUP — find a value (modern replacement for VLOOKUP)", fields: [["f_lookup", "Value to look up", "A2"], ["f_lookup_array", "Range to search", "Sheet2!A:A"], ["f_return_array", "Range to return from", "Sheet2!B:B"]],
    build: (v) => "=XLOOKUP(" + quoteCriteria(v.f_lookup) + ", " + v.f_lookup_array + ", " + v.f_return_array + ", \"Not found\")",
    explain: (v) => "Searches " + v.f_lookup_array + " for " + v.f_lookup + " and returns the matching value from " + v.f_return_array + ". Shows \"Not found\" if there is no match.",
    example: "Find a price: =XLOOKUP(A2, Sheet2!A:A, Sheet2!B:B, \"Not found\"). Needs Microsoft 365 or Excel 2021." },
  indexmatch: { name: "INDEX + MATCH — look up in any direction", fields: [["f_return_range", "Range to return from", "B2:B20"], ["f_lookup", "Value to look up", "A2"], ["f_lookup_range", "Range to search", "Sheet2!A2:A20"]],
    build: (v) => "=INDEX(" + v.f_return_range + ", MATCH(" + quoteCriteria(v.f_lookup) + ", " + v.f_lookup_range + ", 0))",
    explain: (v) => "MATCH finds the position of " + v.f_lookup + " in " + v.f_lookup_range + " (0 means exact match), and INDEX returns the value at that position from " + v.f_return_range + ". Unlike VLOOKUP it can look to the left.",
    example: "Find a price by product code: =INDEX(B2:B20, MATCH(A2, Sheet2!A2:A20, 0))." },
  ifformula: { name: "IF — one condition, two results", fields: [["f_condition", "Condition to test", "A2>100"], ["f_true", "Value if true", "\"High\""], ["f_false", "Value if false", "\"Low\""]],
    build: (v) => "=IF(" + v.f_condition + ", " + v.f_true + ", " + v.f_false + ")",
    explain: (v) => "Tests " + v.f_condition + ". If it is true the result is " + v.f_true + ", otherwise " + v.f_false + ".",
    example: "Mark high sales: =IF(A2>100, \"High\", \"Low\")." },
  nestedif: { name: "Nested IF — grade or category from a number", fields: [["f_cell", "Cell with the number", "A2"], ["f_high", "Top threshold", "80"], ["f_mid", "Middle threshold", "50"]],
    build: (v) => "=IF(" + v.f_cell + ">=" + v.f_high + ", \"A\", IF(" + v.f_cell + ">=" + v.f_mid + ", \"B\", \"C\"))",
    explain: (v) => "Checks the top threshold first, then the middle one. Change the letters A, B and C to your own labels.",
    example: "Grade a mark: =IF(A2>=80, \"A\", IF(A2>=50, \"B\", \"C\"))." },
  textformula: { name: "TEXT — format a date or number as text", fields: [["f_cell", "Cell to format", "A2"], ["f_format", "Format code", "YYYY-MM-DD"]],
    build: (v) => "=TEXT(" + v.f_cell + ", \"" + v.f_format + "\")",
    explain: (v) => "Shows the value in " + v.f_cell + " using the format " + v.f_format + ". The result is text, not a real date or number.",
    example: "Show a date as 2026-11-09: =TEXT(A2, \"YYYY-MM-DD\")." },
  datedif: { name: "DATEDIF — difference between two dates", fields: [["f_start", "Start date cell", "A2"], ["f_end", "End date cell", "B2"], ["f_unit", "Unit: Y (years), M (months) or D (days)", "D"]],
    build: (v) => "=DATEDIF(" + v.f_start + ", " + v.f_end + ", \"" + v.f_unit + "\")",
    explain: (v) => "Returns the difference between the two dates in " + (v.f_unit === "Y" ? "whole years" : v.f_unit === "M" ? "whole months" : "days") + ".",
    example: "Days between two dates: =DATEDIF(A2, B2, \"D\")." },
  unique: { name: "UNIQUE — list each value once (remove duplicates)", fields: [["f_range", "Range with duplicates", "A2:A20"]],
    build: (v) => "=UNIQUE(" + v.f_range + ")",
    explain: (v) => "Lists each value in " + v.f_range + " once. Needs Microsoft 365 Excel.",
    example: "List unique cities: =UNIQUE(A2:A20). To count them, use =COUNTA(UNIQUE(A2:A20))." },
  averageif: { name: "AVERAGEIF — average values that meet one condition", fields: [["f_range", "Range to check", "A2:A20"], ["f_criteria", "Condition", "\">100\" or \"Approved\""], ["f_avg_range", "Range to average (optional: leave empty to average the checked range)", "", true]],
    build: (v) => v.f_avg_range ? "=AVERAGEIF(" + v.f_range + ", " + quoteCriteria(v.f_criteria) + ", " + v.f_avg_range + ")" : "=AVERAGEIF(" + v.f_range + ", " + quoteCriteria(v.f_criteria) + ")",
    explain: (v) => "Averages the numbers in " + (v.f_avg_range || v.f_range) + " only where " + v.f_range + " meets " + v.f_criteria + ".",
    example: "Average sales over 100: =AVERAGEIF(A2:A20, \">100\")." },
  eomonth: { name: "EOMONTH — last day of a month", fields: [["f_date", "Start date cell", "A2"], ["f_months", "Months to add (0 = same month, 1 = next month)", "0"]],
    build: (v) => "=EOMONTH(" + v.f_date + ", " + v.f_months + ")",
    explain: (v) => "Returns the last day of the month that is " + v.f_months + " month(s) after the date in " + v.f_date + ".",
    example: "Last day of this month: =EOMONTH(A2, 0). Last day of next month: =EOMONTH(A2, 1)." },
  rank: { name: "RANK — position of a number in a list", fields: [["f_number", "Number or cell to rank", "A2"], ["f_ref", "Range with all the numbers", "A2:A20"], ["f_order", "Order: 0 = largest is 1, 1 = smallest is 1", "0"]],
    build: (v) => "=RANK(" + v.f_number + ", " + v.f_ref + ", " + v.f_order + ")",
    explain: (v) => "Returns the position of " + v.f_number + " in " + v.f_ref + ". With order 0 the largest number is rank 1.",
    example: "Rank a sale in the list: =RANK(A2, A2:A20, 0)." },
  large: { name: "LARGE — the nth largest number", fields: [["f_range", "Range with the numbers", "A2:A20"], ["f_k", "Which largest: 1 = largest, 2 = second largest", "1"]],
    build: (v) => "=LARGE(" + v.f_range + ", " + v.f_k + ")",
    explain: (v) => "Returns the " + v.f_k + " largest number in " + v.f_range + ".",
    example: "Top sale: =LARGE(A2:A20, 1). Second largest: =LARGE(A2:A20, 2)." },
  small: { name: "SMALL — the nth smallest number", fields: [["f_range", "Range with the numbers", "A2:A20"], ["f_k", "Which smallest: 1 = smallest, 2 = second smallest", "1"]],
    build: (v) => "=SMALL(" + v.f_range + ", " + v.f_k + ")",
    explain: (v) => "Returns the " + v.f_k + " smallest number in " + v.f_range + ".",
    example: "Lowest sale: =SMALL(A2:A20, 1). Second smallest: =SMALL(A2:A20, 2)." },
  round: { name: "ROUND — round a number to decimal places", fields: [["f_number", "Number or cell to round", "A2"], ["f_digits", "Decimal places (0 = whole number, 2 = two places)", "2"]],
    build: (v) => "=ROUND(" + v.f_number + ", " + v.f_digits + ")",
    explain: (v) => "Rounds " + v.f_number + " to " + v.f_digits + " decimal place(s). Use ROUNDUP or ROUNDDOWN in Excel if you always want to round up or down.",
    example: "Round a price to two places: =ROUND(A2, 2)." },
  vlookupIferror: { name: "VLOOKUP + IFERROR — look up, show blank if not found", fields: [["f_lookup", "Value to look up", "A2"], ["f_table", "Table to search", "Sheet2!A:B"], ["f_col", "Column number to return", "2"], ["f_fallback", "What to show if not found (optional: leave empty for a blank cell)", "", true]],
    build: (v) => "=IFERROR(VLOOKUP(" + quoteCriteria(v.f_lookup) + ", " + v.f_table + ", " + v.f_col + ", FALSE), " + (v.f_fallback ? quoteCriteria(v.f_fallback) : "\"\"") + ")",
    explain: (v) => "Looks up " + v.f_lookup + " in " + v.f_table + " and returns column " + v.f_col + ". If there is no match, Excel shows " + (v.f_fallback || "a blank cell") + " instead of #N/A.",
    example: "Find a price, blank if missing: =IFERROR(VLOOKUP(A2, Sheet2!A:B, 2, FALSE), \"\")." },
  xlookupMulti: { name: "XLOOKUP with several criteria — match on two columns", fields: [["f_lookup1", "First value to match", "A2"], ["f_array1", "First range to search", "Sheet2!A:A"], ["f_lookup2", "Second value to match", "B2"], ["f_array2", "Second range to search", "Sheet2!B:B"], ["f_return", "Range to return from", "Sheet2!C:C"]],
    build: (v) => "=XLOOKUP(1, (" + v.f_array1 + "=" + quoteCriteria(v.f_lookup1) + ")*(" + v.f_array2 + "=" + quoteCriteria(v.f_lookup2) + "), " + v.f_return + ", \"Not found\")",
    explain: (v) => "Matches a row where both " + v.f_array1 + " equals " + v.f_lookup1 + " and " + v.f_array2 + " equals " + v.f_lookup2 + ", then returns the value from " + v.f_return + ". Needs Microsoft 365 or Excel 2021.",
    example: "Find a price by product and city: =XLOOKUP(1, (Sheet2!A:A=A2)*(Sheet2!B:B=B2), Sheet2!C:C, \"Not found\")." },
  letformula: { name: "LET — name a value and reuse it", fields: [["f_name", "Name for the value", "total"], ["f_value", "Value or formula to name", "SUM(B2:B20)"], ["f_calc", "Calculation using the name", "total*1.1"]],
    build: (v) => "=LET(" + v.f_name + ", " + v.f_value + ", " + v.f_calc + ")",
    explain: (v) => "Works out " + v.f_value + " once, calls it " + v.f_name + ", then uses that name in " + v.f_calc + ". It keeps long formulas short and avoids calculating the same thing twice. Needs Microsoft 365 or Excel 2021.",
    example: "Add 10% tax to a total: =LET(total, SUM(B2:B20), total*1.1)." }
};

function formulaParenBalance(f) {
  let depth = 0, inStr = false;
  for (let i = 0; i < f.length; i++) {
    const c = f[i];
    if (c === '"') { if (f[i + 1] === '"') { i++; continue; } inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth < 0) return -1; }
  }
  return inStr ? -2 : depth;
}

async function validateFormula(formula, statusId) {
  const raw = String(formula || "").trim();
  if (!raw) return "nothing to check.";
  if (!raw.startsWith("=")) return "invalid: the formula does not start with =. Excel formulas start with =.";
  const body = raw.slice(1);
  const bal = formulaParenBalance(body);
  if (bal === -2) return "invalid: a double quote is not closed. Check the text in quotes.";
  if (bal !== 0) return "invalid: the brackets do not balance (" + (bal > 0 ? bal + " opening bracket(s) never closed" : "a closing bracket has no opening bracket") + ").";
  const fns = Array.from(body.matchAll(/([A-Za-z][A-Za-z0-9_.]*)\s*\(/g)).map((m) => m[1].toUpperCase());
  const unknown = fns.filter((fn) => !KNOWN_EXCEL_FUNCTIONS.has(fn));
  if (unknown.length) return "invalid: unknown function(s): " + [...new Set(unknown)].join(", ") + ". Check the spelling against Excel help.";
  /* LET crashes this parser version with an internal error instead of the
     clean "not implemented" message, so check for it before parsing. */
  if (fns.includes("LET")) return "valid: brackets balance and all function name(s) are known Excel functions. (LET is not implemented in the in-browser parser, so the formula could not be run here, but it is a real Excel function.)";
  if (!window.FormulaParser) { const ok = await loadLibrary("formula-parser", statusId); if (!ok || !window.FormulaParser) return "checked without the formula parser (it did not load): brackets balance and all " + fns.length + " function name(s) are known Excel functions."; }
  try {
    new window.FormulaParser().parse(body);
    return "valid: brackets balance, all " + fns.length + " function name(s) are known, and the formula parser accepted it.";
  } catch (e) {
    const msg = String((e && e.message) || e);
    const notImpl = msg.match(/Function ([A-Z0-9_.]+) is not implemented/i);
    if (notImpl) return "valid: brackets balance and all function name(s) are known Excel functions. (" + notImpl[1] + " is not implemented in the in-browser parser, so the formula could not be run here, but it is a real Excel function.)";
    return "invalid: " + msg;
  }
}

initWizard("formula", FORMULA_TASKS, "formulaOutput", "formulaStatus", { validate: validateFormula });

/* Standalone formula check: paste any formula and validate it. */

(function initFormulaCheck() {
  const btn = $("formulaCheckBtn"); if (!btn) return;
  btn.addEventListener("click", async () => {
    const formula = ($("formulaCheckInput") ? $("formulaCheckInput").value : "").trim();
    if (!formula) { setError("formulaStatus", "Paste a formula in the check box first."); return; }
    const out = $("formulaCheckOutput");
    const result = await validateFormula(formula, "formulaStatus");
    if (out) out.textContent = "AK Premium — Formula check\n\nFormula: " + formula + "\n\nValidation: " + result;
    setStatus("formulaStatus", "Done. Check result above.");
  });
})();
