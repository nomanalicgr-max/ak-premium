/* AK Premium v12 — pdf-to-markdown (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function pdfLayoutToMarkdown(pages, tables, images) {
  const md = [];
  const tablesByPage = {};
  (tables || []).forEach((tb) => { (tablesByPage[tb.page] = tablesByPage[tb.page] || []).push(tb); });
  const imgsByPage = {};
  (images || []).forEach((im) => { (imgsByPage[im.page] = imgsByPage[im.page] || []).push(im); });
  const isBold = (f) => /bold|black|heavy/i.test(f || "");
  const isItalic = (f) => /italic|oblique/i.test(f || "");
  const renderLine = (line) => {
    const parts = line.items.map((it) => {
      let t = it.str;
      if (isBold(it.font) && isItalic(it.font)) t = "***" + t + "***";
      else if (isBold(it.font)) t = "**" + t + "**";
      else if (isItalic(it.font)) t = "*" + t + "*";
      return t;
    });
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };
  for (const pg of pages) {
    md.push("## Page " + pg.page);
    md.push("");
    const heights = pg.lines.map((l) => Math.max.apply(null, l.items.map((it) => it.h || 12)));
    const medH = heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)] || 12;
    const pageTables = (tablesByPage[pg.page] || []).slice().sort((a, b) => ((a.rowYs && a.rowYs[0]) || 0) - ((b.rowYs && b.rowYs[0]) || 0));
    const consumedYs = [];
    pageTables.forEach((tb) => (tb.rowYs || []).forEach((y) => consumedYs.push(y)));
    const isTableLine = (line) => consumedYs.some((y) => Math.abs(line.y - y) < 4);
    /* Blocks in reading order: lines and tables sorted by baseline. */
    const blocks = pg.lines.map((l) => ({ kind: "line", y: l.y, line: l }));
    pageTables.forEach((tb) => blocks.push({ kind: "table", y: tb.rowYs && tb.rowYs.length ? tb.rowYs[0] : 0, table: tb }));
    blocks.sort((a, b) => b.y - a.y);
    for (const b of blocks) {
      if (b.kind === "line") {
        const line = b.line;
        if (isTableLine(line)) continue;
        const text = renderLine(line);
        if (!text) continue;
        const maxH = Math.max.apply(null, line.items.map((it) => it.h || 12));
        if (line.heading) {
          /* Headings render plain: a heading is already bold, so ** marks
             around it would only add noise to the Markdown. */
          const plain = line.items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
          md.push((maxH >= medH * 1.8 ? "# " : "## ") + plain.replace(/^#+\s*/, ""));
        } else if (/^([•\-*–—]|\d+[.)])\s+/.test(text)) {
          md.push("- " + text.replace(/^([•\-*–—]|\d+[.)])\s+/, ""));
        } else {
          md.push(text);
        }
        md.push("");
      } else {
        const tb = b.table;
        const rows = tb.rows.map((r) => r.map((c) => (c ? String(c.text || "").replace(/\|/g, "\\|").trim() : "")));
        if (!rows.length) continue;
        const cols = tb.cols || Math.max.apply(null, rows.map((r) => r.length));
        const head = rows[0].concat(new Array(Math.max(0, cols - rows[0].length)).fill(""));
        md.push("| " + head.join(" | ") + " |");
        md.push("| " + new Array(cols).fill("---").join(" | ") + " |");
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].concat(new Array(Math.max(0, cols - rows[i].length)).fill(""));
          md.push("| " + row.join(" | ") + " |");
        }
        md.push("");
      }
    }
    (imgsByPage[pg.page] || []).forEach((im) => { md.push("![](" + im.name + ")"); md.push(""); });
  }
  return md.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const pdfmdPdfBtn = $("pdfmdPdfBtn");
/* Extra Markdown controls: include-images checkbox (images go in a ZIP). */
const mdExtraWrap = document.createElement("div");
mdExtraWrap.innerHTML = '<label><input id="mdImagesChk" type="checkbox" checked> Include embedded images (downloads a ZIP with the images as image-N.png files)</label>';
if (pdfmdPdfBtn && pdfmdPdfBtn.parentNode) pdfmdPdfBtn.parentNode.insertBefore(mdExtraWrap, pdfmdPdfBtn);
if (pdfmdPdfBtn) pdfmdPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfmdInput").files || [])[0]; if (!file) { setError("pdfmdPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfmdPdfStatus")) return;
  try {
    setStatus("pdfmdPdfStatus", "Reading the PDF…");
    const layout = await extractPdfLayout(file, "pdfmdPdfStatus"); if (!layout) return;
    const tablePages = await extractPdfTableItems(file, "pdfmdPdfStatus");
    const tables = tablePages ? detectPdfTables(tablePages) : [];
    const includeImages = !!($("mdImagesChk") && $("mdImagesChk").checked);
    let images = [];
    if (includeImages) images = (await extractPdfImages(file, "pdfmdPdfStatus")) || [];
    const md = pdfLayoutToMarkdown(layout, tables, images);
    if (!md.trim()) { setError("pdfmdPdfStatus", "No text was found in this PDF. If it is a scan, run OCR PDF first."); return; }
    if (images.length) {
      if (!window.JSZip) { const ok = await loadLibrary("jszip", "pdfmdPdfStatus"); if (!ok || !window.JSZip) { downloadText(md, "ak-premium-document.md", "text/markdown;charset=utf-8"); setStatus("pdfmdPdfStatus", "Done. Markdown downloaded, but the images could not be zipped (JSZip did not load). The image links in the file point to files that were not downloaded."); return; } }
      const zip = new window.JSZip();
      zip.file("document.md", md);
      for (const im of images) zip.file(im.name, im.blob);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "ak-premium-document.zip");
      setStatus("pdfmdPdfStatus", "Done. Markdown + " + images.length + " image(s) downloaded as a ZIP (" + tables.length + " table(s) converted).");
    } else {
      downloadText(md, "ak-premium-document.md", "text/markdown;charset=utf-8");
      setStatus("pdfmdPdfStatus", "Done. Markdown file downloaded (" + tables.length + " table(s) converted).");
    }
  } catch (e) { if (!setPdfError("pdfmdPdfStatus", e)) setError("pdfmdPdfStatus", "Could not convert this PDF to Markdown."); }
});
