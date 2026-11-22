/* AK Premium v12 — merge-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const mergeInput = $("mergeInput");
if (mergeInput) mergeInput.addEventListener("change", async () => {
  // Accumulate: files picked later join the list instead of replacing it.
  // The input is cleared after reading, so the reorder handler's synthetic
  // change event appends nothing and only re-renders the thumbnails.
  const picked = Array.from(mergeInput.files || []);
  for (const file of picked) {
    const dup = mergeOrder.some((e) => e.file.name === file.name && e.file.size === file.size && e.file.lastModified === file.lastModified);
    if (!dup) mergeOrder.push({ file, ranges: "", rotate: 0 });
  }
  mergeInput.value = "";
  // The button reflects the real list, not the (cleared) file input: enabled
  // once two or more files are listed, including after a drag reorder.
  const mergeBtn = $("mergePdfBtn"); if (mergeBtn) mergeBtn.disabled = mergeOrder.length < 2;
  const list = $("mergeList"); if (!list) return;
  list.innerHTML = "";
  if (!(await ensurePdfJs("mergePdfStatus"))) return;
  for (let idx = 0; idx < mergeOrder.length; idx++) {
    const entry = mergeOrder[idx];
    const file = entry.file;
    const item = document.createElement("div");
    item.className = "thumb"; item.draggable = true; item.dataset.idx = idx;
    item.innerHTML = "<strong>" + String(idx + 1).padStart(2, "0") + ". " + file.name.replace(/</g, "&lt;") + "</strong><br>" + humanBytes(file.size)
      + "<br><label>Pages <input type=\"text\" class=\"merge-ranges\" data-idx=\"" + idx + "\" placeholder=\"All pages, e.g. 1-3, 5\" value=\"" + String(entry.ranges || "").replace(/"/g, "&quot;") + "\"></label>"
      + " <label>Rotate <select class=\"merge-rotate\" data-idx=\"" + idx + "\">"
      + "<option value=\"0\"" + (entry.rotate === 0 ? " selected" : "") + ">No rotation</option>"
      + "<option value=\"90\"" + (entry.rotate === 90 ? " selected" : "") + ">90&deg;</option>"
      + "<option value=\"180\"" + (entry.rotate === 180 ? " selected" : "") + ">180&deg;</option>"
      + "<option value=\"270\"" + (entry.rotate === 270 ? " selected" : "") + ">270&deg;</option></select></label>";
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
/* Per-file choices are stored on the entries, so a re-render (after a drag
   reorder) keeps what the user typed. Attached once; the container survives
   innerHTML re-renders. */

const mergeListEl = $("mergeList");
if (mergeListEl && !mergeListEl.dataset.bound) {
  mergeListEl.dataset.bound = "1";
  mergeListEl.addEventListener("input", (e) => {
    const idx = parseInt(e.target.dataset.idx, 10);
    if (isNaN(idx) || !mergeOrder[idx]) return;
    if (e.target.classList.contains("merge-ranges")) mergeOrder[idx].ranges = e.target.value;
  });
  mergeListEl.addEventListener("change", (e) => {
    const idx = parseInt(e.target.dataset.idx, 10);
    if (isNaN(idx) || !mergeOrder[idx]) return;
    if (e.target.classList.contains("merge-rotate")) mergeOrder[idx].rotate = parseInt(e.target.value, 10) || 0;
  });
}

const mergePdfBtn = $("mergePdfBtn");
if (mergePdfBtn) mergePdfBtn.addEventListener("click", async () => {
  const entries = mergeOrder.length ? mergeOrder : Array.from(($("mergeInput") || { files: [] }).files || []).map((f) => ({ file: f, ranges: "", rotate: 0 }));
  if (entries.length < 2) { setError("mergePdfStatus", "Please select at least two PDF files to merge."); return; }
  if (!entries.every((e) => checkFileSize(e.file, "mergePdfStatus"))) return;
  if (!needLibrary(!!window.PDFLib, "pdf-lib", "mergePdfStatus")) return;
  const blanks = Math.max(0, Math.min(5, parseInt(($("mergeBlanks") || { value: "0" }).value, 10) || 0));
  try {
    const out = await window.PDFLib.PDFDocument.create();
    let mergedOutline = [];
    let outlineFiles = 0;
    let rotatedFiles = 0;
    let totalPages = 0;
    for (let fi = 0; fi < entries.length; fi++) {
      const entry = entries[fi];
      const src = await loadPdfLibDoc(entry.file, "mergePdfStatus");
      if (!src) return;
      const count = src.getPageCount();
      const parsed = parsePageList(entry.ranges, count);
      if (parsed.error) { setError("mergePdfStatus", entry.file.name + ": " + parsed.error); return; }
      const copied = await out.copyPages(src, parsed.pages);
      copied.forEach((p) => {
        if (entry.rotate) {
          const cur = p.getRotation().angle || 0;
          p.setRotation(window.PDFLib.degrees((cur + entry.rotate) % 360));
        }
        out.addPage(p);
      });
      if (entry.rotate) rotatedFiles++;
      totalPages += copied.length;
      // Bookmarks: remap each source bookmark to its copied page. A
      // bookmark whose page was not picked is dropped and its children
      // are promoted to its place.
      try {
        const outline = readPdfOutline(src);
        if (outline.length) outlineFiles++;
        const remap = (nodes) => {
          const res = [];
          for (const n of nodes) {
            const pos = parsed.pages.indexOf(n.pageIndex);
            const kids = remap(n.children || []);
            if (pos === -1) { res.push.apply(res, kids); continue; }
            res.push({ title: n.title, pageRef: copied[pos].ref, children: kids });
          }
          return res;
        };
        mergedOutline = mergedOutline.concat(remap(outline));
      } catch (e) { /* an unreadable outline never breaks the merge */ }
      // Blank pages between files, sized like the last page just added.
      if (blanks > 0 && fi < entries.length - 1 && copied.length) {
        const { width, height } = copied[copied.length - 1].getSize();
        for (let b = 0; b < blanks; b++) out.addPage([width, height]);
        totalPages += blanks;
      }
    }
    if (mergedOutline.length) {
      try { buildPdfOutline(out, mergedOutline); } catch (e) { /* outline is a bonus */ }
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-merged.pdf");
    let note = "Done. Merged " + entries.length + " PDFs into " + totalPages + " page(s) in the order shown above.";
    if (rotatedFiles) note += " " + rotatedFiles + " file(s) rotated.";
    if (mergedOutline.length) note += " Bookmarks from " + outlineFiles + " file(s) were kept.";
    setStatus("mergePdfStatus", note);
  } catch (e) { if (!setPdfError("mergePdfStatus", e)) setError("mergePdfStatus", "Could not merge these PDFs. Please check that every file is a valid PDF."); }
});

/* Show only the inputs for the chosen split mode. */
