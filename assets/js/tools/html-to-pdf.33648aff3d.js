/* AK Premium v12 — html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

function sanitizeHtmlForPdf(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(html || ""), "text/html");
  parsed.querySelectorAll("script, link, base, meta, iframe, object, embed, noscript, template").forEach((el) => el.remove());
  parsed.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes || []).forEach((attr) => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      else if ((attr.name === "href" || attr.name === "src") && /^\s*javascript:/i.test(attr.value || "")) el.removeAttribute(attr.name);
    });
  });
  // Keep <style> blocks from the head too: a saved page usually keeps
  // its CSS there, and html2canvas needs it to render headings, bold
  // text and tables. A <style> inside the body comes back with the body.
  const headStyles = parsed.head ? Array.from(parsed.head.querySelectorAll("style")).map((s) => s.outerHTML).join("") : "";
  return headStyles + (parsed.body ? parsed.body.innerHTML : "");
}

/* Render cleaned HTML to a real PDF with html2canvas + jsPDF: headings,
   bold, tables and embedded (data:) images are drawn as they look, then
   the pages are cut to A4 or Letter. Links in the HTML become clickable
   link annotations (added with pdf-lib afterwards). opts: {font (CSS font
   stack), fontSize (px), pageSize "a4"|"letter"}.
   When html2canvas cannot load or the render fails, the tool falls back
   to the old plain-text conversion and says so honestly instead of
   failing. External (http) images are not fetched, so they may be
   skipped; pictures must be embedded in the HTML file to appear. */

async function htmlToPdfRendered(html, opts, statusId) {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", statusId)) return;
  const o = Object.assign({ font: "Arial, Helvetica, sans-serif", fontSize: 14, pageSize: "a4" }, opts || {});
  const clean = sanitizeHtmlForPdf(html);
  if (!clean.trim()) { setError(statusId, "This HTML has no readable content. Nothing to convert."); return; }
  if (!window.html2canvas) {
    const ok = await loadLibrary("html2canvas", statusId);
    if (!ok || !window.html2canvas) {
      textToPdf(clean, statusId, "ak-premium-html-to-pdf.pdf");
      setStatus(statusId, "The rendered converter could not load, so this PDF is plain text instead of a rendered page. Check your connection and try again for the full layout.");
      return;
    }
  }
  const pageSizes = { a4: [595.28, 841.89, 794], letter: [612, 792, 816] };
  const ps = pageSizes[o.pageSize] || pageSizes.a4;
  const pageW = ps[0], pageH = ps[1], containerW = ps[2];
  const margin = 36;
  setStatus(statusId, "Rendering HTML to PDF…");
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-10000px;top:0;width:" + containerW + "px;background:#ffffff;color:#111827;font-family:" + o.font + ";font-size:" + o.fontSize + "px;line-height:1.5;padding:0;margin:0;";
  container.innerHTML = clean;
  document.body.appendChild(container);
  try {
    const canvas = await window.html2canvas(container, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: false });
    // Link positions, measured before the container is removed.
    const pxPerPt = canvas.width / containerW;
    const pagePx = (pageH - margin * 2) * pxPerPt;
    const links = [];
    const cRect = container.getBoundingClientRect();
    container.querySelectorAll("a[href]").forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!/^(https?:|mailto:)/i.test(href)) return;
      const r = a.getBoundingClientRect();
      if (!r.width || !r.height) return;
      links.push({ href, x: r.left - cRect.left, y: r.top - cRect.top, w: r.width, h: r.height });
    });
    const doc = new JsPDF({ unit: "pt", format: o.pageSize });
    const usableW = pageW - margin * 2;
    const pages = Math.max(1, Math.ceil(canvas.height / pagePx));
    for (let i = 0; i < pages; i++) {
      if (i > 0) doc.addPage(o.pageSize);
      const slice = document.createElement("canvas");
      slice.width = canvas.width; slice.height = Math.min(pagePx, canvas.height - i * pagePx);
      if (slice.height <= 0) break;
      slice.getContext("2d").drawImage(canvas, 0, i * pagePx, canvas.width, slice.height, 0, 0, slice.width, slice.height);
      const sliceHpt = slice.height / pxPerPt;
      doc.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, usableW, sliceHpt);
    }
    let bytes = doc.output("arraybuffer");
    let linkCount = 0;
    if (links.length && window.PDFLib) {
      try {
        const P = window.PDFLib.PDFName;
        const pdf = await window.PDFLib.PDFDocument.load(bytes);
        for (const l of links) {
          const pageIdx = Math.floor(l.y / pagePx);
          if (pageIdx < 0 || pageIdx >= pdf.getPageCount()) continue;
          const page = pdf.getPage(pageIdx);
          const yInPage = l.y - pageIdx * pagePx;
          const x0 = margin + l.x / pxPerPt, yTop = margin + yInPage / pxPerPt;
          const wPt = l.w / pxPerPt, hPt = Math.max(4, l.h / pxPerPt);
          const rect = [x0, pageH - yTop - hPt, x0 + wPt, pageH - yTop];
          const annot = pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: rect, Border: [0, 0, 0], A: { S: "URI", URI: l.href } });
          let annots = page.node.Annots();
          if (!annots) { page.node.set(P.of("Annots"), pdf.context.obj([])); annots = page.node.Annots(); }
          annots.push(pdf.context.register(annot));
          linkCount++;
        }
        bytes = await pdf.save();
      } catch (e) { /* links are a bonus: the rendered PDF still downloads without them */ }
    }
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-html-to-pdf.pdf");
    setStatus(statusId, "Done. PDF downloaded (" + pages + " page(s)" + (linkCount ? ", " + linkCount + " clickable link(s) kept" : ", no clickable links found") + ").");
  } catch (e) {
    // Render failed (a page html2canvas cannot draw, an image it cannot
    // read): fall back to plain text rather than failing outright.
    textToPdf(clean, statusId, "ak-premium-html-to-pdf.pdf");
    setStatus(statusId, "This page could not be rendered as it looks, so the PDF is plain text instead. Try a simpler saved page for the full layout.");
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}

const htmlToPdfBtn = $("htmlToPdfBtn");
if (htmlToPdfBtn) htmlToPdfBtn.addEventListener("click", async () => {
  const pasted = ($("htmlPaste") && $("htmlPaste").value || "").trim();
  const file = ($("htmlToPdfInput").files || [])[0];
  if (!pasted && !file) { setError("htmlToPdfStatus", "Paste some HTML or choose an HTML file first."); return; }
  if (file && !checkFileSize(file, "htmlToPdfStatus")) return;
  const font = $("htmlFont") ? $("htmlFont").value : "Arial, Helvetica, sans-serif";
  const fontSize = $("htmlFontSize") ? (parseInt($("htmlFontSize").value, 10) || 14) : 14;
  const pageSize = $("htmlPageSize") ? $("htmlPageSize").value : "a4";
  setStatus("htmlToPdfStatus", "Reading HTML…");
  try {
    const raw = pasted || await file.text();
    if (!raw.trim()) { setError("htmlToPdfStatus", "This HTML is empty. Nothing to convert."); return; }
    await htmlToPdfRendered(raw, { font, fontSize, pageSize }, "htmlToPdfStatus");
  } catch (e) { setError("htmlToPdfStatus", "Could not read this HTML. Please check the file."); }
});
