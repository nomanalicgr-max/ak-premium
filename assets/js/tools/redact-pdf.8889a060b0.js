/* AK Premium v12 — redact-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

function vectorBlankText(doc, pageIndex, needle) {
  try {
    const PDFLib = window.PDFLib;
    const page = doc.getPage(pageIndex);
    const contents = page.node.get(PDFLib.PDFName.of("Contents"));
    if (!contents) return 0;
    const ctx = doc.context;
    const streams = [];
    const raw = ctx.lookup(contents);
    /* NOTE: do not test raw.constructor.name — the pdf-lib build is minified
       (constructor names are single letters). instanceof works, and the
       size/get methods are a duck-type fallback. */
    const isArray = (raw instanceof PDFLib.PDFArray) || (raw && typeof raw.size === "function" && typeof raw.get === "function");
    if (isArray) {
      for (let i = 0; i < raw.size(); i++) { const s = ctx.lookup(raw.get(i)); if (s) streams.push(s); }
    } else if (raw) {
      streams.push(raw);
    }
    const needleBytes = new TextEncoder().encode(needle);
    if (!needleBytes.length) return 0;
    /* Keep the original Contents shape: a single ref stays a single ref,
       an array of refs stays an array (only replaced entries change). */
    const contentsIsArray = isArray;
    const entryRefs = [];
    if (contentsIsArray) { for (let i = 0; i < raw.size(); i++) entryRefs.push(raw.get(i)); }
    else entryRefs.push(contents);
    const newEntries = [];
    let replaced = 0;
    for (let s = 0; s < streams.length; s++) {
      const stream = streams[s];
      if (!stream.getContents) { newEntries.push(entryRefs[s]); continue; }
      /* Decode the stream first: getContents() returns the stored bytes,
         which are usually Flate-compressed, so the needle never appears in
         them. Fall back to the raw bytes if decoding fails. */
      let bytes = null;
      try {
        if (PDFLib.decodePDFRawStream) {
          const dec = PDFLib.decodePDFRawStream(stream);
          if (dec) {
            if (typeof dec.getBytes === "function") bytes = dec.getBytes();
            else if (typeof dec.getByte === "function") {
              const arr = []; let b;
              while ((b = dec.getByte()) !== -1) arr.push(b);
              bytes = new Uint8Array(arr);
            }
          }
        }
      } catch (e) { bytes = null; }
      if (!bytes) bytes = stream.getContents();
      const out = new Uint8Array(bytes);
      /* BT...ET spans only. */
      const text = new TextDecoder("latin1").decode(bytes);
      const spans = [];
      const re = /BT([\s\S]*?)ET/g;
      let m;
      while ((m = re.exec(text)) !== null) spans.push([m.index, m.index + m[0].length]);
      if (!spans.length) { newEntries.push(entryRefs[s]); continue; }
      /* Hex strings <...>: pdf-lib and many producers store text as hex, so
         the needle never appears as literal bytes. Collect their ranges so
         the literal search below skips them, and blank matches inside them
         by rewriting the hex digits to "20" (a space, same length, still
         valid hex). */
      const hexRanges = [];
      const hexRe = /<([0-9A-Fa-f\s]+)>/g;
      let hm;
      while ((hm = hexRe.exec(text)) !== null) hexRanges.push([hm.index, hm.index + hm[0].length, hm[1]]);
      const inHex = (pos) => hexRanges.some(([a, b]) => pos >= a && pos < b);
      let replacedHere = 0;
      for (let i = 0; i + needleBytes.length <= bytes.length; i++) {
        let ok = true;
        for (let j = 0; j < needleBytes.length; j++) { if (bytes[i + j] !== needleBytes[j]) { ok = false; break; } }
        if (!ok) continue;
        if (inHex(i)) continue; /* handled by the hex pass below */
        const inText = spans.some(([a, b]) => i >= a && i + needleBytes.length <= b);
        if (!inText) continue;
        for (let j = 0; j < needleBytes.length; j++) out[i + j] = 0x20;
        replacedHere++;
        i += needleBytes.length - 1;
      }
      for (const [hs, he, hexBody] of hexRanges) {
        if (!spans.some(([a, b]) => hs >= a && he <= b)) continue;
        const digitPos = [];
        for (let ci = 0; ci < hexBody.length; ci++) {
          if (/[0-9A-Fa-f]/.test(hexBody[ci])) digitPos.push(hs + 1 + ci);
        }
        if (digitPos.length < 2) continue;
        const hexBytes = [];
        for (let di = 0; di + 1 < digitPos.length; di += 2) {
          hexBytes.push(parseInt(text[digitPos[di]] + text[digitPos[di + 1]], 16));
        }
        for (let bi = 0; bi + needleBytes.length <= hexBytes.length; bi++) {
          let ok = true;
          for (let j = 0; j < needleBytes.length; j++) { if (hexBytes[bi + j] !== needleBytes[j]) { ok = false; break; } }
          if (!ok) continue;
          for (let j = 0; j < needleBytes.length; j++) {
            const p0 = digitPos[(bi + j) * 2], p1 = digitPos[(bi + j) * 2 + 1];
            out[p0] = 0x32; out[p1] = 0x30; /* "20" = space */
          }
          replacedHere++;
          bi += needleBytes.length - 1;
        }
      }
      if (replacedHere) { replaced += replacedHere; newEntries.push(ctx.flateStream(out)); }
      else newEntries.push(entryRefs[s]);
    }
    if (replaced) {
      if (newEntries.length === 1) {
        page.node.set(PDFLib.PDFName.of("Contents"), newEntries[0]);
      } else {
        const arr = PDFLib.PDFArray.withContext(ctx);
        newEntries.forEach((e) => arr.push(e));
        page.node.set(PDFLib.PDFName.of("Contents"), arr);
      }
    }
    return replaced;
  } catch (e) { return 0; }
}
/* Extra Redact controls, built once and placed before the Redact button. */
const rdExtraWrap = document.createElement("div");
rdExtraWrap.innerHTML = '<label>What to redact <select id="rdPattern"><option value="custom" selected>Exact text (type it below)</option><option value="email">Email addresses</option><option value="phone">Phone numbers</option><option value="cnic">CNIC / ID numbers (35202-1234567-1)</option><option value="iban">IBAN / bank account numbers</option><option value="date">Dates</option></select></label>'
  + ' <label><input id="rdOcr" type="checkbox"> Also check scanned pages (OCR — slower)</label>';

