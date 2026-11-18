/* AK Premium v12 — redact-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const redactPdfBtn = $("redactPdfBtn");
if (redactPdfBtn) redactPdfBtn.addEventListener("click", async () => {
  const file = ($("redactInput").files || [])[0]; const needle = ($("redactText").value || "").trim();
  if (!file) { setError("redactPdfStatus", "Please select a PDF file first."); return; }
  if (!needle) { setError("redactPdfStatus", "Please enter text to redact."); return; }
  try {
    if (!needLibrary(!!window.pdfjsLib, "pdf.js", "redactPdfStatus")) return;
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file);
    /* pdf.js sends its copy to a Web Worker, which detaches (empties) the
       buffer — pdf-lib then fails with "detached ArrayBuffer". So pdf.js
       gets a copy and pdf-lib keeps the original. */
    const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    let found = 0; const matchedPages = new Set();
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent(); const viewport = page.getViewport({ scale: 1 });
      const p = doc.getPage(i-1); const { height } = p.getSize();
      for (const item of content.items) {
        if (String(item.str || "").toLowerCase().includes(needle.toLowerCase())) {
          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
          p.drawRectangle({ x: tx[4], y: height - tx[5] - h, width: w, height: h + 2, color: window.PDFLib.rgb(0,0,0) });
          found++; matchedPages.add(i);
        }
      }
    }
    if (!found) { setError("redactPdfStatus", "That text was not found in the PDF text layer. Scanned PDFs have no text layer — try OCR PDF first."); return; }
    /* True redaction: for every page with a match, render the page to an
       image, burn the black box into that image, and rebuild the page from
       the image alone. The original text layer on that page is destroyed,
       so the redacted text cannot be selected or copied out of it.
       Pages without a match are copied unchanged. */
    const outDoc = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const matches = content.items.filter((it) => String(it.str || "").toLowerCase().includes(needle.toLowerCase()));
      if (!matches.length) {
        const [copied] = await outDoc.copyPages(doc, [i - 1]); outDoc.addPage(copied); continue;
      }
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      for (const item of matches) {
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
        ctx.fillStyle = "#000"; ctx.fillRect(tx[4], tx[5] - h, w, h + 2);
      }
      const jpg = await outDoc.embedJpg(canvas.toDataURL("image/jpeg", 0.9));
      const { width, height } = doc.getPage(i - 1).getSize();
      const pg = outDoc.addPage([width, height]);
      pg.drawImage(jpg, { x: 0, y: 0, width, height });
    }
    const out = await outDoc.save(); downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-redacted.pdf");
    setStatus("redactPdfStatus", "Done. Redacted " + found + " match(es) on " + matchedPages.size + " page(s) — those pages are now images with no text layer, so the covered text cannot be copied. Check the result before sharing sensitive files.");
  } catch (e) { if (!setPdfError("redactPdfStatus", e)) setError("redactPdfStatus", "Could not redact this PDF. (" + (e && e.message ? e.message : "unknown error") + ")"); }
});
