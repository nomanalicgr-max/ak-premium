/* AK Premium v12 — csv-to-json (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Developer ---------- */

const csvJsonBtn = $("csvJsonBtn");
if (csvJsonBtn) csvJsonBtn.addEventListener("click", async () => {
  let text = ($("csvJsonText").value || "").trim();
  const file = ($("csvJsonFile").files || [])[0];
  if (file) { try { text = await file.text(); } catch (e) { setError("csvJsonStatus", "Could not read this CSV file."); return; } }
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
