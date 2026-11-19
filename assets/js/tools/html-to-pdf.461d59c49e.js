/* AK Premium v12 — html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const htmlToPdfBtn = $("htmlToPdfBtn");
if (htmlToPdfBtn) htmlToPdfBtn.addEventListener("click", async () => {
  const file = ($("htmlToPdfInput").files || [])[0];
  if (!file) { setError("htmlToPdfStatus", "Please select an HTML file first."); return; }
  if (!checkFileSize(file, "htmlToPdfStatus")) return;
  setStatus("htmlToPdfStatus", "Reading HTML file…");
  try {
    const raw = await file.text();
    if (!raw.trim()) { setError("htmlToPdfStatus", "This HTML file is empty. Nothing to convert."); return; }
    textToPdf(raw, "htmlToPdfStatus", "ak-premium-html-to-pdf.pdf");
  } catch (e) { setError("htmlToPdfStatus", "Could not read this HTML file. Please check the file."); }
});
