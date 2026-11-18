/* AK Premium v12 — pdf-to-pdf-a (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const pdfaPdfBtn = $("pdfaPdfBtn");
if (pdfaPdfBtn) pdfaPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfaInput").files || [])[0]; if (!file) { setError("pdfaPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pdfaPdfStatus"); if (!doc) return;
    doc.setTitle($("pdfaTitle").value || "Archive document"); doc.setAuthor("AK Premium"); doc.setSubject("Archive copy"); doc.setKeywords(["archive", "PDF/A-style"]); doc.setProducer("AK Premium browser tool"); doc.setCreator("AK Premium");
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-archive.pdf");
    setStatus("pdfaPdfStatus", "Done. Archive-style copy downloaded. This is not a certified PDF/A validation.");
  } catch (e) { if (!setPdfError("pdfaPdfStatus", e)) setError("pdfaPdfStatus", "Could not make an archive copy."); }
});
