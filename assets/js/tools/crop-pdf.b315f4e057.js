/* AK Premium v12 — crop-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

function cropBoxFromRatio(width, height, ratio) {
  if (!ratio || ratio <= 0) return { x: 0, y: 0, w: width, h: height };
  const cur = width / height;
  if (Math.abs(cur - ratio) < 0.001) return { x: 0, y: 0, w: width, h: height };
  if (cur > ratio) { const w = height * ratio; return { x: (width - w) / 2, y: 0, w, h: height }; }
  const h = width / ratio; return { x: 0, y: (height - h) / 2, w: width, h };
}
/* Extra Crop PDF controls, built once and placed before the Crop button. */
const crExtraWrap = document.createElement("div");
crExtraWrap.innerHTML = '<div class="field-row">'
  + '<label>Top <input id="crTop" type="number" min="0" max="200" value="36"></label>'
  + '<label>Right <input id="crRight" type="number" min="0" max="200" value="36"></label>'
  + '<label>Bottom <input id="crBottom" type="number" min="0" max="200" value="36"></label>'
  + '<label>Left <input id="crLeft" type="number" min="0" max="200" value="36"></label></div>'
  + '<label>Pages <select id="crScope"><option value="all" selected>All pages</option><option value="range">Page range</option></select></label> '
  + '<label id="crRangeRow" style="display:none">Page range <input id="crRange" type="text" placeholder="Example: 1-3, 5"></label>'
  + '<label>Shape <select id="crRatio"><option value="0" selected>Custom margins</option><option value="1.414">A4 portrait</option><option value="1.294">Letter portrait</option><option value="1">Square</option></select></label>'
  + '<div><button id="crTrimBtn" type="button" class="btn-secondary">Remove white borders</button> '
  + '<button id="crPreviewBtn" type="button" class="btn-secondary">Show crop preview</button></div>'
  + '<div id="crPreviewWrap" style="display:none; position:relative; margin-top:8px;"></div>';

const cropPdfBtnEl = $("cropPdfBtn");
if (cropPdfBtnEl && cropPdfBtnEl.parentNode) cropPdfBtnEl.parentNode.insertBefore(crExtraWrap, cropPdfBtnEl);

const cropMarginEl = $("cropMargin");
if (cropMarginEl) cropMarginEl.addEventListener("input", () => {
  const v = cropMarginEl.value;
  ["crTop", "crRight", "crBottom", "crLeft"].forEach((id) => { const el = $(id); if (el) el.value = v; });
});

const crScopeEl = $("crScope");
if (crScopeEl) crScopeEl.addEventListener("change", () => {
  const row = $("crRangeRow"); if (row) row.style.display = crScopeEl.value === "range" ? "" : "none";
});
let crPreview = null; /* {scale, pageW, pageH, canvas} while the preview is open */

const crPreviewBtn = $("crPreviewBtn");
if (crPreviewBtn) crPreviewBtn.addEventListener("click", async () => {
  const file = ($("cropInput").files || [])[0];
  if (!file) { setError("cropPdfStatus", "Please select a PDF file first."); return; }
  if (!(await ensurePdfJs("cropPdfStatus"))) return;
  try {
    const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    const page = await pdf.getPage(1);
    const vp0 = page.getViewport({ scale: 1 });
    const scale = Math.min(1, 520 / Math.max(vp0.width, vp0.height));
    const vp = page.getViewport({ scale });
    const wrap = $("crPreviewWrap"); if (!wrap) return;
    wrap.style.display = ""; wrap.innerHTML = "";
    const cv = document.createElement("canvas"); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    wrap.appendChild(cv);
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    const box = document.createElement("div");
    box.style.cssText = "position:absolute; border:2px dashed #2563eb; background:rgba(37,99,235,0.08); cursor:move;";
    const syncBoxToInputs = () => {
      const x = parseFloat(box.style.left) || 0, y = parseFloat(box.style.top) || 0;
      const w = parseFloat(box.style.width) || 0, h = parseFloat(box.style.height) || 0;
      const set = (id, v) => { const el = $(id); if (el) el.value = String(Math.max(0, Math.round(v))); };
      set("crLeft", x / scale); set("crTop", y / scale);
      set("crRight", vp0.width - (x + w) / scale); set("crBottom", vp0.height - (y + h) / scale);
    };
    const placeBox = (x, y, w, h) => {
      box.style.left = Math.max(0, Math.min(x, cv.width - 4)) + "px";
      box.style.top = Math.max(0, Math.min(y, cv.height - 4)) + "px";
      box.style.width = Math.max(4, Math.min(w, cv.width - parseFloat(box.style.left))) + "px";
      box.style.height = Math.max(4, Math.min(h, cv.height - parseFloat(box.style.top))) + "px";
    };
    placeBox(36 * scale, 36 * scale, cv.width - 72 * scale, cv.height - 72 * scale);
    wrap.appendChild(box);
    let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    box.addEventListener("pointerdown", (e) => { e.preventDefault(); drag = { mode: "move", dx: pos(e).x - parseFloat(box.style.left), dy: pos(e).y - parseFloat(box.style.top) }; });
    wrap.addEventListener("pointerdown", (e) => {
      if (e.target === box) return;
      const p = pos(e); drag = { mode: "draw", x0: p.x, y0: p.y };
      placeBox(p.x, p.y, 4, 4);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = pos(e);
      if (drag.mode === "move") placeBox(p.x - drag.dx, p.y - drag.dy, parseFloat(box.style.width), parseFloat(box.style.height));
      else placeBox(Math.min(drag.x0, p.x), Math.min(drag.y0, p.y), Math.abs(p.x - drag.x0), Math.abs(p.y - drag.y0));
    });
    wrap.addEventListener("pointerup", () => { if (drag) { drag = null; syncBoxToInputs(); } });
    crPreview = { scale, pageW: vp0.width, pageH: vp0.height, canvas: cv };
    setStatus("cropPdfStatus", "Preview of page 1. Drag on the page to draw the crop box, or drag the box to move it. The four margin boxes update when you let go — then press Crop PDF.");
  } catch (e) { setError("cropPdfStatus", "Could not show the crop preview. Please check the file."); }
});

