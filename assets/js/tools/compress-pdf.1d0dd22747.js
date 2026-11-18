/* AK Premium v12 — compress-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const compressQuality = $("compressQuality");
if (compressQuality) compressQuality.addEventListener("input", () => {
  const label = $("compressQualityLabel");
  if (label) label.textContent = compressQuality.value + "%";
});

const compressPdfBtn = $("compressPdfBtn");
if (compressPdfBtn) compressPdfBtn.addEventListener("click", async () => {
  const file = ($("compressInput").files || [])[0];
  if (!file) { setError("compressPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "compressPdfStatus")) return;
  const level = $("compressLevel") ? $("compressLevel").value : "light";
  const quality = parseInt(($("compressQuality") || {}).value || "70", 10) / 100;
  try {
    if (level === "light") {
      const doc = await loadPdfLibDoc(file, "compressPdfStatus");
      if (!doc) return;
      const bytes = await doc.save({ useObjectStreams: true });
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
      setStatus("compressPdfStatus", "Done. Light: " + humanBytes(file.size) + " to " + humanBytes(bytes.length) + " (" + sizeChangeNote(file.size, bytes.length) + "). Text stays selectable.");
      return;
    }
    if (!(await ensurePdfJs("compressPdfStatus"))) return;
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "compressPdfStatus")) return;
    const scale = level === "strong" ? 1.0 : 1.5;
    const q = level === "strong" ? Math.min(quality, 0.5) : quality;
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const out = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus("compressPdfStatus", "Compressing page " + i + " of " + pdf.numPages + "...");
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const jpg = await out.embedJpg(canvas.toDataURL("image/jpeg", q));
      const pg = out.addPage([viewport.width, viewport.height]);
      pg.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }
    const outBytes = await out.save({ useObjectStreams: true });
    downloadBlob(new Blob([outBytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
    setStatus("compressPdfStatus", "Done. " + (level === "strong" ? "Strong" : "Medium") + ": " + humanBytes(file.size) + " to " + humanBytes(outBytes.length) + " (" + sizeChangeNote(file.size, outBytes.length) + "). Warning: pages are now images, so text is not selectable and cannot be searched.");
  } catch (e) { if (!setPdfError("compressPdfStatus", e)) setError("compressPdfStatus", "Could not compress this PDF. Please check the file."); }
});
