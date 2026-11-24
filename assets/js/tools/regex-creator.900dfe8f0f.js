/* AK Premium v12 — regex-creator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

const REGEX_TASKS = {
  email: { name: "Email address", fields: [], build: () => "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", explain: "Matches a normal email address: letters, numbers and . _ % + - before @, a domain after it, and a dot with at least 2 letters.", example: "Finds ali@example.com in a block of text." },
  phonepk: { name: "Pakistan mobile number (03xx-xxxxxxx)", fields: [], build: () => "03\\d{2}[- ]?\\d{7}", explain: "Matches a Pakistan mobile number starting 03, with an optional dash or space.", example: "Finds 0300-1234567 and 03001234567." },
  date: { name: "Date (DD/MM/YYYY)", fields: [], build: () => "\\b\\d{2}/\\d{2}/\\d{4}\\b", explain: "Matches a date with two digits, slash, two digits, slash, four digits.", example: "Finds 09/11/2026." },
  url: { name: "Web link (http/https)", fields: [], build: () => "https?://[^\\s]+", explain: "Matches a link starting http:// or https:// up to the next space.", example: "Finds https://example.com/page." },
  numbers: { name: "Numbers in text", fields: [], build: () => "\\d+(\\.\\d+)?", explain: "Matches whole numbers and decimals.", example: "Finds 100, 25.5 and 2026 in text." },
  cnic: { name: "Pakistan CNIC (xxxxx-xxxxxxx-x)", fields: [], build: () => "\\d{5}-\\d{7}-\\d", explain: "Matches a CNIC in the standard 5-7-1 digit format with dashes.", example: "Finds 35202-1234567-1." },
  ntn: { name: "Pakistan NTN (7 digits)", fields: [], build: () => "\\b\\d{7}(-\\d)?\\b", explain: "Matches a National Tax Number: 7 digits, with an optional dash and check digit after them.", example: "Finds 1234567 and 1234567-8." },
  ibanpk: { name: "Pakistan IBAN (PK + 22 characters)", fields: [], build: () => "\\bPK\\d{2}[A-Z]{4}\\d{16}\\b", explain: "Matches a Pakistan IBAN: PK, 2 check digits, a 4-letter bank code, then 16 digits for the account number.", example: "Finds PK36SCBL0000001123456702." },
  passport: { name: "Pakistan passport (2 letters + 7 digits)", fields: [], build: () => "\\b[A-Z]{2}\\d{7}\\b", explain: "Matches a Pakistan passport number: 2 capital letters followed by 7 digits.", example: "Finds AB1234567." },
  postalcode: { name: "Pakistan postal code (5 digits)", fields: [], build: () => "\\b\\d{5}\\b", explain: "Matches a 5-digit postal code. It also matches any other 5-digit number, so check the context.", example: "Finds 54000 in an address." },
  amounts: { name: "Amount with commas (1,234,567.89)", fields: [], build: () => "\\d{1,3}(,\\d{3})+(\\.\\d{2})?", explain: "Matches an amount written with thousand separators, with an optional two-decimal part.", example: "Finds 1,234,567.89 and 45,000." },
  time: { name: "Time (24-hour, HH:MM)", fields: [], build: () => "\\b([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?\\b", explain: "Matches a 24-hour time: hours 00 to 23, minutes 00 to 59, with optional seconds.", example: "Finds 14:30 and 09:05:20." },
  urdu: { name: "Urdu text (Urdu/Arabic letters)", fields: [], build: () => "[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+", explain: "Matches runs of Urdu and Arabic letters, including joined letters and Arabic-Indic digits.", example: "Finds اردو in mixed English and Urdu text." }
};
/* Regex explain mode: token-by-token plain-language explanation of a
   pasted pattern. It explains tokens only; it does not run the pattern. */

