/* AK Premium v12 — vba-macro-writer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

const VBA_TASKS = {
  looprows: { name: "Loop through rows and mark a condition", fields: [["f_sheet", "Sheet name", "Data"], ["f_col", "Column letter to check", "A"], ["f_condition", "Condition (VBA test)", "Cells(i, 1).Value > 100"], ["f_action", "What to write in column B", "\"High\""]],
    build: (v) => "Sub MarkRows()\n    Dim ws As Worksheet, i As Long, lastRow As Long\n    Set ws = ThisWorkbook.Worksheets(\"" + v.f_sheet + "\")\n    lastRow = ws.Cells(ws.Rows.Count, \"" + v.f_col + "\").End(xlUp).Row\n    For i = 2 To lastRow\n        If " + v.f_condition.replace(/\(i, 1\)/g, "(i, 1)") + " Then\n            ws.Cells(i, 2).Value = " + v.f_action + "\n        End If\n    Next i\n    MsgBox \"Done. Checked \" & (lastRow - 1) & \" rows.\", vbInformation\nEnd Sub",
    explain: "Goes through each row from row 2 to the last used row, tests your condition, and writes your value in column B.",
    example: "Marks every row where column A is over 100." },
  copydata: { name: "Copy data from one sheet to another", fields: [["f_from", "Source sheet", "Data"], ["f_to", "Target sheet", "Report"], ["f_range", "Range to copy", "A1:D100"]],
    build: (v) => "Sub CopyData()\n    ThisWorkbook.Worksheets(\"" + v.f_from + "\").Range(\"" + v.f_range + "\").Copy\n    ThisWorkbook.Worksheets(\"" + v.f_to + "\").Range(\"A1\").PasteSpecial xlPasteValues\n    Application.CutCopyMode = False\n    MsgBox \"Copied " + v.f_range + " from " + v.f_from + " to " + v.f_to + ".\", vbInformation\nEnd Sub",
    explain: "Copies the range as values only, so no formulas are carried over.",
    example: "Copy A1:D100 from Data to Report." },
  autofilter: { name: "AutoFilter a table by a value", fields: [["f_sheet", "Sheet name", "Data"], ["f_range", "Table range", "A1:D100"], ["f_field", "Column number to filter (1 = first)", "2"], ["f_value", "Value to keep", "\"Lahore\""]],
    build: (v) => "Sub FilterTable()\n    With ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Range(\"" + v.f_range + "\")\n        .AutoFilter Field:=" + v.f_field + ", Criteria1:=" + v.f_value + "\n    End With\nEnd Sub",
    explain: "Filters the table so only rows matching your value stay visible.",
    example: "Show only Lahore rows in a table." },
  sortdata: { name: "Sort a table by a column", fields: [["f_sheet", "Sheet name", "Data"], ["f_range", "Table range", "A1:D100"], ["f_key", "Sort column (e.g. A2:A100)", "B2:B100"]],
    build: (v) => "Sub SortTable()\n    With ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Sort\n        .SortFields.Clear\n        .SortFields.Add Key:=Range(\"" + v.f_key + "\"), Order:=xlDescending\n        .SetRange Range(\"" + v.f_range + "\")\n        .Header = xlYes\n        .Apply\n    End With\nEnd Sub",
    explain: "Sorts the table by your column, largest first. Change xlDescending to xlAscending for smallest first.",
    example: "Sort sales from largest to smallest." },
  hidesheet: { name: "Hide a sheet (very hidden, not in the unhide menu)", fields: [["f_sheet", "Sheet name to hide", "Management"]],
    build: (v) => "Sub HideSheet()\n    ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Visible = xlSheetVeryHidden\n    MsgBox \"" + v.f_sheet + " is now very hidden.\", vbInformation\nEnd Sub\n\nSub UnhideSheet()\n    ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Visible = xlSheetVisible\nEnd Sub",
    explain: "Very hidden sheets do not appear in the Unhide menu. Run UnhideSheet to bring the sheet back.",
    example: "Hide a management or settings sheet." }
};

initWizard("vba", VBA_TASKS, "vbaOutput", "vbaStatus");
