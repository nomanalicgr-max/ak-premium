/* AK Premium v12 — dax-query (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

const DAX_TASKS = {
  totalsales: { name: "Total Sales — sum a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Amount column", "Amount"]],
    build: (v) => "Total Sales = SUM(" + v.f_table + "[" + v.f_column + "])",
    explain: "Adds up every value in the amount column.",
    example: "Total Sales = SUM(Sales[Amount])." },
  average: { name: "Average — average a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Column to average", "Amount"]],
    build: (v) => "Average Amount = AVERAGE(" + v.f_table + "[" + v.f_column + "])",
    explain: "Averages the values in the column, ignoring blanks.",
    example: "Average Amount = AVERAGE(Sales[Amount])." },
  ytd: { name: "Year to Date — running total for the year", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "YTD Sales = TOTALYTD([" + v.f_measure + "], " + v.f_date + ")",
    explain: "Adds up the base measure from 1 January to the current date in the filter context.",
    example: "YTD Sales = TOTALYTD([Total Sales], 'Calendar'[Date]). Needs a date table." },
  pcttotal: { name: "Percent of Total — share of the grand total", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"]],
    build: (v) => "% of Total = DIVIDE([" + v.f_measure + "], CALCULATE([" + v.f_measure + "], ALL(" + v.f_table + ")))",
    explain: "Divides the measure by the same measure with all filters on the table removed, so you get the share of the total.",
    example: "A product with 25,000 of 100,000 total sales shows 25%." },
  countrows: { name: "Count Rows — count orders or records", fields: [["f_table", "Table name", "Sales"]],
    build: (v) => "Order Count = COUNTROWS(" + v.f_table + ")",
    explain: "Counts the rows in the table in the current filter context.",
    example: "Order Count = COUNTROWS(Sales)." },
  mom: { name: "Month on Month growth — change vs last month", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "MoM Growth % = DIVIDE([" + v.f_measure + "] - CALCULATE([" + v.f_measure + "], PREVIOUSMONTH(" + v.f_date + ")), CALCULATE([" + v.f_measure + "], PREVIOUSMONTH(" + v.f_date + ")))",
    explain: "Compares the measure with the same measure last month, and divides by last month so you get a percentage change.",
    example: "MoM Growth % = DIVIDE([Total Sales] - CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date])), CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date])))." },
  yoy: { name: "Year on Year growth — change vs the same month last year", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "YoY Growth % = DIVIDE([" + v.f_measure + "] - CALCULATE([" + v.f_measure + "], SAMEPERIODLASTYEAR(" + v.f_date + ")), CALCULATE([" + v.f_measure + "], SAMEPERIODLASTYEAR(" + v.f_date + ")))",
    explain: "Compares the measure with the same period last year, and divides by last year so you get a percentage change.",
    example: "YoY Growth % = DIVIDE([Total Sales] - CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Calendar'[Date])), CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Calendar'[Date])))." },
  runningtotal: { name: "Running Total — cumulative total over time", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "Running Total = CALCULATE([" + v.f_measure + "], FILTER(ALL(" + v.f_date + "), " + v.f_date + " <= MAX(" + v.f_date + ")))",
    explain: "Adds up the measure from the first date in the table to the current date, so the line keeps climbing through the year.",
    example: "Running Total = CALCULATE([Total Sales], FILTER(ALL('Calendar'[Date]), 'Calendar'[Date] <= MAX('Calendar'[Date])))." },
  movingavg: { name: "Moving Average — average over the last 3 months", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"], ["f_months", "Number of months to average", "3"]],
    build: (v) => v.f_months + "-Month Moving Average = AVERAGEX(DATESINPERIOD(" + v.f_date + ", MAX(" + v.f_date + "), -" + v.f_months + ", MONTH), [" + v.f_measure + "])",
    explain: (v) => "Averages the measure over the last " + v.f_months + " months, which smooths out one-off spikes.",
    example: "3-Month Moving Average = AVERAGEX(DATESINPERIOD('Calendar'[Date], MAX('Calendar'[Date]), -3, MONTH), [Total Sales])." },
  previousmonth: { name: "Previous Month — the measure for last month", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "Previous Month Sales = CALCULATE([" + v.f_measure + "], PREVIOUSMONTH(" + v.f_date + "))",
    explain: "Returns the measure for the previous month, in the current filter context. Pair it with the current measure to show the change.",
    example: "Previous Month Sales = CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date]))." },
  mtd: { name: "Month to Date — total so far this month", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "MTD Sales = TOTALMTD([" + v.f_measure + "], " + v.f_date + ")",
    explain: "Adds up the measure from the 1st of the current month to the latest date in the filter context.",
    example: "MTD Sales = TOTALMTD([Total Sales], 'Calendar'[Date])." },
  qtd: { name: "Quarter to Date — total so far this quarter", fields: [["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "QTD Sales = TOTALQTD([" + v.f_measure + "], " + v.f_date + ")",
    explain: "Adds up the measure from the first day of the current quarter to the latest date in the filter context.",
    example: "QTD Sales = TOTALQTD([Total Sales], 'Calendar'[Date])." },
  rankx: { name: "RANKX — rank a product, city or customer", fields: [["f_table", "Table to rank", "Products"], ["f_column", "Column to rank by", "Product"], ["f_measure", "Measure to rank on", "Total Sales"]],
    build: (v) => "Sales Rank = RANKX(ALL(" + v.f_table + "[" + v.f_column + "]), [" + v.f_measure + "], , DESC, Dense)",
    explain: "Ranks each value in the column by the measure, largest first (DESC). Dense means the next rank after a tie is the next number, with no gap.",
    example: "Sales Rank = RANKX(ALL(Products[Product]), [Total Sales], , DESC, Dense)." },
  topn: { name: "Top N — total of the top products only", fields: [["f_n", "How many top items", "5"], ["f_table", "Table name", "Products"], ["f_column", "Column to rank by", "Product"], ["f_measure", "Measure to rank on", "Total Sales"]],
    build: (v) => "Top " + v.f_n + " Total = SUMX(TOPN(" + v.f_n + ", ALL(" + v.f_table + "[" + v.f_column + "]), [" + v.f_measure + "]), [" + v.f_measure + "])",
    explain: (v) => "Adds up the measure for only the top " + v.f_n + " values in the column, ranked by the measure.",
    example: "Top 5 Total = SUMX(TOPN(5, ALL(Products[Product]), [Total Sales]), [Total Sales])." },
  switchmeasure: { name: "SWITCH — one measure that changes with a slicer", fields: [["f_measure1", "First measure name", "Total Sales"], ["f_label1", "Label shown for the first measure", "Sales"], ["f_measure2", "Second measure name", "Order Count"], ["f_label2", "Label shown for the second measure", "Orders"]],
    build: (v) => "Dynamic Measure = SWITCH(SELECTEDVALUE('Measure Picker'[Measure]), \"" + v.f_label1 + "\", [" + v.f_measure1 + "], \"" + v.f_label2 + "\", [" + v.f_measure2 + "], BLANK())",
    explain: (v) => "Reads the selected value from a Measure Picker table (a small table with one column of labels) and returns the matching measure. Add a slicer on the picker column so users can switch the visual between " + v.f_label1 + " and " + v.f_label2 + ".",
    example: "Dynamic Measure = SWITCH(SELECTEDVALUE('Measure Picker'[Measure]), \"Sales\", [Total Sales], \"Orders\", [Order Count], BLANK())." },
  datetable: { name: "Date Table — a Calendar table for time measures", fields: [["f_start", "Start year", "2024"], ["f_end", "End year", "2026"]],
    build: (v) => "Calendar = CALENDAR(DATE(" + v.f_start + ", 1, 1), DATE(" + v.f_end + ", 12, 31))\n\n-- Then add these calculated columns to the Calendar table:\nYear = YEAR('Calendar'[Date])\nMonth Number = MONTH('Calendar'[Date])\nMonth Name = FORMAT('Calendar'[Date], \"MMMM\")\nQuarter = \"Q\" & FORMAT('Calendar'[Date], \"Q\")",
    explain: (v) => "Creates a Calendar table from 1 January " + v.f_start + " to 31 December " + v.f_end + ", with Year, Month Number, Month Name and Quarter columns. Mark it as the date table in Power BI (Table tools > Mark as date table) so the time measures work.",
    example: "Calendar = CALENDAR(DATE(2024, 1, 1), DATE(2026, 12, 31))." }
};

initWizard("dax", DAX_TASKS, "daxOutput", "daxStatus");

/* DAX syntax check (dax-query): brackets, quotes and bracket references.
   Unknown functions are a WARNING, not an error: the DAX function list
   is large and version-dependent, so a function outside the checked list
   may still be real. Imbalanced brackets or quotes are errors. */
