/* AK Premium v12 — translate-helper (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

const translatePdfBtn = $("translatePdfBtn");
if (translatePdfBtn) translatePdfBtn.addEventListener("click", async () => {
  const file = ($("translateInput").files || [])[0]; if (!file) { setError("translatePdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "translatePdfStatus"); if (text === null) return;
    downloadText(text, "ak-premium-for-translation.txt"); setStatus("translatePdfStatus", "Done. Text file downloaded, ready to translate elsewhere. No text was sent to a translation server by AK Premium.");
  } catch (e) { if (!setPdfError("translatePdfStatus", e)) setError("translatePdfStatus", "Could not extract text from this PDF."); }
});


/* More dropdown: horizontal panel, closes on selection or outside click */
