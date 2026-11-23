/* AK Premium v12 — ocr-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

const ocrpdfPdfBtn = $("ocrpdfPdfBtn");
/* Extra OCR controls: language select (Urdu, Arabic, Hindi, Auto). */
const ocrExtraWrap = document.createElement("div");
ocrExtraWrap.innerHTML = '<label>Language <select id="ocrPdfLang"><option value="eng" selected>English</option><option value="urd">Urdu</option><option value="ara">Arabic</option><option value="hin">Hindi</option><option value="eng+urd">English + Urdu</option><option value="eng+ara">English + Arabic</option><option value="auto">Auto (detect script)</option></select></label> <span>Auto checks the script on the first page: Arabic script becomes Urdu or Arabic — the two share a script, so pick Urdu or Arabic yourself when it matters.</span>';
if (ocrpdfPdfBtn && ocrpdfPdfBtn.parentNode) ocrpdfPdfBtn.parentNode.insertBefore(ocrExtraWrap, ocrpdfPdfBtn);
if (ocrpdfPdfBtn) ocrpdfPdfBtn.addEventListener("click", async () => {
  const file = ($("ocrpdfInput").files || [])[0]; if (!file) { setError("ocrpdfPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "ocrpdfPdfStatus")) return;
  if (!window.Tesseract) { const ok = await loadLibrary("tesseract", "ocrpdfPdfStatus"); if (!ok || !window.Tesseract) return; }
  if (!needLibrary(!!window.PDFLib, "pdf-lib", "ocrpdfPdfStatus")) return;
  if (!(await ensurePdfJs("ocrpdfPdfStatus"))) return;
  const langSel = $("ocrPdfLang") || { value: "eng" };
  let lang = langSel.value || "eng";
  setStatus("ocrpdfPdfStatus", "Reading the PDF…");
  try {
    const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    const out = await window.PDFLib.PDFDocument.create();
    const font = await out.embedFont(window.PDFLib.StandardFonts.Helvetica);
    let totalWords = 0;
    let langNote = lang;
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus("ocrpdfPdfStatus", "Reading page " + i + " of " + pdf.numPages + "…");
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(vp.width));
      canvas.height = Math.max(1, Math.round(vp.height));
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      let useLang = lang;
      if (lang === "auto") {
        try {
          const det = await window.Tesseract.detect(canvas);
          const script = det && det.data ? det.data.script : "";
          useLang = script === "Arabic" ? "ara" : script === "Devanagari" ? "hin" : "eng";
          if (i === 1) langNote = useLang + " (auto-detected: " + (script || "unknown script") + ")";
        } catch (e) { useLang = "eng"; if (i === 1) langNote = "eng (auto-detection failed)"; }
      }
      const res = await window.Tesseract.recognize(canvas, useLang, { logger: () => {} });
      const jpgBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.85));
      const jpg = await out.embedJpg(jpgBytes);
      const scale = Math.min(595 / canvas.width, 842 / canvas.height);
      const pw = canvas.width * scale, ph = canvas.height * scale;
      const outPage = out.addPage([pw, ph]);
      outPage.drawImage(jpg, { x: 0, y: 0, width: pw, height: ph });
      let pageWords = 0;
      for (const w of (res.data.words || [])) {
        if (!(w.text || "").trim()) continue;
        const x = (w.bbox.x0 / canvas.width) * pw;
        const yTop = (w.bbox.y0 / canvas.height) * ph;
        const h = Math.max(4, ((w.bbox.y1 - w.bbox.y0) / canvas.height) * ph);
        outPage.drawText(w.text, { x, y: ph - yTop - h, size: h, font, opacity: 0 });
        pageWords++;
      }
      totalWords += pageWords;
      if (i === 1 && lang !== "auto") langNote = lang;
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-ocr.pdf");
    setStatus("ocrpdfPdfStatus", "Done. Searchable PDF downloaded: each page is a picture of the original with a hidden text layer (" + totalWords + " word(s), language " + langNote + "). Text is found by searching, but it is not typed text — handwriting is not recognised.");
  } catch (e) { if (!setPdfError("ocrpdfPdfStatus", e)) setError("ocrpdfPdfStatus", "Could not OCR this PDF."); }
});
/* Validate one filled value against a rule {kind, min, max}. Returns an
   error message or "" when the value passes. Pure, used by Fill a Form. */
