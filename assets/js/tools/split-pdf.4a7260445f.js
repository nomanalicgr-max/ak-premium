/* AK Premium v12 — split-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const splitPdfBtn = $("splitPdfBtn");
if (splitPdfBtn) splitPdfBtn.addEventListener("click", async () => {
  const file = ($("splitInput").files || [])[0];
  if (!file) { setError("splitPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "splitPdfStatus")) return;
  const mode = $("splitMode") ? $("splitMode").value : "range";
  const rangeText = ($("splitRanges") || { value: "" }).value || "";
  try {
    const src = await loadPdfLibDoc(file, "splitPdfStatus");
    if (!src) return;
    const count = src.getPageCount();
    if (mode === "every") {
      if (!needLibrary(!!window.JSZip, "JSZip", "splitPdfStatus")) return;
      const zip = new window.JSZip();
      for (let i = 0; i < count; i++) {
        const out = await window.PDFLib.PDFDocument.create();
        const pages = await out.copyPages(src, [i]); pages.forEach((pg) => out.addPage(pg));
        zip.file("page-" + (i + 1) + ".pdf", await out.save());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "ak-premium-split-pages.zip");
      setStatus("splitPdfStatus", "Done. " + count + " pages extracted as a ZIP file.");
      return;
    }
    /* Parse "1-3, 5, 8-10" into a page list, validating against the real count. */
    const keep = new Set();
    const tokens = rangeText.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) { setError("splitPdfStatus", "Please enter page ranges, for example 1-3, 5, 8-10."); return; }
    for (const token of tokens) {
      if (token.includes("-")) {
        const [a, b] = token.split("-").map((x) => parseInt(x.trim(), 10));
        if (!a || !b || b < a || a < 1 || b > count) { setError("splitPdfStatus", "Range " + token + " is outside 1 to " + count + "."); return; }
        for (let i = a; i <= b; i++) keep.add(i);
      } else {
        const n = parseInt(token, 10);
        if (!n || n < 1 || n > count) { setError("splitPdfStatus", "Page " + token + " is outside 1 to " + count + "."); return; }
        keep.add(n);
      }
    }
    const indices = [...keep].sort((a, b) => a - b).map((n) => n - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, indices); pages.forEach((pg) => out.addPage(pg));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-split.pdf");
    setStatus("splitPdfStatus", "Done. Extracted " + indices.length + " page(s) into one PDF.");
  } catch (e) { if (!setPdfError("splitPdfStatus", e)) setError("splitPdfStatus", "Could not split this PDF. Please check the file and page ranges."); }
});
