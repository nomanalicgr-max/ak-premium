/* AK Premium v12 — edit-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: PDF ---------- */

function wrapTextToWidth(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
/* Extra Edit PDF controls, built once and placed before the Add Text button. */
const edExtraWrap = document.createElement("div");
edExtraWrap.innerHTML = '<div class="field-row">'
  + '<label>Font <select id="edFont"><option value="helvetica" selected>Helvetica</option><option value="helvetica-bold">Helvetica Bold</option><option value="times">Times Roman</option><option value="times-bold">Times Roman Bold</option><option value="courier">Courier</option><option value="courier-bold">Courier Bold</option></select></label>'
  + '<label>Alignment <select id="edAlign"><option value="left" selected>Left</option><option value="centre">Centre</option><option value="right">Right</option></select></label>'
  + '<label>Text box width, points (0 = full width) <input id="edWidth" type="number" min="0" value="0"></label></div>'
  + '<label><input id="edWhiteout" type="checkbox"> White-out the area behind the new text first (covers what was there)</label>';

const editPdfBtnEl = $("editPdfBtn");
if (editPdfBtnEl && editPdfBtnEl.parentNode) editPdfBtnEl.parentNode.insertBefore(edExtraWrap, editPdfBtnEl);
let edFontTouched = false;

const edFontSel = $("edFont");
if (edFontSel) edFontSel.addEventListener("change", () => { edFontTouched = true; });
/* Font matching: when a file is picked, look at the fonts already on page 1
   and pick the closest built-in font, unless the user already chose one. */

const editPdfInput = $("editPdfInput");
if (editPdfInput) editPdfInput.addEventListener("change", async () => {
  const file = (editPdfInput.files || [])[0]; if (!file || edFontTouched) return;
  if (!(await ensurePdfJs("editPdfStatus"))) return;
  try {
    const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    const content = await (await pdf.getPage(1)).getTextContent();
    const names = content.items.map((it) => String(it.fontName || ""));
    const pick = names.some((n) => /times/i.test(n)) ? "times" : names.some((n) => /courier/i.test(n)) ? "courier" : "helvetica";
    const bold = names.some((n) => /bold/i.test(n));
    if (edFontSel) edFontSel.value = pick + (bold ? "-bold" : "");
    setStatus("editPdfStatus", "File loaded. The font list was matched to the fonts already on page 1 — change it if you like, then press Add Text to PDF.");
  } catch (e) { /* font matching is a bonus; the tool works without it */ }
});

const editPdfBtn = $("editPdfBtn");
if (editPdfBtn) editPdfBtn.addEventListener("click", async () => {
  const file = ($("editPdfInput").files || [])[0];
  if (!file) { setError("editPdfStatus", "Please select a PDF file first."); return; }
  const text = ($("editPdfText").value || "").trim();
  if (!text) { setError("editPdfStatus", "Please enter text to add first."); return; }
  const pageNum = parseInt($("editPdfPage").value, 10);
  const size = parseInt($("editPdfSize").value, 10) || 18;
  const position = $("editPdfPosition").value;
  const fontName = ($("edFont") || { value: "helvetica" }).value || "helvetica";
  const align = ($("edAlign") || { value: "left" }).value || "left";
  const boxWidthInput = parseInt(($("edWidth") || { value: "0" }).value, 10) || 0;
  const whiteout = !!($("edWhiteout") && $("edWhiteout").checked);
  try {
    const doc = await loadPdfLibDoc(file, "editPdfStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    if (!pageNum || pageNum < 1 || pageNum > count) { setError("editPdfStatus", "This PDF has " + count + " page(s). Please choose a page inside 1 to " + count + "."); return; }
    const fonts = { "helvetica": window.PDFLib.StandardFonts.Helvetica, "helvetica-bold": window.PDFLib.StandardFonts.HelveticaBold, "times": window.PDFLib.StandardFonts.TimesRoman, "times-bold": window.PDFLib.StandardFonts.TimesRomanBold, "courier": window.PDFLib.StandardFonts.Courier, "courier-bold": window.PDFLib.StandardFonts.CourierBold };
    const font = await doc.embedFont(fonts[fontName] || window.PDFLib.StandardFonts.Helvetica);
    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const boxW = boxWidthInput > 0 ? Math.min(boxWidthInput, width - 40) : width - 80;
    const lines = wrapTextToWidth(text, font, size, boxW);
    const lineHeight = size * 1.25;
    const boxH = lines.length * lineHeight;
    /* Anchor the box by the chosen position, then align lines inside it. */
    let boxX = 40, boxTop = height - 40;
    if (position === "top-centre" || position === "bottom-centre" || position === "centre") boxX = (width - boxW) / 2;
    if (position === "bottom-centre") boxTop = 40 + boxH;
    else if (position === "centre") boxTop = height / 2 + boxH / 2;
    if (whiteout) page.drawRectangle({ x: boxX - 4, y: boxTop - boxH - 4, width: boxW + 8, height: boxH + 8, color: window.PDFLib.rgb(1, 1, 1) });
    lines.forEach((line, li) => {
      const lw = font.widthOfTextAtSize(line, size);
      let x = boxX;
      if (align === "centre") x = boxX + (boxW - lw) / 2;
      else if (align === "right") x = boxX + boxW - lw;
      page.drawText(line, { x, y: boxTop - (li + 1) * lineHeight + (lineHeight - size) / 2 + size * 0.2, size, font, color: window.PDFLib.rgb(0.11, 0.11, 0.11) });
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-edited.pdf");
    setStatus("editPdfStatus", "Done. Edited PDF downloaded (" + lines.length + " line(s) on page " + pageNum + (whiteout ? ", with the area behind the text whited out). The original text is still in the file under the white box — this does not delete it." : ")."));
  } catch (e) { setError("editPdfStatus", "Could not edit this PDF. Please check the file."); }
});
