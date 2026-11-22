/* AK Premium v12 — compress-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Rotate PDF: per-page picker, OSD auto-rotate, deskew ---------- */

const compressQuality = $("compressQuality");
if (compressQuality) compressQuality.addEventListener("input", () => {
  const label = $("compressQualityLabel");
  if (label) label.textContent = compressQuality.value + "%";
});
/* Compress PDF (advanced): text is never rasterised. Lossless uses qpdf
   object-stream compression; Balanced/Small downsample embedded photos to
   a target DPI and re-encode them as JPEG, leaving text and vector
   graphics untouched. Only JPEG (DCTDecode) photos and plain 8-bit
   FlateDecode photos are re-encoded; anything else is left alone and
   counted in the result line. */

const compressPdfBtn = $("compressPdfBtn");
if (compressPdfBtn) compressPdfBtn.addEventListener("click", async () => {
  const file = ($("compressInput").files || [])[0];
  if (!file) { setError("compressPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "compressPdfStatus")) return;
  const level = $("compressLevel") ? $("compressLevel").value : "lossless";
  const quality = parseInt(($("compressQuality") || {}).value || "70", 10) / 100;
  try {
    if (level === "lossless") {
      setStatus("compressPdfStatus", "Compressing without changing quality, this may take a moment...");
      const bytes = new Uint8Array(await readAsArrayBuffer(file));
      const out = await runQpdf("optimize", bytes, "", "compressPdfStatus");
      if (!out) return;
      downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-compressed.pdf");
      setStatus("compressPdfStatus", "Done. Lossless: " + humanBytes(file.size) + " to " + humanBytes(out.length) + " (" + sizeChangeNote(file.size, out.length) + "). No quality was lost and text stays selectable.");
      return;
    }
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "compressPdfStatus")) return;
    const targetDpi = level === "small" ? 96 : 150;
    const q = level === "small" ? Math.min(quality, 0.6) : quality;
    const doc = await loadPdfLibDoc(file, "compressPdfStatus");
    if (!doc) return;
    const stats = await downsamplePdfImages(doc, targetDpi, q, "compressPdfStatus");
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
    const label = level === "small" ? "Small" : "Balanced";
    let note = "";
    if (!stats.images) note = " No photos were found in this PDF, so only the file structure was re-saved. Try Lossless for text-only PDFs.";
    else note = " " + stats.downsampled + " of " + stats.images + " photos shrunk" + (stats.skipped ? " (" + stats.skipped + " left alone: an unsupported format or a masked image)" : "") + ". Text was not touched and stays selectable.";
    setStatus("compressPdfStatus", "Done. " + label + ": " + humanBytes(file.size) + " to " + humanBytes(bytes.length) + " (" + sizeChangeNote(file.size, bytes.length) + ")." + note);
  } catch (e) { if (!setPdfError("compressPdfStatus", e)) setError("compressPdfStatus", "Could not compress this PDF. Please check the file."); }
});
