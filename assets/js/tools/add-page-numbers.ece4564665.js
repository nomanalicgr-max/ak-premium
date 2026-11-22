/* AK Premium v12 — add-page-numbers (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Rotate PDF: per-page picker, OSD auto-rotate, deskew ---------- */

const pageNumbersBtn = $("pageNumbersBtn");
if (pageNumbersBtn) pageNumbersBtn.addEventListener("click", async () => {
  const file = ($("numbersInput").files || [])[0];
  if (!file) { setError("pageNumbersStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pageNumbersStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    const position = ($("numbersPosition") || { value: "bc" }).value || "bc";
    const fontName = ($("numbersFont") || { value: "helvetica" }).value || "helvetica";
    const size = Math.max(8, Math.min(36, parseInt(($("numbersSize") || { value: "11" }).value, 10) || 11));
    const format = ($("numbersFormat") || { value: "n" }).value || "n";
    const start = Math.max(1, parseInt(($("numbersStart") || { value: "1" }).value, 10) || 1);
    const skip = Math.max(0, Math.min(count, parseInt(($("numbersSkip") || { value: "0" }).value, 10) || 0));
    const romanCount = Math.max(0, Math.min(count - skip, parseInt(($("numbersRoman") || { value: "0" }).value, 10) || 0));
    const hex = (($("numbersColor") || { value: "#333333" }).value || "#333333").replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16) / 255 || 0.2;
    const g = parseInt(hex.slice(2, 4), 16) / 255 || 0.2;
    const b = parseInt(hex.slice(4, 6), 16) / 255 || 0.2;
    const fonts = {
      "helvetica": window.PDFLib.StandardFonts.Helvetica,
      "helvetica-bold": window.PDFLib.StandardFonts.HelveticaBold,
      "times": window.PDFLib.StandardFonts.TimesRoman,
      "times-bold": window.PDFLib.StandardFonts.TimesRomanBold,
      "courier": window.PDFLib.StandardFonts.Courier,
      "courier-bold": window.PDFLib.StandardFonts.CourierBold
    };
    const font = await doc.embedFont(fonts[fontName] || window.PDFLib.StandardFonts.Helvetica);
    let numbered = 0;
    doc.getPages().forEach((page, i) => {
      if (i < skip) return;
      const pos = i - skip;
      const label = pos < romanCount
        ? romanNumeral(pos + 1)
        : String(start + (pos - romanCount));
      const text = format === "page-n" ? "Page " + label : (format === "page-n-of-t" ? "Page " + label + " of " + count : label);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      let x = width / 2 - textWidth / 2;
      let y = 24;
      if (position === "bl") { x = 36; y = 24; }
      else if (position === "br") { x = width - 36 - textWidth; y = 24; }
      else if (position === "tl") { x = 36; y = height - 36; }
      else if (position === "tc") { x = width / 2 - textWidth / 2; y = height - 36; }
      else if (position === "tr") { x = width - 36 - textWidth; y = height - 36; }
      page.drawText(text, { x, y, size, font, color: window.PDFLib.rgb(r, g, b) });
      numbered++;
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-numbered.pdf");
    setStatus("pageNumbersStatus", "Done. Numbered " + numbered + " of " + count + " page(s)" + (skip ? ", skipping the first " + skip : "") + (romanCount ? ", first " + romanCount + " in roman numerals" : "") + ".");
  } catch (e) { if (!setPdfError("pageNumbersStatus", e)) setError("pageNumbersStatus", "Could not add page numbers to this PDF."); }
});

/* Honest size wording for Compress: a tiny text PDF re-rendered as images
   can come out larger, and "0% smaller" would hide that. */
