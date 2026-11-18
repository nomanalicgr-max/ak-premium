/* AK Premium v12 — ppt-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const pptPdfBtn = $("pptPdfBtn");
if (pptPdfBtn) pptPdfBtn.addEventListener("click", async () => {
  const file = ($("pptPdfInput").files || [])[0];
  if (!file) { setError("pptPdfStatus", "Please select a PowerPoint (.pptx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "pptPdfStatus") || !needLibrary(!!window.JSZip, "JSZip", "pptPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const zip = await window.JSZip.loadAsync(data);
    const slideNames = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    if (!slideNames.length) { setError("pptPdfStatus", "No slide text was found in this .pptx file. This basic conversion cannot read it."); return; }
    const doc = new JsPDF();
    let first = true;
    for (const name of slideNames) {
      const xml = await zip.files[name].async("string");
      const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).join(" ");
      if (!first) doc.addPage(); first = false;
      doc.setFontSize(12);
      doc.text(wrapPdfText(doc, texts || "(No text on this slide)", 170), 15, 20);
    }
    doc.save("ak-premium-ppt-to-pdf.pdf");
    setStatus("pptPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setError("pptPdfStatus", "Could not convert this PowerPoint file to PDF. This is a basic, text-only conversion."); }
});
