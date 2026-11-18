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
    example: "Order Count = COUNTROWS(Sales)." }
};

initWizard("dax", DAX_TASKS, "daxOutput", "daxStatus");
