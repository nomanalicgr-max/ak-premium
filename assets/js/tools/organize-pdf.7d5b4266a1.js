/* AK Premium v12 — organize-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: PDF ---------- */

const organizeInput = $("organizeInput");
if (organizeInput) organizeInput.addEventListener("change", async () => {
  const file = (organizeInput.files || [])[0]; const list = $("organizeList"); if (!file || !list) return;
  list.innerHTML = "";
  if (!(await ensurePdfJs("organizeStatus"))) return;
  const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
  organizePages = Array.from({ length: pdf.numPages }, (_, i) => ({ index: i, rotation: 0 }));
  for (let k = 0; k < organizePages.length; k++) {
    const pg = organizePages[k];
    const item = document.createElement("div"); item.className = "thumb"; item.draggable = true;
    const page = await pdf.getPage(pg.index + 1);
    const vp = page.getViewport({ scale: 0.35 });
    const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
    item.appendChild(cv);
    const label = document.createElement("div"); label.textContent = "Page " + (pg.index + 1) + (pg.rotation ? " (" + pg.rotation + " deg)" : "");
    item.appendChild(label);
    const rot = document.createElement("button"); rot.type = "button"; rot.className = "btn-secondary"; rot.textContent = "Rotate 90";
    rot.addEventListener("click", () => { pg.rotation = (pg.rotation + 90) % 360; label.textContent = "Page " + (pg.index + 1) + " (" + pg.rotation + " deg)"; });
    const del = document.createElement("button"); del.type = "button"; del.className = "btn-secondary"; del.textContent = "Delete";
    del.addEventListener("click", () => { organizePages.splice(k, 1); organizeInput.dispatchEvent(new Event("change")); });
    item.appendChild(rot); item.appendChild(del);
    item.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", k));
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData("text/plain"), 10); const [m] = organizePages.splice(from, 1); organizePages.splice(k, 0, m); organizeInput.dispatchEvent(new Event("change")); });
    list.appendChild(item);
  }
  setStatus("organizeStatus", pdf.numPages + " page(s) loaded. Drag to reorder, rotate or delete, then download.");
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
      order = parsed.order.map((n) => ({ index: n - 1, rotation: 0 }));
    }
    if (!order.length) { setError("organizeStatus", "You deleted every page. Keep at least one page."); return; }
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, order.map((o) => o.index));
    pages.forEach((pg, i) => { if (order[i].rotation) pg.setRotation(window.PDFLib.degrees(order[i].rotation)); out.addPage(pg); });
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-organized.pdf");
    setStatus("organizeStatus", "Done. Organized PDF downloaded with " + order.length + " page(s).");
  } catch (e) { setError("organizeStatus", "Could not reorder this PDF. Please check the file and order."); }
});
