/* AK Premium v12 — repair-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const repairPdfBtn = $("repairPdfBtn");
if (repairPdfBtn) repairPdfBtn.addEventListener("click", async () => {
  const file = ($("repairInput").files || [])[0]; if (!file) { setError("repairPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "repairPdfStatus");
    if (doc) { const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-repaired.pdf"); setStatus("repairPdfStatus", "Done. Re-saved PDF downloaded."); return; }
  } catch (e) {}
  try {
    const text = await extractPdfText(file, "repairPdfStatus"); if (text === null) return;
    const JsPDF = getJsPdf(); const doc = new JsPDF(); addWrappedTextPaginated(doc, text); doc.save("ak-premium-repaired-text.pdf");
    setStatus("repairPdfStatus", "Done, from readable text only. Layout was rebuilt, not preserved.");
  } catch (e2) { setError("repairPdfStatus", "Could not repair this PDF."); }
});
