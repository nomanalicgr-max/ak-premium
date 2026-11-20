/* AK Premium v12 — merge-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const mergeInput = $("mergeInput");
if (mergeInput) mergeInput.addEventListener("change", async () => {
  // Accumulate: files picked later join the list instead of replacing it.
  // The input is cleared after reading, so the reorder handler's synthetic
  // change event appends nothing and only re-renders the thumbnails.
  const picked = Array.from(mergeInput.files || []);
  for (const file of picked) {
    const dup = mergeOrder.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
    if (!dup) mergeOrder.push(file);
  }
  mergeInput.value = "";
  const list = $("mergeList"); if (!list) return;
  list.innerHTML = "";
  if (!(await ensurePdfJs("mergePdfStatus"))) return;
  for (let idx = 0; idx < mergeOrder.length; idx++) {
    const file = mergeOrder[idx];
    const item = document.createElement("div");
    item.className = "thumb"; item.draggable = true; item.dataset.idx = idx;
    item.innerHTML = "<strong>" + String(idx + 1).padStart(2, "0") + ". " + file.name.replace(/</g, "&lt;") + "</strong><br>" + humanBytes(file.size);
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 0.35 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      item.prepend(cv);
      const pagesEl = document.createElement("div"); pagesEl.textContent = pdf.numPages + " page(s) — drag to reorder";
      item.appendChild(pagesEl);
    } catch (e) { /* thumbnail is a bonus; merging still works without it */ }
    item.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", idx));
    item.addEventListener("dragover", (e) => e.preventDefault());
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const [moved] = mergeOrder.splice(from, 1); mergeOrder.splice(idx, 0, moved);
      mergeInput.dispatchEvent(new Event("change"));
    });
    list.appendChild(item);
  }
});

const mergePdfBtn = $("mergePdfBtn");
if (mergePdfBtn) mergePdfBtn.addEventListener("click", async () => {
  const files = mergeOrder.length ? mergeOrder : Array.from(($("mergeInput") || { files: [] }).files || []);
  if (files.length < 2) { setError("mergePdfStatus", "Please select at least two PDF files to merge."); return; }
  if (!files.every((f) => checkFileSize(f, "mergePdfStatus"))) return;
  if (!needLibrary(!!window.PDFLib, "pdf-lib", "mergePdfStatus")) return;
  try {
    const out = await window.PDFLib.PDFDocument.create();
    for (const file of files) {
      const src = await loadPdfLibDoc(file, "mergePdfStatus");
      if (!src) return;
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-merged.pdf");
    setStatus("mergePdfStatus", "Done. Merged " + files.length + " PDFs in the order shown above.");
  } catch (e) { if (!setPdfError("mergePdfStatus", e)) setError("mergePdfStatus", "Could not merge these PDFs. Please check that every file is a valid PDF."); }
});
