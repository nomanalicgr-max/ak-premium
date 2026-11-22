/* AK Premium v12 — remove-pages (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const removePagesBtn = $("removePagesBtn");
if (removePagesBtn) removePagesBtn.addEventListener("click", async () => {
  const file = ($("removePagesInput").files || [])[0];
  if (!file) { setError("removePagesStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "removePagesStatus");
    if (!src) return;
    const count = src.getPageCount();
    const parsed = parsePageSelection($("removePagesList").value, count);
    if (parsed.error) { setError("removePagesStatus", parsed.error); return; }
    const keep = [];
    for (let i = 1; i <= count; i++) if (!parsed.remove.has(i)) keep.push(i - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, keep);
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-pages-removed.pdf");
    setStatus("removePagesStatus", "Done. Removed " + parsed.remove.size + " page(s); " + keep.length + " remain.");
  } catch (e) { if (!setPdfError("removePagesStatus", e)) setError("removePagesStatus", "Could not remove pages from this PDF."); }
});

/* ---------- Remove Pages: visual picker, blank-page and text search ---------- */

function rangesFromPages(pages) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (!sorted.length) return "";
  const parts = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    parts.push(start === prev ? String(start) : start + "-" + prev);
    if (i < sorted.length) { start = sorted[i]; prev = sorted[i]; }
  }
  return parts.join(", ");
}
/* Count dark (ink) pixels in an ImageData object. Pure, unit-testable. */

const removePagesInput = $("removePagesInput");
/* Extra picker controls, built once and placed before the Remove button. */
const rmPickerWrap = document.createElement("div");
rmPickerWrap.innerHTML = '<div id="rmPicker" class="thumb-list" aria-label="Pages, click to select"></div>'
  + '<label>Find pages with this text <input id="rmSearchText" type="text" placeholder="Example: DRAFT"></label> '
  + '<button id="rmSearchBtn" type="button" class="btn-secondary">Select matching pages</button> '
  + '<button id="rmBlankBtn" type="button" class="btn-secondary">Select blank pages</button>';

const removePagesBtnEl = $("removePagesBtn");
if (removePagesBtnEl && removePagesBtnEl.parentNode) removePagesBtnEl.parentNode.insertBefore(rmPickerWrap, removePagesBtnEl);

function rmSyncListBox() {
  const box = $("removePagesList"); if (box) box.value = rangesFromPages([...removePagesSelected]);
  document.querySelectorAll("#rmPicker .thumb").forEach((el) => {
    el.classList.toggle("selected", removePagesSelected.has(parseInt(el.dataset.page, 10)));
  });
}
if (removePagesInput) removePagesInput.addEventListener("change", async () => {
  const file = (removePagesInput.files || [])[0]; const picker = $("rmPicker"); if (!file || !picker) return;
  picker.innerHTML = ""; removePagesSelected = new Set(); rmSyncListBox();
  if (!(await ensurePdfJs("removePagesStatus"))) return;
  try {
    removePagesPdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    for (let i = 1; i <= removePagesPdf.numPages; i++) {
      const page = await removePagesPdf.getPage(i);
      const vp = page.getViewport({ scale: 0.35 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      const item = document.createElement("div"); item.className = "thumb"; item.dataset.page = String(i);
      item.appendChild(cv);
      const label = document.createElement("div"); label.textContent = "Page " + i; item.appendChild(label);
      item.addEventListener("click", () => {
        if (removePagesSelected.has(i)) removePagesSelected.delete(i); else removePagesSelected.add(i);
        rmSyncListBox();
      });
      picker.appendChild(item);
    }
    setStatus("removePagesStatus", removePagesPdf.numPages + " page(s) loaded. Click thumbnails to pick pages to remove, or use the blank-page and text search buttons.");
  } catch (e) { removePagesPdf = null; }
});

const rmSearchBtn = $("rmSearchBtn");
if (rmSearchBtn) rmSearchBtn.addEventListener("click", async () => {
  const needle = ($("rmSearchText").value || "").trim().toLowerCase();
  if (!needle) { setError("removePagesStatus", "Type the text to search for first."); return; }
  if (!removePagesPdf) { setError("removePagesStatus", "Choose a PDF file first, so the pages can be searched."); return; }
  try {
    const found = [];
    for (let i = 1; i <= removePagesPdf.numPages; i++) {
      const content = await (await removePagesPdf.getPage(i)).getTextContent();
      const text = content.items.map((it) => String(it.str || "")).join(" ").toLowerCase();
      if (text.includes(needle)) found.push(i);
    }
    if (!found.length) { setStatus("removePagesStatus", "No page contains \"" + needle + "\"."); return; }
    found.forEach((p) => removePagesSelected.add(p));
    rmSyncListBox();
    setStatus("removePagesStatus", found.length + " page(s) contain \"" + needle + "\" and are now selected for removal. Press Remove Pages to delete them.");
  } catch (e) { setError("removePagesStatus", "Could not search those pages. Please check the file."); }
});

const rmBlankBtn = $("rmBlankBtn");
if (rmBlankBtn) rmBlankBtn.addEventListener("click", async () => {
  if (!removePagesPdf) { setError("removePagesStatus", "Choose a PDF file first, so blank pages can be found."); return; }
  setStatus("removePagesStatus", "Checking pages for blank ones...");
  try {
    const blank = [];
    for (let i = 1; i <= removePagesPdf.numPages; i++) {
      const page = await removePagesPdf.getPage(i);
      const content = await page.getTextContent();
      const hasText = content.items.some((it) => String(it.str || "").trim());
      if (hasText) continue;
      /* No text: check for ink (a drawing, stamp or photo) on a low-res render. */
      const vp = page.getViewport({ scale: 0.5 });
      const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(vp.width)); cv.height = Math.max(1, Math.round(vp.height));
      const ctx = cv.getContext("2d");
      let ink = 0, total = 1;
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        try {
          const img = ctx.getImageData(0, 0, cv.width, cv.height);
          ink = countInkPixels(img); total = Math.max(1, img.width * img.height);
        } catch (e) { ink = 1; /* unreadable render: treat as not blank */ }
      }
      if (ink / total < 0.0002) blank.push(i);
    }
    if (!blank.length) { setStatus("removePagesStatus", "No blank pages found."); return; }
    blank.forEach((p) => removePagesSelected.add(p));
    rmSyncListBox();
    setStatus("removePagesStatus", blank.length + " blank page(s) selected for removal: " + rangesFromPages(blank) + ". Press Remove Pages to delete them.");
  } catch (e) { setError("removePagesStatus", "Could not check for blank pages. Please check the file."); }
});
