/* AK Premium v9 — bundle-developer (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 1 handlers: Developer ---------- */

const jsonFormatBtn = $("jsonFormatBtn");
if (jsonFormatBtn) jsonFormatBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = prettyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON formatted."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonMinifyBtn = $("jsonMinifyBtn");
if (jsonMinifyBtn) jsonMinifyBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = minifyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON minified."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonValidateBtn = $("jsonValidateBtn");
if (jsonValidateBtn) jsonValidateBtn.addEventListener("click", () => {
  try { JSON.parse($("jsonInput").value); $("jsonOutput").textContent = "Valid JSON."; setStatus("jsonStatus", "Done. JSON is valid."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});

const jsonCopyBtn = $("jsonCopyBtn");
if (jsonCopyBtn) jsonCopyBtn.addEventListener("click", () => {
  const text = $("jsonOutput") ? $("jsonOutput").textContent : "";
  if (!text || text.startsWith("Formatted JSON")) { setStatus("jsonStatus", "Format, minify or validate JSON first, then use Copy."); return; }
  copyTextToClipboard(text, "jsonStatus");
});

const base64EncodeBtn = $("base64EncodeBtn");
if (base64EncodeBtn) base64EncodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64EncodeText($("base64Input").value); setStatus("base64Status", "Done. Text encoded."); }
  catch (e) { setStatus("base64Status", "Could not encode this text."); }
});

const base64DecodeBtn = $("base64DecodeBtn");
if (base64DecodeBtn) base64DecodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64DecodeText($("base64Input").value); setStatus("base64Status", "Done. Text decoded."); }
  catch (e) { setStatus("base64Status", "Invalid Base64: " + e.message); }
});

const base64CopyBtn = $("base64CopyBtn");
if (base64CopyBtn) base64CopyBtn.addEventListener("click", () => {
  const text = $("base64Output") ? $("base64Output").textContent : "";
  if (!text || text.startsWith("Result will")) { setStatus("base64Status", "Encode or decode text first, then use Copy."); return; }
  copyTextToClipboard(text, "base64Status");
});

/* ---------- Phase 2 handlers: Developer ---------- */

const caseCopyBtn = $("caseCopyBtn");
if (caseCopyBtn) caseCopyBtn.addEventListener("click", () => {
  const text = $("caseOutput") ? $("caseOutput").textContent : "";
  if (!text || text.startsWith("Converted text")) { setStatus("caseStatus", "Convert text first, then use Copy."); return; }
  copyTextToClipboard(text, "caseStatus");
});

function renderUuids(count) {
  try {
    const list = [];
    for (let i = 0; i < count; i++) list.push(generateUuid());
    if ($("uuidOutput")) $("uuidOutput").textContent = list.join("\n");
    setStatus("uuidStatus", "Done.");
  } catch (e) { setStatus("uuidStatus", "Secure random numbers are not available in this browser."); }
}

const uuidBtn = $("uuidBtn");
if (uuidBtn) uuidBtn.addEventListener("click", () => renderUuids(1));

const uuidBtn5 = $("uuidBtn5");
if (uuidBtn5) uuidBtn5.addEventListener("click", () => renderUuids(5));

const uuidCopyBtn = $("uuidCopyBtn");
if (uuidCopyBtn) uuidCopyBtn.addEventListener("click", () => {
  const text = $("uuidOutput") ? $("uuidOutput").textContent : "";
  if (!text || text.startsWith("Your UUID")) { setStatus("uuidStatus", "Generate a UUID first, then use Copy."); return; }
  copyTextToClipboard(text, "uuidStatus");
});

const csvJsonBtn = $("csvJsonBtn");
if (csvJsonBtn) csvJsonBtn.addEventListener("click", async () => {
  let text = ($("csvJsonText").value || "").trim();
  const file = ($("csvJsonFile").files || [])[0];
  if (file) { try { text = await file.text(); } catch (e) { setStatus("csvJsonStatus", "Could not read this CSV file."); return; } }
  const parsed = csvToJson(text);
  if (parsed.error) { setStatus("csvJsonStatus", parsed.error); return; }
  const json = JSON.stringify(parsed.rows, null, 2);
  if ($("csvJsonOutput")) $("csvJsonOutput").textContent = json;
  setStatus("csvJsonStatus", "Done. " + parsed.rows.length + " row(s) converted.");
});

const csvJsonCopyBtn = $("csvJsonCopyBtn");
if (csvJsonCopyBtn) csvJsonCopyBtn.addEventListener("click", () => {
  const text = $("csvJsonOutput") ? $("csvJsonOutput").textContent : "";
  if (!text || text.startsWith("JSON output")) { setStatus("csvJsonStatus", "Convert CSV first, then use Copy."); return; }
  copyTextToClipboard(text, "csvJsonStatus");
});

const csvJsonDownloadBtn = $("csvJsonDownloadBtn");
if (csvJsonDownloadBtn) csvJsonDownloadBtn.addEventListener("click", () => {
  const text = $("csvJsonOutput") ? $("csvJsonOutput").textContent : "";
  if (!text || text.startsWith("JSON output")) { setStatus("csvJsonStatus", "Convert CSV first, then download."); return; }
  downloadText(text, "ak-premium-data.json", "application/json;charset=utf-8");
  setStatus("csvJsonStatus", "Done. JSON downloaded.");
});

const diffBtn = $("diffBtn");
if (diffBtn) diffBtn.addEventListener("click", () => {
  const result = diffTexts($("diffOriginal").value, $("diffChanged").value);
  if (result.identical) { if ($("diffOutput")) $("diffOutput").textContent = "No differences found."; setStatus("diffStatus", "Done."); return; }
  const parts = [];
  if (result.removed.length) parts.push("Removed:\n- " + result.removed.join("\n- "));
  if (result.added.length) parts.push("Added:\n+ " + result.added.join("\n+ "));
  parts.push("Unchanged lines: " + result.unchanged);
  if ($("diffOutput")) $("diffOutput").textContent = parts.join("\n\n");
  setStatus("diffStatus", "Done.");
});
