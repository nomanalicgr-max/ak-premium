/* AK Premium v12 — ocr-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const ocrpdfPdfBtn = $("ocrpdfPdfBtn");
if (ocrpdfPdfBtn) ocrpdfPdfBtn.addEventListener("click", async () => {
  const file = ($("ocrpdfInput").files || [])[0]; if (!file) { setError("ocrpdfPdfStatus", "Please select a PDF file first."); return; }
  if (!window.Tesseract) { setError("ocrpdfPdfStatus", "OCR library did not load."); return; }
  try {
    if (!needLibrary(!!window.pdfjsLib, "pdf.js", "ocrpdfPdfStatus")) return;
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file); const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const JsPDF = getJsPdf(); const doc = new JsPDF(); let first = true;
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus("ocrpdfPdfStatus", "Reading page " + i + " of " + pdf.numPages + "…");
      const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const result = await window.Tesseract.recognize(canvas, "eng", { logger: () => {} });
      if (!first) doc.addPage(); first = false; addWrappedTextPaginated(doc, result.data.text || "");
    }
    doc.save("ak-premium-ocr.pdf"); setStatus("ocrpdfPdfStatus", "Done. OCR PDF downloaded.");
  } catch (e) { if (!setPdfError("ocrpdfPdfStatus", e)) setError("ocrpdfPdfStatus", "Could not OCR this PDF."); }
});