const KNOWN_DAX_FUNCTIONS = new Set(("SUM SUMX AVERAGEX MINX MAXX COUNTX COUNTAX COUNT COUNTROWS DISTINCTCOUNT SUMMARIZE SUMMARIZECOLUMNS FILTER CALCULATE CALCULATETABLE ALL ALLNOBLANKROW ALLEXCEPT ALLSELECTED VALUES DISTINCT KEEPFILTERS REMOVEFILTERS USERELATIONSHIP CROSSFILTER TREATAS CONTAINS CONTAINSROW CONTAINSSTRING SEARCH FIND EXACT LEFT RIGHT MID LEN REPT SUBSTITUTE REPLACE TRIM UPPER LOWER PROPER TEXT VALUE NUMBERVALUE DATEVALUE TIMEVALUE YEAR MONTH DAY HOUR MINUTE SECOND WEEKDAY WEEKNUM EOMONTH EDATE DATEDIF TODAY NOW DATE TIME BLANK IF IFERROR IFNA SWITCH TRUE FALSE AND OR NOT XOR ISBLANK ISERROR ISLOGICAL ISNONTEXT ISNUMBER ISTEXT DIVIDE CURRENCY FORMAT FIRSTNONBLANK LASTNONBLANK FIRSTNONBLANKVALUE LASTNONBLANKVALUE MINA MAXA PRODUCT PRODUCTX GEOMEANX STDEVX STDEV.P STDEV.S VARX VAR.P VAR.S COVAR COVAR.P COVAR.S CORREL PEARSON RSQ STEYX SLOPE INTERCEPT FORECAST XIRR XNPV IRR NPV PMT IPMT PPMT FV PV RATE NPER EFFECT NOMINAL CUMIPMT CUMPRINC ACCRINT COUPON DAYS360 YIELD PRICE PRICEDISC PRICEMAT RECEIVED INTRATE DISC YIELDDISC YIELDMAT ODDFPRICE ODDLYIELD TBILLEQ TBILLPRICE TBILLYIELD DOLLARDE DOLLARFR SLN SYD DB DDB VDB AMORDEGRC AMORLINC ISPMT MIRR FVSCHEDULE DURATION MDURATION RANKX RANK.EQ TOPN SAMPLE SELECTCOLUMNS ADDCOLUMNS GENERATE GENERATEALL GROUPBY ROLLUP ROLLUPADDISSUBTOTAL ROLLUPGROUP ISSUBTOTAL CURRENTGROUP ROW UNION INTERSECT EXCEPT NATURALINNERJOIN NATURALLEFTOUTERJOIN DATATABLE INDEX ORDERBY PARTITIONBY WINDOW MATCHBY OFFSET RANK DENSE SKIP LOOKBACK MOVING TOTALYTD TOTALMTD TOTALQTD DATESYTD DATESMTD DATESQTD DATESINPERIOD DATESBETWEEN SAMEPERIODLASTYEAR PREVIOUSMONTH PREVIOUSQUARTER PREVIOUSYEAR PREVIOUSDAY NEXTMONTH NEXTQUARTER NEXTYEAR NEXTDAY PARALLELPERIOD DATEADD DATESADD STARTOFMONTH STARTOFYEAR STARTOFQUARTER ENDOFMONTH ENDOFYEAR ENDOFQUARTER FIRSTDATE LASTDATE CALENDAR CALENDARAUTO YEARFRAC WEEKNUM ISOWEEKNUM NETWORKDAYS WORKDAY EDATE EOMONTH DATEDIF DAYS360 SECOND MILLISECOND MICROSECOND HOUR MINUTE SECOND CONCATENATE CONCATENATEX COMBINEVALUES FORMATDATE MIN MAX AVERAGE AVERAGEA COUNTBLANK COUNTA DEVSQ GEOMEAN HARMEAN TRIMMEAN KURT SKEW SKEW.P PERCENTILE PERCENTILE.INC PERCENTILE.EXC QUARTILE QUARTILE.INC QUARTILE.EXC MEDIAN MODE STDEV STDEVA VAR VARA SUMPRODUCT AGGREGATE SUBTOTAL ISNA ISERROR ERROR TYPE INFO CELL").split(" "));

