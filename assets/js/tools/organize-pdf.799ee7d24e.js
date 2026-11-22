/* AK Premium v12 — organize-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: PDF ---------- */

const organizeInput = $("organizeInput");
if (organizeInput) organizeInput.addEventListener("change", async () => {
  const file = (organizeInput.files || [])[0]; const list = $("organizeList"); if (!file || !list) return;
  list.innerHTML = "";
  if (!(await ensurePdfJs("organizeStatus"))) return;
  const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
  /* A re-render after drag, delete, duplicate or split must keep the edits,
     so the list is rebuilt only when a different file is picked. */
  const key = file.name + "|" + file.size + "|" + file.lastModified;
  if (key !== organizeFileKey || !organizePages.length) {
    organizePages = Array.from({ length: pdf.numPages }, (_, i) => ({ index: i, rotation: 0, blank: false, split: false }));
    organizeSelected = new Set();
    organizeFileKey = key;
  }
  for (let k = 0; k < organizePages.length; k++) {
    const pg = organizePages[k];
    const item = document.createElement("div"); item.className = "thumb"; item.draggable = true;
    if (pg.blank) {
      const ph = document.createElement("div"); ph.className = "thumb-blank"; ph.textContent = "Blank page";
      item.appendChild(ph);
      const label = document.createElement("div"); label.textContent = "Blank page";
      item.appendChild(label);
      const del = document.createElement("button"); del.type = "button"; del.className = "btn-secondary"; del.textContent = "Delete";
      del.addEventListener("click", () => { organizePages.splice(k, 1); organizeInput.dispatchEvent(new Event("change")); });
      item.appendChild(del);
    } else {
      const page = await pdf.getPage(pg.index + 1);
      const vp = page.getViewport({ scale: 0.35 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      item.appendChild(cv);
      const label = document.createElement("div");
      const setLabel = () => { label.textContent = "Page " + (pg.index + 1) + (pg.rotation ? " (" + pg.rotation + " deg)" : "") + (pg.split ? " — split in two" : ""); };
      setLabel();
      item.appendChild(label);
      const sel = document.createElement("label"); sel.className = "thumb-select";
      const cb = document.createElement("input"); cb.type = "checkbox";
      cb.checked = organizeSelected.has(k);
      cb.addEventListener("change", () => { if (cb.checked) organizeSelected.add(k); else organizeSelected.delete(k); });
      sel.appendChild(cb); sel.appendChild(document.createTextNode(" Select"));
      item.appendChild(sel);
      const rot = document.createElement("button"); rot.type = "button"; rot.className = "btn-secondary"; rot.textContent = "Rotate 90";
      rot.addEventListener("click", () => { pg.rotation = (pg.rotation + 90) % 360; setLabel(); });
      const dup = document.createElement("button"); dup.type = "button"; dup.className = "btn-secondary"; dup.textContent = "Duplicate";
      dup.addEventListener("click", () => { organizePages.splice(k + 1, 0, { index: pg.index, rotation: pg.rotation, blank: false, split: pg.split }); organizeInput.dispatchEvent(new Event("change")); });
      const splitBtn = document.createElement("button"); splitBtn.type = "button"; splitBtn.className = "btn-secondary"; splitBtn.textContent = pg.split ? "Unsplit" : "Split in two";
      splitBtn.addEventListener("click", () => { pg.split = !pg.split; organizeInput.dispatchEvent(new Event("change")); });
      const blankBtn = document.createElement("button"); blankBtn.type = "button"; blankBtn.className = "btn-secondary"; blankBtn.textContent = "Blank after";
      blankBtn.addEventListener("click", () => { organizePages.splice(k + 1, 0, { index: -1, rotation: 0, blank: true, split: false }); organizeInput.dispatchEvent(new Event("change")); });
      const del = document.createElement("button"); del.type = "button"; del.className = "btn-secondary"; del.textContent = "Delete";
      del.addEventListener("click", () => { organizePages.splice(k, 1); organizeInput.dispatchEvent(new Event("change")); });
      item.appendChild(rot); item.appendChild(dup); item.appendChild(splitBtn); item.appendChild(blankBtn); item.appendChild(del);
    }
    item.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", k));
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData("text/plain"), 10); const [m] = organizePages.splice(from, 1); organizePages.splice(k, 0, m); organizeInput.dispatchEvent(new Event("change")); });
    list.appendChild(item);
  }
  setStatus("organizeStatus", pdf.numPages + " page(s) loaded. Drag to reorder, rotate or delete. Split in two cuts one page into a left and a right page; Blank after adds an empty page; tick Select on pages and use Download selected pages to save only those.");
});