function explainRegex(pattern) {
  const src = String(pattern || "");
  if (!src) return "Paste a regex pattern first.";
  const lines = [];
  let i = 0;
  const push = (token, meaning) => lines.push(token + " — " + meaning);
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length) {
      const n = src[i + 1];
      const esc = { d: "any digit (0-9)", D: "any character that is not a digit", w: "any letter, digit or underscore", W: "any character that is not a letter, digit or underscore", s: "any space, tab or line break", S: "any character that is not whitespace", b: "a word boundary (between a word character and a non-word character)", B: "not a word boundary", n: "a line break", t: "a tab", r: "a carriage return" };
      if (esc[n]) push("\\" + n, esc[n]);
      else if (n === "u" && src[i + 2] === "{") { const end = src.indexOf("}", i); const cp = end > i ? src.slice(i + 3, end) : ""; push(src.slice(i, end + 1), "the character U+" + cp); i = end + 1; continue; }
      else push("\\" + n, "a literal " + n);
      i += 2; continue;
    }
    if (c === "[") {
      const end = src.indexOf("]", i);
      if (end === -1) { push("[", "an opening square bracket with no closing bracket (invalid pattern)"); break; }
      const inner = src.slice(i + 1, end);
      const neg = inner.startsWith("^");
      const body = neg ? inner.slice(1) : inner;
      let desc;
      if (/^\\u[0-9A-Fa-f]{4}-\\u[0-9A-Fa-f]{4}$/.test(body)) desc = "a character in the Unicode range " + body.replace(/\\u/g, "U+");
      else if (body === "0-9") desc = "a digit from 0 to 9";
      else if (body === "a-z") desc = "a lowercase letter from a to z";
      else if (body === "A-Z") desc = "an uppercase letter from A to Z";
      else if (body === "A-Za-z") desc = "any letter, upper or lower case";
      else if (body === "A-Za-z0-9") desc = "any letter or digit";
      else desc = "one of these characters: " + body.split("").join(", ");
      push(src.slice(i, end + 1), (neg ? "any character except " : "") + desc);
      i = end + 1; continue;
    }
    if (c === "(") {
      if (src.startsWith("(?:", i)) { push("(?:", "start of a group (does not capture, for grouping only)"); i += 3; continue; }
      const named = src.slice(i).match(/^\(\?<([A-Za-z_][A-Za-z0-9_]*)>/);
      if (named) { push(named[0], "start of a group named \"" + named[1] + "\" (captures the match)"); i += named[0].length; continue; }
      push("(", "start of a group (captures the match)"); i++; continue;
    }
    if (c === ")") { push(")", "end of the group"); i++; continue; }
    if (c === "^") { push("^", "the start of the text"); i++; continue; }
    if (c === "$") { push("$", "the end of the text"); i++; continue; }
    if (c === ".") { push(".", "any single character"); i++; continue; }
    if (c === "|") { push("|", "or (either the part before or the part after)"); i++; continue; }
    if (c === "*") { push("*", "zero or more of the previous part"); i++; continue; }
    if (c === "+") { push("+", "one or more of the previous part"); i++; continue; }
    if (c === "?") { push("?", "zero or one of the previous part (optional)"); i++; continue; }
    if (c === "{") {
      const end = src.indexOf("}", i);
      if (end === -1) { push("{", "an opening brace with no closing brace (invalid pattern)"); break; }
      const q = src.slice(i + 1, end);
      let meaning;
      if (/^\d+$/.test(q)) meaning = "exactly " + q + " time(s) of the previous part";
      else if (/^\d+,$/.test(q)) meaning = "at least " + q.replace(",", "") + " time(s) of the previous part";
      else if (/^\d+,\d+$/.test(q)) { const p = q.split(","); meaning = "between " + p[0] + " and " + p[1] + " times of the previous part"; }
      else meaning = "a repeat count (could not be read)";
      push(src.slice(i, end + 1), meaning);
      i = end + 1; continue;
    }
    push(c, "the character " + c);
    i++;
  }
  return "AK Premium — Regex explained\n\nPattern: " + src + "\n\n" + lines.join("\n") + "\n\nRead the lines in order: the pattern must match the text from left to right.";
}