function checkDaxSyntax(code) {
  const raw = String(code || "").trim();
  const issues = [], warnings = [];
  if (!raw) return "Paste a DAX measure first.";
  let depth = 0, inDq = false, inSq = false, badParen = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"' && !inSq) { if (raw[i + 1] === '"') { i++; continue; } inDq = !inDq; continue; }
    if (inDq) continue;
    if (c === "'" && !inDq) { if (raw[i + 1] === "'") { i++; continue; } inSq = !inSq; continue; }
    if (inSq) continue;
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth < 0) { badParen++; depth = 0; } }
  }
  if (inDq) issues.push("A double-quoted text value is not closed.");
  if (inSq) issues.push("A single-quoted table name is not closed.");
  if (depth !== 0) issues.push("Unbalanced brackets: " + depth + " opening bracket(s) never closed.");
  if (badParen) issues.push(badParen + " closing bracket(s) with no opening bracket.");
  const openB = (raw.match(/\[/g) || []).length, closeB = (raw.match(/\]/g) || []).length;
  if (openB !== closeB) issues.push("Unbalanced square brackets: " + openB + " [ and " + closeB + " ]. Every measure reference [Name] needs both brackets.");
  const fns = Array.from(raw.matchAll(/([A-Za-z][A-Za-z0-9_.]*)\s*\(/g)).map((m) => m[1].toUpperCase());
  const unknown = [...new Set(fns.filter((fn) => !KNOWN_DAX_FUNCTIONS.has(fn)))];
  if (unknown.length) warnings.push("Function(s) not in the checked list (verify the spelling against Power BI): " + unknown.join(", ") + ".");
  const hasName = /=/.test(raw);
  if (!hasName) warnings.push("No measure name found. A measure is usually written as Name = expression, for example Total Sales = SUM(Sales[Amount]).");
  const head = "AK Premium — DAX syntax check\n\n";
  if (!issues.length && !warnings.length) return head + "No syntax problems found. Brackets and quotes balance, and all " + fns.length + " function name(s) are known DAX functions.";
  let out = head;
  if (issues.length) out += issues.length + " problem(s) found:\n" + issues.map((s) => "- " + s).join("\n") + "\n";
  if (warnings.length) out += (issues.length ? "\n" : "") + "Check before pasting into Power BI:\n" + warnings.map((s) => "- " + s).join("\n") + "\n";
  return out + "\nThis is a static check only: it cannot tell whether your table or column names exist in your model.";
}

(function initDaxCheck() {
  const btn = $("daxCheckBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const code = ($("daxCheckInput") ? $("daxCheckInput").value : "").trim();
    if (!code) { setError("daxStatus", "Paste your DAX measure in the check box first."); return; }
    const out = $("daxCheckOutput"); if (out) out.textContent = checkDaxSyntax(code);
    setStatus("daxStatus", "Done. Syntax check result above.");
  });
})();
