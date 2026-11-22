/* AK Premium v12 — add-watermark (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Remove Pages: visual picker, blank-page and text search ---------- */

const watermarkKindEl = $("watermarkKind");
/* Watermark type + page-range rows: show only the controls that apply. */

function updateWatermarkRows() {
  const kind = watermarkKindEl ? watermarkKindEl.value : "text";
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? "" : "none"; };
  show("watermarkTextRow", kind === "text");
  show("watermarkImageRow", kind === "image");
  show("watermarkScaleRow", kind === "image");
  const pages = ($("watermarkPages") || { value: "all" }).value || "all";
  show("watermarkRangeRow", pages === "range");
}
if (watermarkKindEl) watermarkKindEl.addEventListener("change", updateWatermarkRows);

const watermarkPagesEl = $("watermarkPages");
if (watermarkPagesEl) watermarkPagesEl.addEventListener("change", updateWatermarkRows);
updateWatermarkRows();

const watermarkOpacityEl = $("watermarkOpacity");
if (watermarkOpacityEl) watermarkOpacityEl.addEventListener("input", () => {
  const label = $("watermarkOpacityLabel");
  if (label) label.textContent = Math.round(parseFloat(watermarkOpacityEl.value) * 100) + "%";
});

const watermarkBtn = $("watermarkBtn");
if (watermarkBtn) watermarkBtn.addEventListener("click", async () => {
  const file = ($("watermarkInput").files || [])[0];
  if (!file) { setError("watermarkStatus", "Please select a PDF file first."); return; }
  const kind = ($("watermarkKind") || { value: "text" }).value || "text";
  const text = ($("watermarkText").value || "").trim();
  if (kind === "text") {
    if (!text) { setError("watermarkStatus", "Please enter watermark text first."); return; }
    if (text.length > 60) { setError("watermarkStatus", "Please keep the watermark under 60 characters."); return; }
  }
  const imageFile = ($("watermarkImage").files || [])[0];
  if (kind === "image" && !imageFile) { setError("watermarkStatus", "Please choose a logo image (PNG or JPG) first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "watermarkStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    const pagesSel = ($("watermarkPages") || { value: "all" }).value || "all";
    let targets = [];
    if (pagesSel === "odd") { for (let i = 0; i < count; i += 2) targets.push(i); }
    else if (pagesSel === "even") { for (let i = 1; i < count; i += 2) targets.push(i); }
    else if (pagesSel === "range") {
      const parsed = parsePageList(($("watermarkPageRange") || { value: "" }).value, count);
      if (parsed.error) { setError("watermarkStatus", parsed.error); return; }
      targets = parsed.pages;
    } else { for (let i = 0; i < count; i++) targets.push(i); }
    const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    const size = Math.max(12, Math.min(200, parseInt(($("watermarkSize") || { value: "48" }).value, 10) || 48));
    const angle = Math.max(-90, Math.min(90, parseInt(($("watermarkAngle") || { value: "-45" }).value, 10) || -45));
    const opacity = Math.max(0.05, Math.min(0.8, parseFloat(($("watermarkOpacity") || { value: "0.35" }).value) || 0.35));
    const hex = (($("watermarkColor") || { value: "#808080" }).value || "#808080").replace("#", "");
    const color = window.PDFLib.rgb(
      (parseInt(hex.slice(0, 2), 16) || 128) / 255,
      (parseInt(hex.slice(2, 4), 16) || 128) / 255,
      (parseInt(hex.slice(4, 6), 16) || 128) / 255);
    const tiled = !!($("watermarkTiled") && $("watermarkTiled").checked);
    let image = null, imageDims = null;
    if (kind === "image") {
      const imgBytes = await readAsArrayBuffer(imageFile);
      image = imageFile.type === "image/jpeg"
        ? await doc.embedJpg(imgBytes)
        : await doc.embedPng(imgBytes);
      imageDims = image.scale(1);
    }
    const scale = Math.max(10, Math.min(100, parseInt(($("watermarkImageScale") || { value: "50" }).value, 10) || 50)) / 100;
    for (const idx of targets) {
      const page = doc.getPages()[idx];
      const { width, height } = page.getSize();
      if (kind === "image") {
        const w = width * scale;
        const h = w * (imageDims.height / imageDims.width);
        page.drawImage(image, {
          x: (width - w) / 2, y: (height - h) / 2, width: w, height: h,
          opacity, rotate: window.PDFLib.degrees(angle)
        });
      } else if (tiled) {
        const textWidth = font.widthOfTextAtSize(text, size);
        const stepX = textWidth + 80;
        const stepY = size * 3;
        for (let gx = -textWidth / 2; gx < width; gx += stepX) {
          for (let gy = 0; gy < height; gy += stepY) {
            page.drawText(text, { x: gx, y: gy, size, font, color, opacity, rotate: window.PDFLib.degrees(angle) });
          }
        }
      } else {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, {
          x: width / 2 - textWidth / 2, y: height / 2, size, font,
          color, opacity, rotate: window.PDFLib.degrees(angle)
        });
      }
    }
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-watermarked.pdf");
    setStatus("watermarkStatus", "Done. " + (kind === "image" ? "Logo" : "Text") + " watermark added to " + targets.length + " of " + count + " page(s)" + (tiled && kind === "text" ? ", repeated across each page" : "") + ".");
  } catch (e) { if (!setPdfError("watermarkStatus", e)) setError("watermarkStatus", "Could not add a watermark to this PDF."); }
});

/* Layout-aware extraction: group pdf.js text items into lines, detect a
   two-column page from a vertical gap shared by most lines, order lines
   column by column (left column top to bottom, then right column), and flag
   headings by font size. Returns [{page, columns, lines:[{y, text, heading,
   col, items}]}]. A line that spans both columns (a full-width heading, for
   example) is read with the left column. Single-column pages keep the old
   top-to-bottom order. */
