/* AK Premium v12 — regex-creator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

const REGEX_TASKS = {
  email: { name: "Email address", fields: [], build: () => "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", explain: "Matches a normal email address: letters, numbers and . _ % + - before @, a domain after it, and a dot with at least 2 letters.", example: "Finds ali@example.com in a block of text." },
  phonepk: { name: "Pakistan mobile number (03xx-xxxxxxx)", fields: [], build: () => "03\\d{2}[- ]?\\d{7}", explain: "Matches a Pakistan mobile number starting 03, with an optional dash or space.", example: "Finds 0300-1234567 and 03001234567." },
  date: { name: "Date (DD/MM/YYYY)", fields: [], build: () => "\\b\\d{2}/\\d{2}/\\d{4}\\b", explain: "Matches a date with two digits, slash, two digits, slash, four digits.", example: "Finds 09/11/2026." },
  url: { name: "Web link (http/https)", fields: [], build: () => "https?://[^\\s]+", explain: "Matches a link starting http:// or https:// up to the next space.", example: "Finds https://example.com/page." },
  numbers: { name: "Numbers in text", fields: [], build: () => "\\d+(\\.\\d+)?", explain: "Matches whole numbers and decimals.", example: "Finds 100, 25.5 and 2026 in text." },
  cnic: { name: "Pakistan CNIC (xxxxx-xxxxxxx-x)", fields: [], build: () => "\\d{5}-\\d{7}-\\d", explain: "Matches a CNIC in the standard 5-7-1 digit format with dashes.", example: "Finds 35202-1234567-1." }
};

(function initRegex() {
  const taskSel = $("regexTask"), btn = $("regexBtn"), out = $("regexOutput");
  if (!taskSel || !btn) return;
  btn.addEventListener("click", () => {
    const t = REGEX_TASKS[taskSel.value]; if (!t) return;
    const pattern = t.build();
    const test = $("regexTest") ? $("regexTest").value : "";
    let matches = "";
    try { const found = test ? (test.match(new RegExp(pattern, "g")) || []) : []; matches = found.length ? "\n\nMatches in your test text: " + found.join(", ") : (test ? "\n\nNo matches in your test text." : ""); }
    catch (e) { matches = "\n\nCould not test this pattern."; }
    if (out) out.textContent = "AK Premium - Regex: " + t.name + "\n\nPattern: " + pattern + "\n\nWhat it does: " + t.explain + "\n\nExample: " + t.example + matches + "\n\nUse it in Excel with a VBA regex, in Google Sheets with REGEXEXTRACT, or in any text editor that supports regular expressions.";
    setStatus("regexStatus", "Done. Your pattern is ready above.");
  });
})();
