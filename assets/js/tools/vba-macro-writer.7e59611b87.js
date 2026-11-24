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
    example: "Hide a management or settings sheet." },
  copyfilter: { name: "Copy rows that meet a condition to another sheet", fields: [["f_from", "Source sheet", "Data"], ["f_to", "Target sheet", "Filtered"], ["f_col", "Column letter to check", "A"], ["f_condition", "Condition value to keep", "\"Lahore\""]],
    build: (v) => "Sub CopyFilteredRows()\n    Dim src As Worksheet, dst As Worksheet, i As Long, lastRow As Long, outRow As Long\n    Set src = ThisWorkbook.Worksheets(\"" + v.f_from + "\")\n    Set dst = ThisWorkbook.Worksheets(\"" + v.f_to + "\")\n    lastRow = src.Cells(src.Rows.Count, \"" + v.f_col + "\").End(xlUp).Row\n    outRow = 2\n    dst.Rows(\"2:\" & dst.Rows.Count).ClearContents\n    For i = 2 To lastRow\n        If src.Cells(i, \"" + v.f_col + "\").Value = " + v.f_condition + " Then\n            src.Rows(i).Copy dst.Rows(outRow)\n            outRow = outRow + 1\n        End If\n    Next i\n    MsgBox \"Copied \" & (outRow - 2) & \" matching rows to " + v.f_to + ".\", vbInformation\nEnd Sub",
    explain: "Goes through each row in the source sheet and copies the whole row to the target sheet when the value in your column equals the condition.",
    example: "Copy every Lahore row from Data to Filtered." },
  importcsv: { name: "Import a CSV file into a sheet", fields: [["f_sheet", "Sheet to import into", "Data"], ["f_path", "Full path of the CSV file", "C:\\Reports\\sales.csv"]],
    build: (v) => "Sub ImportCsv()\n    Dim ws As Worksheet, qt As QueryTable\n    Set ws = ThisWorkbook.Worksheets(\"" + v.f_sheet + "\")\n    ws.Cells.Clear\n    Set qt = ws.QueryTables.Add(Connection:=\"TEXT;" + v.f_path + "\", Destination:=ws.Range(\"A1\"))\n    With qt\n        .TextFileParseType = xlDelimited\n        .TextFileCommaDelimiter = True\n        .TextFileColumnDataTypes = Array(1)\n        .Refresh BackgroundQuery:=False\n    End With\n    MsgBox \"CSV imported into " + v.f_sheet + ".\", vbInformation\nEnd Sub",
    explain: "Imports the CSV file into the sheet, splitting values at commas. Change the file path to your own CSV before running it.",
    example: "Import C:\\Reports\\sales.csv into the Data sheet." },
  pivottable: { name: "Create a PivotTable from a table", fields: [["f_source", "Source sheet", "Data"], ["f_range", "Table range", "A1:D100"], ["f_dest", "Sheet for the PivotTable", "Pivot"], ["f_row", "Row field (column letter)", "A"], ["f_value", "Value field (column letter)", "C"]],
    build: (v) => "Sub MakePivotTable()\n    Dim src As Range, dest As Range, pc As PivotCache, pt As PivotTable\n    Set src = ThisWorkbook.Worksheets(\"" + v.f_source + "\").Range(\"" + v.f_range + "\")\n    Set dest = ThisWorkbook.Worksheets(\"" + v.f_dest + "\").Range(\"A3\")\n    Set pc = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=src)\n    Set pt = pc.CreatePivotTable(TableDestination:=dest, TableName:=\"AKPivot\")\n    With pt\n        .PivotFields(\"" + v.f_row + "\").Orientation = xlRowField\n        .AddDataField .PivotFields(\"" + v.f_value + "\"), \"Sum of " + v.f_value + "\", xlSum\n    End With\n    MsgBox \"PivotTable created on " + v.f_dest + ".\", vbInformation\nEnd Sub",
    explain: "Builds a PivotTable on the destination sheet, with your row column as rows and the sum of your value column. Replace the column letters with your real header names if they differ.",
    example: "Pivot sales by city: rows from column A, values summed from column C." },
  outlookmail: { name: "Send an Outlook email with an attachment", fields: [["f_to", "Recipient email", "manager@example.com"], ["f_subject", "Email subject", "Monthly report"], ["f_body", "Email body", "Please find the report attached."], ["f_file", "Full path of the file to attach", "C:\\Reports\\report.xlsx"]],
    build: (v) => "Sub EmailWithAttachment()\n    Dim ol As Object, mail As Object\n    Set ol = CreateObject(\"Outlook.Application\")\n    Set mail = ol.CreateItem(0)\n    With mail\n        .To = \"" + v.f_to + "\"\n        .Subject = \"" + v.f_subject + "\"\n        .Body = \"" + v.f_body + "\"\n        .Attachments.Add \"" + v.f_file + "\"\n        .Display\n    End With\nEnd Sub",
    explain: "Opens an Outlook email to your recipient with the subject, body and file attached, ready for you to press Send. Outlook must be installed and the file path must exist.",
    example: "Email the monthly report to your manager with report.xlsx attached." },
  protectsheet: { name: "Protect sheets with a password", fields: [["f_password", "Password to protect with", "ChangeMe123"]],
    build: (v) => "Sub ProtectSheets()\n    Dim ws As Worksheet\n    For Each ws In ThisWorkbook.Worksheets\n        ws.Protect Password:=\"" + v.f_password + "\", UserInterfaceOnly:=True\n    Next ws\n    MsgBox \"All sheets are protected.\", vbInformation\nEnd Sub",
    explain: "Protects every sheet in the workbook with your password, so cells cannot be changed by hand. Macros can still change them because UserInterfaceOnly is on. Keep the password safe: it cannot be recovered from the code.",
    example: "Protect a finished report before sharing it." },
  unprotectsheet: { name: "Unprotect sheets with a password", fields: [["f_password", "Password to unprotect with", "ChangeMe123"]],
    build: (v) => "Sub UnprotectSheets()\n    Dim ws As Worksheet, ok As Boolean\n    ok = True\n    For Each ws In ThisWorkbook.Worksheets\n        On Error Resume Next\n        ws.Unprotect Password:=\"" + v.f_password + "\"\n        If Err.Number <> 0 Then ok = False\n        On Error GoTo 0\n    Next ws\n    If ok Then MsgBox \"All sheets are unprotected.\", vbInformation Else MsgBox \"Some sheets could not be unprotected. Check the password.\", vbExclamation\nEnd Sub",
    explain: "Removes protection from every sheet that uses your password. If a sheet has a different password, it stays protected and the macro tells you.",
    example: "Unprotect a report to edit it again." },
  datavalidation: { name: "Add a dropdown list (data validation)", fields: [["f_sheet", "Sheet name", "Data"], ["f_range", "Cells to get the dropdown", "B2:B100"], ["f_list", "List items, separated by commas", "Lahore, Karachi, Islamabad"]],
    build: (v) => "Sub AddDropdown()\n    Dim items As String\n    items = \"" + v.f_list + "\"\n    With ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Range(\"" + v.f_range + "\").Validation\n        .Delete\n        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Formula1:=items\n        .IgnoreBlank = True\n        .InCellDropdown = True\n    End With\n    MsgBox \"Dropdown added to " + v.f_range + ".\", vbInformation\nEnd Sub",
    explain: "Adds a dropdown list to your cells, so users can only pick one of the items you typed. The list is stored in the validation rule itself, not in a helper range.",
    example: "Give column B a city dropdown: Lahore, Karachi, Islamabad." },
  findreplace: { name: "Find and replace across the whole workbook", fields: [["f_find", "Text to find", "Old Name"], ["f_replace", "Replacement text", "New Name"]],
    build: (v) => "Sub FindReplaceWorkbook()\n    Dim ws As Worksheet, found As Long\n    found = 0\n    For Each ws In ThisWorkbook.Worksheets\n        found = found + ws.Cells.Replace(What:=\"" + v.f_find + "\", Replacement:=\"" + v.f_replace + "\", LookAt:=xlPart, MatchCase:=False)\n    Next ws\n    MsgBox \"Replaced \" & found & \" occurrence(s) in the workbook.\", vbInformation\nEnd Sub",
    explain: "Searches every sheet in the workbook for your text and replaces it, including inside formulas. It counts how many replacements were made.",
    example: "Rename a product across every sheet in one go." },
  splitworkbook: { name: "Split the workbook: one file per sheet", fields: [["f_folder", "Folder to save the files in", "C:\\Reports\\Split"]],
    build: (v) => "Sub SplitWorkbookBySheet()\n    Dim ws As Worksheet, path As String\n    path = \"" + v.f_folder + "\"\n    If Right(path, 1) <> \"\\\" Then path = path & \"\\\"\n    For Each ws In ThisWorkbook.Worksheets\n        ws.Copy\n        ActiveWorkbook.SaveAs Filename:=path & ws.Name & \".xlsx\", FileFormat:=xlOpenXMLWorkbook\n        ActiveWorkbook.Close SaveChanges:=False\n    Next ws\n    MsgBox \"Each sheet was saved as its own file in \" & path & \".\", vbInformation\nEnd Sub",
    explain: "Saves every sheet as its own .xlsx file in the folder you typed. The original workbook is not changed. The folder must already exist.",
    example: "Split a workbook with one sheet per branch into separate files." },
  mergeworkbooks: { name: "Merge workbooks: combine every file in a folder", fields: [["f_folder", "Folder with the workbooks", "C:\\Reports\\Monthly"], ["f_sheet", "Sheet to copy from each file", "Data"]],
    build: (v) => "Sub MergeWorkbooks()\n    Dim folder As String, fname As String, wb As Workbook, src As Worksheet, dst As Worksheet, lastRow As Long\n    folder = \"" + v.f_folder + "\"\n    If Right(folder, 1) <> \"\\\" Then folder = folder & \"\\\"\n    Set dst = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))\n    dst.Name = \"Merged\"\n    fname = Dir(folder & \"*.xlsx\")\n    Do While fname <> \"\"\n        If fname <> ThisWorkbook.Name Then\n            Set wb = Workbooks.Open(folder & fname, ReadOnly:=True)\n            Set src = wb.Worksheets(\"" + v.f_sheet + "\")\n            lastRow = dst.Cells(dst.Rows.Count, 1).End(xlUp).Row\n            If dst.Cells(1, 1).Value = \"\" Then lastRow = 0\n            src.UsedRange.Copy dst.Cells(lastRow + 1, 1)\n            wb.Close SaveChanges:=False\n        End If\n        fname = Dir()\n    Loop\n    MsgBox \"Merged files into the Merged sheet.\", vbInformation\nEnd Sub",
    explain: "Opens every .xlsx file in the folder, copies the named sheet from each one, and stacks the rows in a new Merged sheet. Files must all have the same sheet name and layout.",
    example: "Combine twelve monthly sales files into one sheet." }
};