const crTrimBtn = $("crTrimBtn");
if (crTrimBtn) crTrimBtn.addEventListener("click", async () => {
  const file = ($("cropInput").files || [])[0];
  if (!file) { setError("cropPdfStatus", "Please select a PDF file first."); return; }
  if (!(await ensurePdfJs("cropPdfStatus"))) return;
  setStatus("cropPdfStatus", "Finding the ink on each page...");
  try {
    const doc = await loadPdfLibDoc(file, "cropPdfStatus"); if (!doc) return;
    const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    let trimmed = 0, skipped = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.5 });
      const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(vp.width)); cv.height = Math.max(1, Math.round(vp.height));
      const ctx = cv.getContext("2d");
      let box = null;
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        try { box = inkBBoxFromImageData(ctx.getImageData(0, 0, cv.width, cv.height)); } catch (e) { box = null; }
      }
      if (!box) { skipped++; continue; }
      const pad = 8;
      const p = doc.getPage(i - 1); const { width, height } = p.getSize();
      const x0 = Math.max(0, box.x0 / 0.5 - pad), x1 = Math.min(width, (box.x1 + 1) / 0.5 + pad);
      const yTop = Math.max(0, box.y0 / 0.5 - pad), yBot = Math.min(height, (box.y1 + 1) / 0.5 + pad);
      p.setCropBox(x0, height - yBot, Math.max(10, x1 - x0), Math.max(10, yBot - yTop));
      trimmed++;
    }
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-cropped.pdf");
    setStatus("cropPdfStatus", "Done. White borders removed from " + trimmed + " page(s)" + (skipped ? "; " + skipped + " page(s) had no ink to measure and were left unchanged" : "") + ".");
  } catch (e) { if (!setPdfError("cropPdfStatus", e)) setError("cropPdfStatus", "Could not trim the white borders. Please check the file."); }
});

const cropPdfBtn = $("cropPdfBtn");
if (cropPdfBtn) cropPdfBtn.addEventListener("click", async () => {
  const file = ($("cropInput").files || [])[0]; if (!file) { setError("cropPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "cropPdfStatus"); if (!doc) return;
    const count = doc.getPageCount();
    let targets = null;
    if (($("crScope") || { value: "all" }).value === "range") {
      const parsed = parsePageList(($("crRange") || { value: "" }).value, count);
      if (parsed.error) { setError("cropPdfStatus", parsed.error); return; }
      targets = new Set(parsed.pages);
    }
    const ratio = parseFloat(($("crRatio") || { value: "0" }).value) || 0;
    const top = parseFloat(($("crTop") || { value: "36" }).value) || 0;
    const right = parseFloat(($("crRight") || { value: "36" }).value) || 0;
    const bottom = parseFloat(($("crBottom") || { value: "36" }).value) || 0;
    const left = parseFloat(($("crLeft") || { value: "36" }).value) || 0;
    doc.getPages().forEach((page, i) => {
      if (targets && !targets.has(i)) return;
      const { width, height } = page.getSize();
      if (ratio > 0) {
        const b = cropBoxFromRatio(width, height, ratio);
        page.setCropBox(b.x, b.y, Math.max(10, b.w), Math.max(10, b.h));
      } else {
        page.setCropBox(left, bottom, Math.max(10, width - left - right), Math.max(10, height - top - bottom));
      }
    });
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-cropped.pdf");
    setStatus("cropPdfStatus", "Done. Cropped PDF downloaded" + (targets ? " (" + targets.size + " page(s))" : "") + (ratio > 0 ? " to the chosen shape." : "."));
  } catch (e) { if (!setPdfError("cropPdfStatus", e)) setError("cropPdfStatus", "Could not crop this PDF."); }
});
/* Redaction pattern presets: name -> regex source (matched against each
   text item from the PDF text layer). */
/* Try to erase matched text from a page's content stream: replace the
   matched bytes with spaces, but only inside BT...ET text blocks, so image
   data is never touched. Returns how many occurrences were blanked (0 when
   the text is not stored as plain bytes, e.g. split across operators or in
   a subset font — the caller then falls back to rasterising the page). */
