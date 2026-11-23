/* AK Premium v12 — repair-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

async function repairQpdfReport(fixed, statusId) {
  try {
    const doc = await window.PDFLib.PDFDocument.load(fixed);
    const pages = doc.getPages().length;
    const lines = [];
    let textPages = 0;
    if (await ensurePdfJs(statusId)) {
      const pdf = await window.pdfjsLib.getDocument({ data: fixed }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const tc = await (await pdf.getPage(i)).getTextContent();
        const hasText = tc.items.some((it) => (it.str || "").trim());
        if (hasText) textPages++;
        lines.push("Page " + i + ": recovered" + (hasText ? " (text present)" : " (no text — blank or image-only)"));
      }
    }
    return { pages, textPages, lines };
  } catch (e) { return null; }
}

const repairPdfBtn = $("repairPdfBtn");
/* Extra Repair controls: the per-page recovery report, filled in after a
   repair. (Created here, inside the repair chunk, so the splitter keeps it
   in the repair-pdf bundle.) */
const repairExtraWrap = document.createElement("div");
repairExtraWrap.innerHTML = '<pre id="repairPdfOutput" class="output-box" aria-live="polite"></pre>';
if (repairPdfBtn && repairPdfBtn.parentNode) repairPdfBtn.parentNode.insertBefore(repairExtraWrap, repairPdfBtn);
if (repairPdfBtn) repairPdfBtn.addEventListener("click", async () => {
  const file = ($("repairInput").files || [])[0]; if (!file) { setError("repairPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "repairPdfStatus")) return;
  const reportOut = $("repairPdfOutput");
  const showReport = (title, lines) => { if (reportOut) reportOut.textContent = title + "\n" + lines.join("\n"); };
  try {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    /* Pass 1: qpdf rebuilds the file (xref rebuilt, broken objects
       dropped). Silent: a failure here just means the next pass runs. */
    setStatus("repairPdfStatus", "Trying the qpdf repair pass…");
    const fixed = await runQpdf("optimize", bytes, "", "repairPdfStatus", null, true);
    if (fixed) {
      /* Pass a COPY to the report: pdf.js transfers (detaches) the buffer
         it is given, so checking the original would leave it empty and
         the download below would be a 0-byte file. */
      const rep = await repairQpdfReport(fixed.slice(), "repairPdfStatus");
      if (rep) {
        downloadBlob(new Blob([fixed], { type: "application/pdf" }), "ak-premium-repaired.pdf");
        showReport("qpdf repair pass:", rep.lines);
        setStatus("repairPdfStatus", "Done. qpdf rebuilt the file and " + rep.pages + " page(s) open again" + (rep.textPages ? " (" + rep.textPages + " with text)." : "."));
        return;
      }
    }
    /* Pass 2: the file still opens with pdf-lib, so a plain re-save is the
       safest repair (keeps the layout). */
    try {
      const doc = await loadPdfLibDoc(file, "repairPdfStatus");
      if (doc) {
        const out = await doc.save();
        downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-repaired.pdf");
        showReport("Plain re-save (qpdf could not rebuild it):", ["Page count: " + doc.getPageCount() + ". Layout kept as-is."]);
        setStatus("repairPdfStatus", "Done. Re-saved PDF downloaded.");
        return;
      }
    } catch (e) { /* not readable by pdf-lib either: fall through to text rebuild */ }
    /* Pass 3: rebuild from readable text and images, page by page. */
    setStatus("repairPdfStatus", "Rebuilding from readable text and images…");
    /* A file pdf.js cannot open at all throws here; treat that as nothing
       recovered (the repair-specific message below), not the generic
       "try Repair PDF" message, which makes no sense inside Repair PDF. */
    let pages = null, images = null;
    try { pages = await extractPdfLines(file, "repairPdfStatus"); } catch (e) { pages = null; }
    try { images = await extractPdfImages(file, "repairPdfStatus"); } catch (e) { images = null; }
    if ((!pages || !pages.some((pg) => pg.lines.some((l) => l.text.trim()))) && (!images || !images.length)) {
      setError("repairPdfStatus", "Could not repair this PDF. Nothing readable could be recovered — try a fresh copy of the file.");
      return;
    }
    const JsPDF = getJsPdf(); if (!JsPDF) { setError("repairPdfStatus", "jsPDF did not load."); return; }
    const doc = new JsPDF();
    const report = [];
    const imgsByPage = {};
    (images || []).forEach((im) => { (imgsByPage[im.page] = imgsByPage[im.page] || []).push(im); });
    let first = true;
    for (const pg of (pages || [])) {
      if (!first) doc.addPage();
      first = false;
      const text = pg.lines.map((l) => l.text).join("\n").trim();
      if (text) addWrappedTextPaginatedFrom(doc, text, 20);
      const pageImgs = imgsByPage[pg.page] || [];
      let y = 150;
      for (const im of pageImgs) {
        try {
          const url = await blobToDataUrl(im.blob);
          doc.addImage(url, "PNG", 20, y, 170, 60);
          y += 70;
        } catch (e) { /* one bad image must not lose the rest */ }
      }
      report.push("Page " + pg.page + ": " + (text ? "text recovered (" + pg.lines.length + " line(s))" : "no text") + (pageImgs.length ? ", " + pageImgs.length + " image(s) recovered" : ", no images"));
    }
    for (const pgNo of Object.keys(imgsByPage)) {
      if (!(pages || []).some((pg) => pg.page === parseInt(pgNo, 10))) report.push("Page " + pgNo + ": no text, " + imgsByPage[pgNo].length + " image(s) recovered");
    }
    doc.save("ak-premium-repaired-text.pdf");
    showReport("Rebuilt from readable text and images (layout was not preserved):", report);
    setStatus("repairPdfStatus", "Done, from readable text and images only. Layout was rebuilt, not preserved.");
  } catch (e) { if (!setPdfError("repairPdfStatus", e)) setError("repairPdfStatus", "Could not repair this PDF."); }
});