(function initRegex() {
  const taskSel = $("regexTask"), btn = $("regexBtn"), out = $("regexOutput");
  if (!taskSel || !btn) return;
  function runRegexTest(pattern, label) {
    const test = $("regexTest") ? $("regexTest").value : "";
    let matches = "", highlight = "", groups = "";
    try {
      const re = new RegExp(pattern, "g");
      const found = test ? Array.from(test.matchAll(re)) : [];
      if (found.length) {
        matches = "\n\nMatches in your test text (" + found.length + "): " + found.map((m) => m[0]).join(", ");
        let last = 0, html = "";
        for (const m of found) { html += escapeHtml(test.slice(last, m.index)) + "<mark>" + escapeHtml(m[0]) + "</mark>"; last = m.index + m[0].length; }
        html += escapeHtml(test.slice(last));
        highlight = html;
        const withGroups = found.filter((m) => m.length > 1);
        if (withGroups.length) groups = withGroups.map((m, i) => "Match " + (i + 1) + " \"" + m[0] + "\": " + m.slice(1).map((g, gi) => "group " + (gi + 1) + " = " + (g === undefined ? "(no match)" : "\"" + g + "\"")).join(", ")).join("\n");
      } else matches = test ? "\n\nNo matches in your test text." : "";
    } catch (e) { matches = "\n\nCould not test this pattern: " + (e && e.message ? e.message : "invalid pattern") + "."; }
    const hl = $("regexHighlight"); if (hl) hl.innerHTML = highlight;
    const gr = $("regexGroups"); if (gr) gr.textContent = groups;
    return matches;
  }
  btn.addEventListener("click", () => {
    const t = REGEX_TASKS[taskSel.value]; if (!t) return;
    const pattern = t.build();
    const matches = runRegexTest(pattern, t.name);
    if (out) out.textContent = "AK Premium - Regex: " + t.name + "\n\nPattern: " + pattern + "\n\nWhat it does: " + t.explain + "\n\nExample: " + t.example + matches + "\n\nUse it in Excel with a VBA regex, in Google Sheets with REGEXEXTRACT, or in any text editor that supports regular expressions.";
    setStatus("regexStatus", "Done. Your pattern is ready above.");
  });
  /* Interactive block builder: pick a block, add it, and the pattern is
     assembled live. "Test built pattern" runs the same tester on it. */
  const blocks = [];
  function renderBuilt() {
    const el = $("regexBuiltPattern"); if (el) el.value = blocks.join("");
    const list = $("regexBlockList"); if (list) list.textContent = blocks.length ? "Blocks: " + blocks.join(" ") : "No blocks yet. Add a block below.";
  }
  const addBtn = $("regexBlockAdd");
  if (addBtn) addBtn.addEventListener("click", () => {
    const type = $("regexBlockType") ? $("regexBlockType").value : "digits";
    const val = ($("regexBlockValue") ? $("regexBlockValue").value : "").trim();
    let frag = "";
    /* A count of 1 needs no quantifier: \d not \d{1}. */
    const q = (base) => val ? (val === "1" ? base : base + "{" + val + "}") : base;
    if (type === "digits") frag = q("\\d");
    else if (type === "letters") frag = q("[A-Za-z]");
    else if (type === "word") frag = val ? q("\\w") : "\\w+";
    else if (type === "spaces") frag = q("\\s");
    else if (type === "any") frag = q(".");
    else if (type === "dash") frag = "-";
    else if (type === "dot") frag = "\\.";
    else if (type === "literal") { if (!val) { setError("regexStatus", "Type the literal text for the block first."); return; } frag = val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
    if (!/^\d*$/.test(val) && type !== "literal") { setError("regexStatus", "The count must be a whole number, or leave it empty."); return; }
    blocks.push(frag); renderBuilt();
    setStatus("regexStatus", "Block added. The pattern is shown above.");
  });
  const clearBtn = $("regexBlockClear");
  if (clearBtn) clearBtn.addEventListener("click", () => { blocks.length = 0; renderBuilt(); setStatus("regexStatus", "Blocks cleared."); });
  const useBtn = $("regexBlockUse");
  if (useBtn) useBtn.addEventListener("click", () => {
    const pattern = blocks.join("");
    if (!pattern) { setError("regexStatus", "Add at least one block first."); return; }
    const matches = runRegexTest(pattern, "built pattern");
    if (out) out.textContent = "AK Premium - Regex: built pattern\n\nPattern: " + pattern + "\n\nWhat it does: the pattern you built from blocks, in order." + matches + "\n\nUse it in Excel with a VBA regex, in Google Sheets with REGEXEXTRACT, or in any text editor that supports regular expressions.";
    setStatus("regexStatus", "Done. Your built pattern was tested above.");
  });
  renderBuilt();
  /* Explain mode: paste any regex and get a token-by-token explanation. */
  const explainBtn = $("regexExplainBtn");
  if (explainBtn) explainBtn.addEventListener("click", () => {
    const pattern = ($("regexExplainInput") ? $("regexExplainInput").value : "").trim();
    const o = $("regexExplainOutput"); if (o) o.textContent = explainRegex(pattern);
    setStatus("regexStatus", pattern ? "Done. Explanation above." : "Paste a regex pattern to explain first.");
  });
})();
