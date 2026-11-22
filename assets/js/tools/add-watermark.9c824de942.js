/* AK Premium v12 — add-watermark (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const watermarkBtn = $("watermarkBtn");
if (watermarkBtn) watermarkBtn.addEventListener("click", async () => {
  const file = ($("watermarkInput").files || [])[0];
  if (!file) { setError("watermarkStatus", "Please select a PDF file first."); return; }
  const text = ($("watermarkText").value || "").trim();
  if (!text) { setError("watermarkStatus", "Please enter watermark text first."); return; }
  if (text.length > 60) { setError("watermarkStatus", "Please keep the watermark under 60 characters."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "watermarkStatus");
    if (!doc) return;
    const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    const size = parseInt($("watermarkSize").value, 10) || 48;
    const opacity = parseFloat($("watermarkOpacity").value) || 0.35;
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width * 0.15, y: height * 0.5, size, font,
        color: window.PDFLib.rgb(0.5, 0.5, 0.5), opacity,
        rotate: window.PDFLib.degrees(-45)
      });
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-watermarked.pdf");
    setStatus("watermarkStatus", "Done. Watermarked PDF downloaded.");
  } catch (e) { if (!setPdfError("watermarkStatus", e)) setError("watermarkStatus", "Could not add a watermark to this PDF."); }
});

/* Layout-aware extraction: group pdf.js text items into lines, detect a
   two-column page from a vertical gap shared by most lines, order lines
   column by column (left column top to bottom, then right column), and flag
   headings by font size. Returns [{page, columns, lines:[{y, text, heading,
   col, items}]}]. A line that spans both columns (a full-width heading, for
   example) is read with the left column. Single-column pages keep the old
   top-to-bottom order. */