const redactPdfBtnEl = $("redactPdfBtn");
if (redactPdfBtnEl && redactPdfBtnEl.parentNode) redactPdfBtnEl.parentNode.insertBefore(rdExtraWrap, redactPdfBtnEl);

const rdPatternSel = $("rdPattern");
if (rdPatternSel) rdPatternSel.addEventListener("change", () => {
  const box = $("redactText"); if (box) box.disabled = rdPatternSel.value !== "custom";
});

const redactPdfBtn = $("redactPdfBtn");
if (redactPdfBtn) redactPdfBtn.addEventListener("click", async () => {
  const file = ($("redactInput").files || [])[0];
  const pattern = ($("rdPattern") || { value: "custom" }).value || "custom";
  const needle = ($("redactText").value || "").trim();
  const useOcr = !!($("rdOcr") && $("rdOcr").checked);
  if (!file) { setError("redactPdfStatus", "Please select a PDF file first."); return; }
  if (pattern === "custom" && !needle) { setError("redactPdfStatus", "Please enter text to redact."); return; }
  const regex = pattern === "custom" ? null : new RegExp(REDACT_PATTERNS[pattern], pattern === "iban" ? "g" : "gi");
  try {
    if (!needLibrary(!!window.pdfjsLib, "pdf.js", "redactPdfStatus")) return;
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file);
    /* pdf.js sends its copy to a Web Worker, which detaches (empties) the
       buffer — pdf-lib then fails with "detached ArrayBuffer". So pdf.js
       gets a copy and pdf-lib keeps the original. */
    const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    /* matches[i] = [{str, item}] for page i (0-based). */
    const matches = [];
    let found = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent();
      const list = [];
      for (const item of content.items) {
        const str = String(item.str || "");
        if (regex) {
          regex.lastIndex = 0;
          let mm;
          while ((mm = regex.exec(str)) !== null) { list.push({ str: mm[0], item }); if (mm[0].length === 0) regex.lastIndex++; }
        } else if (str.toLowerCase().includes(needle.toLowerCase())) {
          list.push({ str: needle, item });
        }
      }
      matches.push(list);
      found += list.length;
    }
    /* OCR pass for scanned pages: only pages with no text-layer match. */
    let ocrFound = 0; const ocrBoxes = {}; /* pageIndex -> [{x, y, w, h} in PDF points] */
    if (useOcr && found === 0) {
      if (!window.Tesseract) {
        const ok = await Promise.race([loadLibrary("tesseract", "redactPdfStatus"), new Promise((r) => setTimeout(() => r(false), 20000))]);
        if (!ok || !window.Tesseract) { setError("redactPdfStatus", "No text was found in the PDF text layer, and the OCR library could not be loaded. Check your connection and try again."); return; }
      }
      setStatus("redactPdfStatus", "No text layer found — running OCR on the pages...");
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        let words = [];
        try {
          const res = await window.Tesseract.recognize(canvas, "eng", { logger: () => {} });
          words = (res && res.data && res.data.words) || [];
        } catch (e) { words = []; }
        const boxes = [];
        for (const w of words) {
          const t = String(w.text || "");
          let hit = false;
          if (regex) { regex.lastIndex = 0; hit = regex.test(t); }
          else hit = t.toLowerCase().includes(needle.toLowerCase());
          if (hit && w.bbox) {
            const p = doc.getPage(i - 1); const { height } = p.getSize();
            boxes.push({ x: w.bbox.x0 / 2, y: height - w.bbox.y1 / 2, w: (w.bbox.x1 - w.bbox.x0) / 2, h: (w.bbox.y1 - w.bbox.y0) / 2 });
          }
        }
        if (boxes.length) { ocrBoxes[i - 1] = boxes; ocrFound += boxes.length; }
      }
      if (!ocrFound) { setError("redactPdfStatus", "That text was not found — not in the text layer and not by OCR. Scanned pages with faint or handwritten text may not be recognised."); return; }
    } else if (!found) {
      setError("redactPdfStatus", "That text was not found in the PDF text layer. Scanned PDFs have no text layer — tick 'Also check scanned pages (OCR)' and try again, or try OCR PDF first.");
      return;
    }
    /* Draw the black boxes on the pdf-lib copy, and try the vector blank. */
    let vectorPages = 0, vectorMatches = 0, rasterPages = 0;
    const pageVectorClean = [];
    for (let i = 0; i < matches.length; i++) {
      if (!matches[i].length) { pageVectorClean.push(false); continue; }
      const page = await pdf.getPage(i + 1); const viewport = page.getViewport({ scale: 1 });
      const p = doc.getPage(i); const { height } = p.getSize();
      let blanked = 0;
      const distinct = [...new Set(matches[i].map((m) => m.str))];
      for (const s of distinct) blanked += vectorBlankText(doc, i, s);
      for (const { str, item } of matches[i]) {
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
        p.drawRectangle({ x: tx[4], y: height - tx[5] - h, width: w, height: h + 2, color: window.PDFLib.rgb(0, 0, 0) });
      }
      const clean = blanked >= distinct.length && distinct.length > 0;
      pageVectorClean.push(clean);
      if (clean) { vectorPages++; vectorMatches += matches[i].length; }
    }
    /* Build the output: vector-clean pages are copied as-is (their text is
       gone from the content stream); every other matched page is rebuilt
       as an image with the black box burned in, so the text cannot be
       selected or copied out of it. Pages without a match are copied
       unchanged. */
    const outDoc = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      const hasTextMatch = (matches[i - 1] || []).length > 0;
      const hasOcrMatch = (ocrBoxes[i - 1] || []).length > 0;
      if (!hasTextMatch && !hasOcrMatch) {
        const [copied] = await outDoc.copyPages(doc, [i - 1]); outDoc.addPage(copied); continue;
      }
      if (hasTextMatch && pageVectorClean[i - 1] && !hasOcrMatch) {
        const [copied] = await outDoc.copyPages(doc, [i - 1]); outDoc.addPage(copied); continue;
      }
      rasterPages++;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (hasTextMatch) {
        const content = await page.getTextContent();
        for (const { item } of matches[i - 1]) {
          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
          ctx.fillStyle = "#000"; ctx.fillRect(tx[4], tx[5] - h, w, h + 2);
        }
      }
      for (const b of (ocrBoxes[i - 1] || [])) {
        ctx.fillStyle = "#000"; ctx.fillRect(b.x * 2, (doc.getPage(i - 1).getSize().height - b.y - b.h) * 2, b.w * 2, b.h * 2);
      }
      const jpg = await outDoc.embedJpg(canvas.toDataURL("image/jpeg", 0.9));
      const { width, height } = doc.getPage(i - 1).getSize();
      const pg = outDoc.addPage([width, height]);
      pg.drawImage(jpg, { x: 0, y: 0, width, height });
    }
    const out = await outDoc.save(); downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-redacted.pdf");
    let note = "Done. Redacted " + (found + ocrFound) + " match(es) on " + (matches.filter((m) => m.length).length + Object.keys(ocrBoxes).length) + " page(s).";
    if (vectorPages) note += " " + vectorMatches + " match(es) on " + vectorPages + " page(s) were removed from the text itself, so those pages keep their text layer.";
    if (rasterPages) note += " " + rasterPages + " page(s) are now images with no text layer, so the covered text cannot be copied.";
    note += " Check the result before sharing sensitive files.";
    setStatus("redactPdfStatus", note);
  } catch (e) { if (!setPdfError("redactPdfStatus", e)) setError("redactPdfStatus", "Could not redact this PDF. (" + (e && e.message ? e.message : "unknown error") + ")"); }
});
