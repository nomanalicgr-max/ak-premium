/* AK Premium v12 — pdf-to-text (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const pdfTextBtn = $("pdfTextBtn");
if (pdfTextBtn) pdfTextBtn.addEventListener("click", async () => {
  const file = ($("pdfTextInput").files || [])[0];
  if (!file) { setError("pdfTextStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "pdfTextStatus");
    if (text === null) return;
    downloadText(text, "ak-premium-text.txt");
    setStatus("pdfTextStatus", "Done. Text file downloaded.");
  } catch (e) { if (!setPdfError("pdfTextStatus", e)) setError("pdfTextStatus", "Could not extract text from this PDF. Scanned-image PDFs without a text layer cannot be read this way."); }
});
