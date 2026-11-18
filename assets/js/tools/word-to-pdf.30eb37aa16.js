/* AK Premium v12 — word-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const wordPdfBtn = $("wordPdfBtn");
if (wordPdfBtn) wordPdfBtn.addEventListener("click", async () => {
  const file = ($("wordPdfInput").files || [])[0];
  if (!file) { setError("wordPdfStatus", "Please select a Word (.docx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "wordPdfStatus") || !needLibrary(!!window.mammoth, "mammoth", "wordPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const result = await window.mammoth.extractRawText({ arrayBuffer: data });
    if (!result.value || !result.value.trim()) { setError("wordPdfStatus", "No text was found in this Word file. Nothing to convert."); return; }
    const doc = new JsPDF();
    doc.setFontSize(12);
    let y = 20;
    result.value.split("\n").forEach((line) => {
      wrapPdfText(doc, line, 170).forEach((part) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(part, 15, y); y += 7;
      });
    });
    doc.save("ak-premium-word-to-pdf.pdf");
    setStatus("wordPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setError("wordPdfStatus", "Could not convert this Word file to PDF."); }
});