const organizeBtn = $("organizeBtn");
if (organizeBtn) organizeBtn.addEventListener("click", async () => {
  const file = ($("organizeInput").files || [])[0];
  if (!file) { setError("organizeStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "organizeStatus");
    if (!src) return;
    const count = src.getPageCount();
    let order = organizePages.length ? organizePages : null;
    if (!order) {
      const parsed = parseOrganizeOrder($("organizeOrder").value, count);
      if (parsed.error) { setError("organizeStatus", parsed.error); return; }
      order = parsed.order.map((n) => ({ index: n - 1, rotation: 0, blank: false, split: false }));
    }
    if (!order.length) { setError("organizeStatus", "You deleted every page. Keep at least one page."); return; }
    const out = await window.PDFLib.PDFDocument.create();
    let lastSize = { width: 612, height: 792 };
    for (const entry of order) {
      if (entry.blank) { out.addPage([lastSize.width, lastSize.height]); continue; }
      const copies = entry.split ? 2 : 1;
      for (let c = 0; c < copies; c++) {
        const [pg] = await out.copyPages(src, [entry.index]);
        const mb = pg.getMediaBox();
        if (entry.split) {
          const half = mb.width / 2;
          pg.setCropBox(c === 0 ? 0 : half, 0, half, mb.height);
          lastSize = { width: half, height: mb.height };
        } else {
          lastSize = { width: mb.width, height: mb.height };
        }
        if (entry.rotation) pg.setRotation(window.PDFLib.degrees(entry.rotation));
        out.addPage(pg);
      }
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-organized.pdf");
    setStatus("organizeStatus", "Done. Organized PDF downloaded with " + out.getPageCount() + " page(s).");
  } catch (e) { setError("organizeStatus", "Could not reorder this PDF. Please check the file and order."); }
});
/* Extract selected pages: a second download button, added next to Reorder. */
const organizeExtractBtn = document.createElement("button");
organizeExtractBtn.type = "button"; organizeExtractBtn.id = "organizeDownloadSelectedBtn"; organizeExtractBtn.className = "btn-secondary"; organizeExtractBtn.textContent = "Download selected pages";
if (organizeBtn && organizeBtn.parentNode) organizeBtn.parentNode.insertBefore(organizeExtractBtn, organizeBtn.nextSibling);
organizeExtractBtn.addEventListener("click", async () => {
  const file = ($("organizeInput").files || [])[0];
  if (!file) { setError("organizeStatus", "Please select a PDF file first."); return; }
  const picked = [...organizeSelected].filter((k) => organizePages[k] && !organizePages[k].blank).sort((a, b) => a - b);
  if (!picked.length) { setError("organizeStatus", "Tick Select on at least one page thumbnail first. Blank pages cannot be extracted on their own."); return; }
  try {
    const src = await loadPdfLibDoc(file, "organizeStatus");
    if (!src) return;
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, picked.map((k) => organizePages[k].index));
    pages.forEach((pg, i) => { if (organizePages[picked[i]].rotation) pg.setRotation(window.PDFLib.degrees(organizePages[picked[i]].rotation)); out.addPage(pg); });
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-selected-pages.pdf");
    setStatus("organizeStatus", "Done. " + picked.length + " selected page(s) downloaded as a new PDF.");
  } catch (e) { setError("organizeStatus", "Could not extract those pages. Please check the file."); }
});
/* Wrap text to a width using a pdf-lib font. Pure, unit-testable. */