initWizard("vba", VBA_TASKS, "vbaOutput", "vbaStatus");

/* VBA syntax check (vba-macro-writer): counts block openers vs closers
   (Sub/End Sub, Function/End Function, block If/End If, For/Next,
   Do/Loop, With/End With, Select Case/End Select), balanced quotes and
   brackets. It is a static check, not a compiler: single-line If...Then
   needs no End If, and it cannot know whether a sheet or range exists. */

function checkVbaSyntax(code) {
  const lines = String(code || "").split(/\r?\n/);
  const issues = [];
  const pairs = [["Sub", "End Sub"], ["Function", "End Function"], ["For", "Next"], ["Do", "Loop"], ["With", "End With"], ["Select Case", "End Select"]];
  for (const [open, close] of pairs) {
    const oRe = new RegExp("^\\s*" + open.replace(/ /g, "\\s+") + "\\b", "i");
    const cRe = new RegExp("^\\s*" + close.replace(/ /g, "\\s+") + "\\b", "i");
    let o = 0, c = 0;
    for (const ln of lines) { if (oRe.test(ln)) o++; if (cRe.test(ln)) c++; }
    if (o !== c) issues.push("Unbalanced " + open + ": " + o + " opening and " + c + " closing (" + close + ").");
  }
  let ifOpen = 0, ifClose = 0;
  for (const ln of lines) {
    const t = ln.trim();
    if (/^If\b.*\bThen\s*$/i.test(t) && !/^ElseIf\b/i.test(t)) ifOpen++;
    if (/^End If\b/i.test(t)) ifClose++;
  }
  if (ifOpen !== ifClose) issues.push("Unbalanced If: " + ifOpen + " block If...Then and " + ifClose + " End If. (A one-line If...Then needs no End If.)");
  let depth = 0, inStr = false, badParen = 0;
  for (const ln of lines) {
    const t = ln.trim();
    if (t.startsWith("'")) continue;
    let quotes = 0;
    inStr = false; /* VBA strings cannot span lines, so reset per line */
    for (let i = 0; i < ln.length; i++) {
      const c = ln[i];
      if (c === '"') { if (ln[i + 1] === '"') { i++; continue; } inStr = !inStr; quotes++; continue; }
      if (inStr) continue;
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth < 0) { badParen++; depth = 0; } }
    }
    if (quotes % 2 !== 0) issues.push("Unbalanced double quotes on line: " + t.slice(0, 80) + ".");
  }
  if (depth !== 0) issues.push("Unbalanced brackets: " + depth + " opening bracket(s) never closed.");
  if (badParen) issues.push(badParen + " closing bracket(s) with no opening bracket.");
  const hasOptionExplicit = lines.some((ln) => /^\s*Option Explicit\b/i.test(ln));
  const subs = lines.filter((ln) => /^\s*Sub\s+\w+/i.test(ln)).length;
  const head = "AK Premium — VBA syntax check\n\n";
  if (!issues.length) return head + "No syntax problems found. Checked " + subs + " Sub(s), " + lines.length + " line(s): block openers and closers match, quotes and brackets balance." + (hasOptionExplicit ? "" : "\n\nNote: Option Explicit is missing. Add it at the top of the module so Excel catches mistyped variable names.");
  return head + issues.length + " problem(s) found:\n" + issues.map((s) => "- " + s).join("\n") + "\n\nFix the lines above, then check again. This is a static check only: it cannot tell whether a sheet, range or Outlook reference exists.";
}

(function initVbaCheck() {
  const btn = $("vbaCheckBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const code = ($("vbaCheckInput") ? $("vbaCheckInput").value : "").trim();
    if (!code) { setError("vbaStatus", "Paste your VBA code in the check box first."); return; }
    const out = $("vbaCheckOutput"); if (out) out.textContent = checkVbaSyntax(code);
    setStatus("vbaStatus", "Done. Syntax check result above.");
  });
})();
