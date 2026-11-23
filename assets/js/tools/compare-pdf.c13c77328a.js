/* AK Premium v12 — compare-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function wordLevelDiff(a, b) {
  const dmp = new window.diff_match_patch();
  const words = (s) => String(s || "").split(/\s+/).filter(Boolean);
  const wa = words(a), wb = words(b);
  const c = dmp.diff_linesToChars_(wa.join("\n"), wb.join("\n"));
  const diffs = dmp.diff_main(c.chars1, c.chars2, false);
  dmp.diff_charsToLines_(diffs, c.lineArray);
  return diffs.map((d) => [d[0], d[1].split("\n").filter(Boolean)]);
}
/* Pixel diff of two same-size ImageData buffers: counts pixels whose
   channels differ by more than 24, plus the bounding box of the changed
   area. Pure, unit-testable. */

function pixelDiff(a, b, w, h) {
  const da = a.data || a, db = b.data || b;
  let diff = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  const n = Math.min(da.length, db.length, w * h * 4);
  for (let i = 0; i + 3 < n; i += 4) {
    if (Math.abs(da[i] - db[i]) > 24 || Math.abs(da[i + 1] - db[i + 1]) > 24 || Math.abs(da[i + 2] - db[i + 2]) > 24) {
      diff++;
      const px = (i / 4) % w, py = Math.floor((i / 4) / w);
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  return { diff, total: w * h, pct: w * h ? (diff / (w * h)) * 100 : 0, box: diff ? { x0, y0, x1, y1 } : null };
}
/* Embedded images from a PDF: [{page, name, blob}] via the operator list
   (same path as Extract Images from PDF). Shared by Repair and PDF to
   Markdown, so it lives in core. */

async function renderPdfPageCanvas(pdf, pageNum, scale) {
  const page = await pdf.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(vp.width));
  canvas.height = Math.max(1, Math.round(vp.height));
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  return canvas;
}
/* Check a qpdf-rebuilt file: does it open, how many pages, and which pages
   still have a text layer. Returns null when the bytes do not open. */

const comparePdfBtn = $("comparePdfBtn");
/* Extra Compare controls: the word-diff view, the visual overlay view and
   the report download button. (Created here, inside the compare chunk.) */
const cmpExtraWrap = document.createElement("div");
cmpExtraWrap.innerHTML = '<div id="cmpDiffView" aria-live="polite"></div><div id="cmpOverlayView" aria-live="polite"></div><button id="cmpReportBtn" type="button" class="btn-secondary" style="display:none">Download diff report</button>';
if (comparePdfBtn && comparePdfBtn.parentNode) comparePdfBtn.parentNode.insertBefore(cmpExtraWrap, comparePdfBtn.nextSibling);
const cmpReportBtn = cmpExtraWrap.querySelector("#cmpReportBtn");
if (cmpReportBtn) cmpReportBtn.addEventListener("click", () => {
  const rep = window.__cmpLastDiff;
  if (!rep) return;
  downloadText(rep.html, "ak-premium-pdf-diff.html", "text/html;charset=utf-8");
});
if (comparePdfBtn) comparePdfBtn.addEventListener("click", async () => {
  const a = ($("compareInputA").files || [])[0], b = ($("compareInputB").files || [])[0];
  if (!a || !b) { setError("comparePdfStatus", "Please select two PDF files."); return; }
  if (!checkFileSize(a, "comparePdfStatus") || !checkFileSize(b, "comparePdfStatus")) return;
  try {
    if (!window.diff_match_patch) { const ok = await loadLibrary("diff-match-patch", "comparePdfStatus"); if (!ok || !window.diff_match_patch) return; }
    if (!(await ensurePdfJs("comparePdfStatus"))) return;
    const pagesA = await extractPdfLines(a, "comparePdfStatus");
    const pagesB = await extractPdfLines(b, "comparePdfStatus");
    if (!pagesA || !pagesB) return;
    const textA = pagesA.map((pg) => pg.lines.map((l) => l.text).join("\n")).join("\n");
    const textB = pagesB.map((pg) => pg.lines.map((l) => l.text).join("\n")).join("\n");
    /* Word-level diff with added/removed highlighting. */
    const diffs = wordLevelDiff(textA, textB);
    let added = 0, removed = 0;
    const html = diffs.map((d) => {
      const t = escapeHtml(d[1].join(" "));
      if (d[0] === 1) { added += d[1].length; return '<ins style="background:#dcfce7;text-decoration:none">' + t + "</ins>"; }
      if (d[0] === -1) { removed += d[1].length; return '<del style="background:#fee2e2">' + t + "</del>"; }
      return t;
    }).join(" ");
    const view = $("cmpDiffView");
    if (view) view.innerHTML = "<h3>Word diff — " + added + " word(s) added, " + removed + " removed</h3><p>" + (html || "(no text in either file)") + "</p>";
    /* Line lists (as before): lines only in one file. */
    const la = new Set(textA.split("\n").map((s) => s.trim()).filter(Boolean));
    const lb = new Set(textB.split("\n").map((s) => s.trim()).filter(Boolean));
    const onlyA = [...la].filter((x) => !lb.has(x));
    const onlyB = [...lb].filter((x) => !la.has(x));
    $("comparePdfOutput").textContent = "Only in first PDF:\n" + (onlyA.join("\n") || "(none)") + "\n\nOnly in second PDF:\n" + (onlyB.join("\n") || "(none)");
    /* Visual overlay diff, page by page (at most 10 pages, half scale). */
    const overlay = $("cmpOverlayView");
    const stats = [];
    let firstDiffPage = 0;
    const pdfA = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(a) }).promise;
    const pdfB = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(b) }).promise;
    const n = Math.min(pdfA.numPages, pdfB.numPages, 10);
    for (let p = 1; p <= n; p++) {
      const ca = await renderPdfPageCanvas(pdfA, p, 0.5);
      const cb = await renderPdfPageCanvas(pdfB, p, 0.5);
      let pct = 0;
      if (ca && cb && ca.width === cb.width && ca.height === cb.height) {
        const ia = ca.getContext("2d").getImageData(0, 0, ca.width, ca.height);
        const ib = cb.getContext("2d").getImageData(0, 0, cb.width, cb.height);
        const d = pixelDiff(ia, ib, ca.width, ca.height);
        pct = d.pct;
        if (pct > 0 && !firstDiffPage) {
          firstDiffPage = p;
          /* Overlay: the first page as-is, differing pixels in red. */
          const oc = document.createElement("canvas");
          oc.width = ca.width; oc.height = ca.height;
          const octx = oc.getContext("2d");
          octx.drawImage(ca, 0, 0);
          const diffImg = octx.createImageData(ca.width, ca.height);
          /* Build the red mask from the two renders directly. */
          const da = ia.data, db = ib.data;
          for (let i = 0; i + 3 < da.length; i += 4) {
            if (Math.abs(da[i] - db[i]) > 24 || Math.abs(da[i + 1] - db[i + 1]) > 24 || Math.abs(da[i + 2] - db[i + 2]) > 24) {
              diffImg.data[i] = 255; diffImg.data[i + 1] = 0; diffImg.data[i + 2] = 0; diffImg.data[i + 3] = 140;
            }
          }
          octx.putImageData(diffImg, 0, 0);
          if (overlay) {
            overlay.innerHTML = "<h3>Visual diff — page " + p + " (red = changed)</h3>";
            overlay.appendChild(oc);
          }
        }
      } else if (ca && cb) {
        pct = -1; /* different page sizes: cannot pixel-compare */
      }
      stats.push({ page: p, pct });
    }
    if (overlay && !firstDiffPage) overlay.innerHTML = "<p>No visual differences on the first " + n + " page(s).</p>";
    const statText = stats.map((s) => "Page " + s.page + ": " + (s.pct < 0 ? "different page size, not compared" : s.pct.toFixed(1) + "% different")).join("\n");
    if (cmpReportBtn) cmpReportBtn.style.display = "";
    window.__cmpLastDiff = { html: "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>PDF comparison — AK Premium</title></head><body><h1>PDF comparison</h1><p>" + added + " word(s) added, " + removed + " removed. First file: " + escapeHtml(a.name) + ". Second file: " + escapeHtml(b.name) + ".</p><h2>Word diff</h2><p>" + html + "</p><h2>Visual diff per page</h2><pre>" + escapeHtml(statText) + "</pre><h2>Only in first PDF</h2><pre>" + escapeHtml(onlyA.join("\n") || "(none)") + "</pre><h2>Only in second PDF</h2><pre>" + escapeHtml(onlyB.join("\n") || "(none)") + "</pre></body></html>" };
    setStatus("comparePdfStatus", "Done. " + added + " word(s) added, " + removed + " removed; " + onlyA.length + " line(s) only in first, " + onlyB.length + " only in second." + (firstDiffPage ? " First visual difference on page " + firstDiffPage + "." : " No visual differences on the compared pages."));
  } catch (e) { if (!setPdfError("comparePdfStatus", e)) setError("comparePdfStatus", "Could not compare these PDFs."); }
});
/* Turn pdf.js layout pages into Markdown: headings from size, lists from
   bullet/number markers, bold/italic from font names, tables from the
   pdf-to-excel grid inference (rows matched by baseline), images as
   ![](image-N.png) links at the end of their page. Pure over
   layout-shaped data, so it is unit-testable. */
