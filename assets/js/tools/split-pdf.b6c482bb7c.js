/* AK Premium v12 — split-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const splitModeEl = $("splitMode");

function updateSplitRows() {
  // NOTE: reference $("splitMode") literally here, not the splitModeEl const
  // above: the splitter sends a chunk to a tool file only when it touches
  // that tool's ids literally, so closing over the const would strand this
  // function in core.js, which loads before this file and would throw.
  const mode = $("splitMode") ? $("splitMode").value : "range";
  const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? "" : "none"; };
  show("splitRowRanges", mode === "range");
  show("splitRowEveryN", mode === "everyn");
  show("splitRowChunks", mode === "chunks");
  show("splitRowSize", mode === "size");
  show("splitRowBookmarks", mode === "bookmarks");
}
if (splitModeEl) { splitModeEl.addEventListener("change", updateSplitRows); updateSplitRows(); }

const splitPdfBtn = $("splitPdfBtn");
if (splitPdfBtn) splitPdfBtn.addEventListener("click", async () => {
  const file = ($("splitInput").files || [])[0];
  if (!file) { setError("splitPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "splitPdfStatus")) return;
  const mode = $("splitMode") ? $("splitMode").value : "range";
  const rangeText = ($("splitRanges") || { value: "" }).value || "";
  try {
    const src = await loadPdfLibDoc(file, "splitPdfStatus");
    if (!src) return;
    const count = src.getPageCount();
    const savePart = async (indices) => {
      const out = await window.PDFLib.PDFDocument.create();
      const pages = await out.copyPages(src, indices); pages.forEach((pg) => out.addPage(pg));
      return out.save();
    };
    const zipParts = async (parts, zipName) => {
      if (!needLibrary(!!window.JSZip, "JSZip", "splitPdfStatus")) return false;
      const zip = new window.JSZip();
      parts.forEach((p, i) => zip.file(p.name, p.bytes));
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, zipName);
      return true;
    };
    if (mode === "every") {
      if (!needLibrary(!!window.JSZip, "JSZip", "splitPdfStatus")) return;
      const zip = new window.JSZip();
      for (let i = 0; i < count; i++) {
        const out = await window.PDFLib.PDFDocument.create();
        const pages = await out.copyPages(src, [i]); pages.forEach((pg) => out.addPage(pg));
        zip.file("page-" + (i + 1) + ".pdf", await out.save());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "ak-premium-split-pages.zip");
      setStatus("splitPdfStatus", "Done. " + count + " pages extracted as a ZIP file.");
      return;
    }
    if (mode === "bookmarks") {
      const outline = readPdfOutline(src).filter((n) => n.pageIndex >= 0);
      const starts = [];
      for (const n of outline) {
        if (!starts.length || n.pageIndex > starts[starts.length - 1].pageIndex) starts.push(n);
      }
      if (starts.length < 2) { setError("splitPdfStatus", "This PDF has no usable bookmarks (its outline has fewer than two chapters). Try Page ranges instead."); return; }
      const parts = [];
      for (let i = 0; i < starts.length; i++) {
        const from = starts[i].pageIndex;
        const to = i + 1 < starts.length ? starts[i + 1].pageIndex : count;
        if (to <= from) continue;
        const indices = [];
        for (let p = from; p < to; p++) indices.push(p);
        parts.push({ name: splitPartName(starts[i].title, i), bytes: await savePart(indices) });
      }
      if (!parts.length) { setError("splitPdfStatus", "The bookmarks in this PDF do not point at different pages, so no chapters could be split. Try Page ranges instead."); return; }
      if (!(await zipParts(parts, "ak-premium-split-chapters.zip"))) return;
      setStatus("splitPdfStatus", "Done. Split into " + parts.length + " chapter PDFs by bookmark, downloaded as a ZIP file.");
      return;
    }
    if (mode === "everyn") {
      const n = Math.max(1, parseInt(($("splitEveryN") || { value: "5" }).value, 10) || 5);
      const parts = [];
      for (let s = 0; s < count; s += n) {
        const indices = [];
        for (let p = s; p < Math.min(count, s + n); p++) indices.push(p);
        parts.push({ name: "part-" + (parts.length + 1) + ".pdf", bytes: await savePart(indices) });
      }
      if (!(await zipParts(parts, "ak-premium-split-every-" + n + ".zip"))) return;
      setStatus("splitPdfStatus", "Done. Split into " + parts.length + " parts of up to " + n + " page(s), downloaded as a ZIP file.");
      return;
    }
    if (mode === "chunks") {
      const n = Math.max(2, parseInt(($("splitChunks") || { value: "2" }).value, 10) || 2);
      if (n > count) { setError("splitPdfStatus", "Cannot split " + count + " page(s) into " + n + " parts. Choose fewer parts than pages."); return; }
      const parts = [];
      const base = Math.floor(count / n);
      let extra = count % n;
      let at = 0;
      for (let i = 0; i < n; i++) {
        const size = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        const indices = [];
        for (let p = at; p < at + size; p++) indices.push(p);
        at += size;
        parts.push({ name: "part-" + (i + 1) + ".pdf", bytes: await savePart(indices) });
      }
      if (!(await zipParts(parts, "ak-premium-split-parts.zip"))) return;
      setStatus("splitPdfStatus", "Done. Split into " + n + " near-equal parts, downloaded as a ZIP file.");
      return;
    }
    if (mode === "size") {
      const maxMB = parseFloat(($("splitMaxMB") || { value: "5" }).value) || 5;
      if (maxMB < 0.5) { setError("splitPdfStatus", "Please choose at least 0.5 MB per part."); return; }
      const maxBytes = Math.round(maxMB * 1024 * 1024);
      const parts = [];
      let cur = [];
      let oversized = 0;
      const flush = async () => {
        if (!cur.length) return 0;
        const bytes = await savePart(cur);
        parts.push({ name: "part-" + (parts.length + 1) + ".pdf", bytes });
        cur = [];
        return bytes.length;
      };
      for (let i = 0; i < count; i++) {
        cur.push(i);
        // Estimate from the source size; measure for real when close to the limit.
        if (file.size * cur.length / count >= maxBytes * 0.85) {
          const trial = await savePart(cur);
          if (trial.length <= maxBytes) { parts.push({ name: "part-" + (parts.length + 1) + ".pdf", bytes: trial }); cur = []; }
          else if (cur.length === 1) { parts.push({ name: "part-" + (parts.length + 1) + ".pdf", bytes: trial }); cur = []; oversized++; }
          else { cur.pop(); const wasSingle = cur.length === 1; const flushedLen = await flush(); if (wasSingle && flushedLen > maxBytes) oversized++; cur.push(i); }
        }
      }
      await flush();
      if (!(await zipParts(parts, "ak-premium-split-by-size.zip"))) return;
      setStatus("splitPdfStatus", "Done. Split into " + parts.length + " part(s) of up to " + maxMB + " MB, downloaded as a ZIP file." + (oversized ? " " + oversized + " single page(s) were larger than the limit and were kept whole." : ""));
      return;
    }
    /* Parse "1-3, 5, 8-10" into a page list, validating against the real count. */
    const keep = new Set();
    const tokens = rangeText.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) { setError("splitPdfStatus", "Please enter page ranges, for example 1-3, 5, 8-10."); return; }
    for (const token of tokens) {
      if (token.includes("-")) {
        const [a, b] = token.split("-").map((x) => parseInt(x.trim(), 10));
        if (!a || !b || b < a || a < 1 || b > count) { setError("splitPdfStatus", "Range " + token + " is outside 1 to " + count + "."); return; }
        for (let i = a; i <= b; i++) keep.add(i);
      } else {
        const n = parseInt(token, 10);
        if (!n || n < 1 || n > count) { setError("splitPdfStatus", "Page " + token + " is outside 1 to " + count + "."); return; }
        keep.add(n);
      }
    }
    const indices = [...keep].sort((a, b) => a - b).map((n) => n - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, indices); pages.forEach((pg) => out.addPage(pg));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-split.pdf");
    setStatus("splitPdfStatus", "Done. Extracted " + indices.length + " page(s) into one PDF.");
  } catch (e) { if (!setPdfError("splitPdfStatus", e)) setError("splitPdfStatus", "Could not split this PDF. Please check the file and page ranges."); }
});
