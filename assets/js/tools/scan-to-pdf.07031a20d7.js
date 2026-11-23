/* AK Premium v12 — scan-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

const scanPdfBtn = $("scanPdfBtn");
/* Extra Scan controls: fix-up, OCR text layer, OCR language, cancel. */
const scExtraWrap = document.createElement("div");
scExtraWrap.innerHTML = '<label><input id="scFixChk" type="checkbox" checked> Straighten and trim each photo (auto-crop the page edges, fix a small tilt)</label><br>'
  + '<label><input id="scOcrChk" type="checkbox"> Add an OCR text layer so the PDF is searchable</label> '
  + '<label>OCR language <select id="scOcrLang"><option value="eng" selected>English</option><option value="urd">Urdu</option><option value="ara">Arabic</option><option value="hin">Hindi</option><option value="eng+urd">English + Urdu</option><option value="eng+ara">English + Arabic</option><option value="auto">Auto (detect script)</option></select></label><br>'
  + '<button id="scCancelBtn" type="button" class="btn-secondary" style="display:none">Cancel</button>';
if (scanPdfBtn && scanPdfBtn.parentNode) scanPdfBtn.parentNode.insertBefore(scExtraWrap, scanPdfBtn);
const scCancelBtn = scExtraWrap.querySelector("#scCancelBtn");
if (scCancelBtn) scCancelBtn.addEventListener("click", () => { window.__scanCancel = true; });
if (scanPdfBtn) scanPdfBtn.addEventListener("click", async () => {
  const files = Array.from(($("scanInput").files || []));
  if (!files.length) { setError("scanPdfStatus", "Please select a photo first."); return; }
  if (!files.every((f) => checkFileSize(f, "scanPdfStatus"))) return;
  const fixUp = !!($("scFixChk") && $("scFixChk").checked);
  const useOcr = !!($("scOcrChk") && $("scOcrChk").checked);
  let ocrLang = ($("scOcrLang") || { value: "eng" }).value || "eng";
  window.__scanCancel = false;
  if (scCancelBtn) scCancelBtn.style.display = "";
  try {
    let outDoc = null, jsDoc = null, jsFirst = true;
    if (useOcr) {
      if (!window.Tesseract) { const ok = await loadLibrary("tesseract", "scanPdfStatus"); if (!ok || !window.Tesseract) { if (scCancelBtn) scCancelBtn.style.display = "none"; return; } }
      if (!needLibrary(!!window.PDFLib, "pdf-lib", "scanPdfStatus")) { if (scCancelBtn) scCancelBtn.style.display = "none"; return; }
      outDoc = await window.PDFLib.PDFDocument.create();
    } else {
      const JsPDF = getJsPdf(); if (!JsPDF) { setError("scanPdfStatus", "jsPDF did not load."); if (scCancelBtn) scCancelBtn.style.display = "none"; return; }
      jsDoc = new JsPDF();
    }
    const notes = [];
    for (let fi = 0; fi < files.length; fi++) {
      if (window.__scanCancel) { setStatus("scanPdfStatus", "Cancelled after " + fi + " of " + files.length + " photo(s). No file was downloaded."); if (scCancelBtn) scCancelBtn.style.display = "none"; return; }
      const file = files[fi];
      setStatus("scanPdfStatus", "Photo " + (fi + 1) + " of " + files.length + "…");
      let img;
      try {
        const url = URL.createObjectURL(file);
        img = new Image(); img.src = url; await img.decode();
        URL.revokeObjectURL(url);
      } catch (e) { notes.push(file.name + ": could not be read as an image (HEIC photos are not supported in the browser)"); continue; }
      let canvas = document.createElement("canvas");
      const cap = 1600;
      const capScale = Math.min(1, cap / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * capScale));
      canvas.height = Math.max(1, Math.round(img.height * capScale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let fixedNote = "";
      if (fixUp) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const box = inkBBoxFromImageData(imgData);
          if (box) {
            /* Auto-crop to the ink, with a small white border kept. */
            const pad = 8;
            const cx0 = Math.max(0, box.x0 - pad), cy0 = Math.max(0, box.y0 - pad);
            const cw = Math.min(canvas.width - cx0, box.x1 - box.x0 + pad * 2 + 1);
            const ch = Math.min(canvas.height - cy0, box.y1 - box.y0 + pad * 2 + 1);
            const cropped = document.createElement("canvas");
            cropped.width = Math.max(1, cw); cropped.height = Math.max(1, ch);
            cropped.getContext("2d").drawImage(canvas, cx0, cy0, cw, ch, 0, 0, cw, ch);
            canvas = cropped;
            fixedNote += "trimmed";
          }
          /* Deskew on a downscaled copy (same correction-angle code as Rotate PDF). */
          const dw = Math.min(canvas.width, 600);
          const dh = Math.max(1, Math.round(canvas.height * (dw / canvas.width)));
          const dc = document.createElement("canvas"); dc.width = dw; dc.height = dh;
          dc.getContext("2d").drawImage(canvas, 0, 0, dw, dh);
          const dData = dc.getContext("2d").getImageData(0, 0, dw, dh);
          const dark = new Uint8Array(dw * dh);
          let n = 0;
          for (let p = 0; p < dark.length; p++) {
            const lum = (dData.data[p * 4] + dData.data[p * 4 + 1] + dData.data[p * 4 + 2]) / 3;
            if (lum < 128) { dark[p] = 1; n++; }
          }
          if (n > 20) {
            const angle = deskewBestAngle(dark, dw, dh);
            if (angle && Math.abs(angle) >= 0.5) {
              const rad = angle * Math.PI / 180, cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
              const rw = Math.ceil(canvas.width * cos + canvas.height * sin);
              const rh = Math.ceil(canvas.width * sin + canvas.height * cos);
              const rotated = document.createElement("canvas"); rotated.width = rw; rotated.height = rh;
              const rctx = rotated.getContext("2d");
              rctx.fillStyle = "#fff"; rctx.fillRect(0, 0, rw, rh);
              rctx.translate(rw / 2, rh / 2); rctx.rotate(rad); rctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
              canvas = rotated;
              fixedNote += (fixedNote ? ", " : "") + "straightened " + Math.abs(angle).toFixed(1) + "°";
            }
          }
        } catch (e) { /* fix-up is a bonus; the photo still goes in as-is */ }
      }
      if (useOcr) {
        let lang = ocrLang;
        if (lang === "auto") {
          try {
            const det = await window.Tesseract.detect(canvas);
            const script = det && det.data ? det.data.script : "";
            lang = script === "Arabic" ? "ara" : script === "Devanagari" ? "hin" : "eng";
          } catch (e) { lang = "eng"; }
        }
        const res = await window.Tesseract.recognize(canvas, lang, { logger: () => {} });
        const jpgBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.85));
        const jpg = await outDoc.embedJpg(jpgBytes);
        const scale = Math.min(595 / canvas.width, 842 / canvas.height);
        const pw = canvas.width * scale, ph = canvas.height * scale;
        const page = outDoc.addPage([pw, ph]);
        page.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
        const font = await outDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
        let words = 0;
        for (const w of (res.data.words || [])) {
          if (!(w.text || "").trim()) continue;
          const x = (w.bbox.x0 / canvas.width) * pw;
          const yTop = (w.bbox.y0 / canvas.height) * ph;
          const h = Math.max(4, ((w.bbox.y1 - w.bbox.y0) / canvas.height) * ph);
          page.drawText(w.text, { x, y: ph - yTop - h, size: h, font, opacity: 0 });
          words++;
        }
        notes.push("Photo " + (fi + 1) + " (" + file.name + "): page added" + (fixedNote ? " (" + fixedNote + ")" : "") + ", " + words + " OCR word(s) in the text layer (" + lang + ")");
      } else {
        const pageW = jsDoc.internal.pageSize.getWidth(), pageH = jsDoc.internal.pageSize.getHeight();
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio, h = canvas.height * ratio;
        if (!jsFirst) jsDoc.addPage();
        jsFirst = false;
        jsDoc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
        notes.push("Photo " + (fi + 1) + " (" + file.name + "): page added" + (fixedNote ? " (" + fixedNote + ")" : ""));
      }
    }
    if (scCancelBtn) scCancelBtn.style.display = "none";
    if (useOcr) {
      const bytes = await outDoc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-scan.pdf");
      setStatus("scanPdfStatus", "Done. Searchable scan PDF downloaded (" + files.length + " photo(s)). " + notes.join(" "));
    } else {
      jsDoc.save("ak-premium-scan.pdf");
      setStatus("scanPdfStatus", "Done. Scan PDF downloaded (" + files.length + " photo(s)). " + notes.join(" "));
    }
  } catch (e) { if (scCancelBtn) scCancelBtn.style.display = "none"; if (!setPdfError("scanPdfStatus", e)) setError("scanPdfStatus", "Could not make a PDF from this photo."); }
});
