/* AK Premium v12 — remove-pages (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const removePagesBtn = $("removePagesBtn");
if (removePagesBtn) removePagesBtn.addEventListener("click", async () => {
  const file = ($("removePagesInput").files || [])[0];
  if (!file) { setError("removePagesStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "removePagesStatus");
    if (!src) return;
    const count = src.getPageCount();
    const parsed = parsePageSelection($("removePagesList").value, count);
    if (parsed.error) { setError("removePagesStatus", parsed.error); return; }
    const keep = [];
    for (let i = 1; i <= count; i++) if (!parsed.remove.has(i)) keep.push(i - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, keep);
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-pages-removed.pdf");
    setStatus("removePagesStatus", "Done. Removed " + parsed.remove.size + " page(s); " + keep.length + " remain.");
  } catch (e) { if (!setPdfError("removePagesStatus", e)) setError("removePagesStatus", "Could not remove pages from this PDF."); }
});
