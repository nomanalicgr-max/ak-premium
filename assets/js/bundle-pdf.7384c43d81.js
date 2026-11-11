/* AK Premium v9 — bundle-pdf (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- PDF Studio ---------- */

const createPdfBtn = $("createPdfBtn");
if (createPdfBtn) createPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "createPdfStatus")) return;
  const text = $("createText").value.trim();
  if (!text) { setStatus("createPdfStatus", "Please type some text first."); return; }
  const doc = new JsPDF();
  doc.setFontSize(12);
  addWrappedTextPaginated(doc, text);
  doc.save("ak-premium-created.pdf");
  setStatus("createPdfStatus", "Done. PDF downloaded.");
});

const imagesPdfBtn = $("imagesPdfBtn");
if (imagesPdfBtn) imagesPdfBtn.addEventListener("click", async () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "imagesPdfStatus")) return;
  const files = Array.from($("imagesInput").files || []);
  if (!files.length) { setStatus("imagesPdfStatus", "Please select at least one JPG, PNG or WebP image."); return; }
  setStatus("imagesPdfStatus", "Converting " + files.length + " image(s)…");
  try {
    const doc = new JsPDF();
    for (let i = 0; i < files.length; i++) {
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(files[i]);
      });
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      if (i > 0) doc.addPage();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const ratio = Math.min((pageW - 20) / img.width, (pageH - 20) / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      // Re-encode through a canvas as PNG: jsPDF cannot reliably add WebP
      // (or some PNG variants) directly, which previously failed silently
      // for WebP uploads even though WebP is listed as accepted.
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    }
    doc.save("ak-premium-images.pdf");
    setStatus("imagesPdfStatus", "Done. PDF downloaded.");
  } catch (e) { if (!setPdfError("imagesPdfStatus", e)) setStatus("imagesPdfStatus", "Could not convert these images. Please try JPG or PNG files and try again."); }
});

const mergeInput = $("mergeInput");
if (mergeInput) mergeInput.addEventListener("change", async () => {
  mergeOrder = Array.from(mergeInput.files || []);
  const list = $("mergeList"); if (!list) return;
  list.innerHTML = "";
  if (!(await ensurePdfJs("mergePdfStatus"))) return;
  for (let idx = 0; idx < mergeOrder.length; idx++) {
    const file = mergeOrder[idx];
    const item = document.createElement("div");
    item.className = "thumb"; item.draggable = true; item.dataset.idx = idx;
    item.innerHTML = "<strong>" + idx + 1 + ". " + file.name.replace(/</g, "&lt;") + "</strong><br>" + humanBytes(file.size);
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
  if (files.length < 2) { setStatus("mergePdfStatus", "Please select at least two PDF files to merge."); return; }
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
  } catch (e) { if (!setPdfError("mergePdfStatus", e)) setStatus("mergePdfStatus", "Could not merge these PDFs. Please check that every file is a valid PDF."); }
});

const splitPdfBtn = $("splitPdfBtn");
if (splitPdfBtn) splitPdfBtn.addEventListener("click", async () => {
  const file = ($("splitInput").files || [])[0];
  if (!file) { setStatus("splitPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "splitPdfStatus")) return;
  const mode = $("splitMode") ? $("splitMode").value : "range";
  const rangeText = ($("splitRanges") || { value: "" }).value || "";
  try {
    const src = await loadPdfLibDoc(file, "splitPdfStatus");
    if (!src) return;
    const count = src.getPageCount();
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
    /* Parse "1-3, 5, 8-10" into a page list, validating against the real count. */
    const keep = new Set();
    const tokens = rangeText.split(",").map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) { setStatus("splitPdfStatus", "Please enter page ranges, for example 1-3, 5, 8-10."); return; }
    for (const token of tokens) {
      if (token.includes("-")) {
        const [a, b] = token.split("-").map((x) => parseInt(x.trim(), 10));
        if (!a || !b || b < a || a < 1 || b > count) { setStatus("splitPdfStatus", "Range " + token + " is outside 1 to " + count + "."); return; }
        for (let i = a; i <= b; i++) keep.add(i);
      } else {
        const n = parseInt(token, 10);
        if (!n || n < 1 || n > count) { setStatus("splitPdfStatus", "Page " + token + " is outside 1 to " + count + "."); return; }
        keep.add(n);
      }
    }
    const indices = [...keep].sort((a, b) => a - b).map((n) => n - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, indices); pages.forEach((pg) => out.addPage(pg));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-split.pdf");
    setStatus("splitPdfStatus", "Done. Extracted " + indices.length + " page(s) into one PDF.");
  } catch (e) { if (!setPdfError("splitPdfStatus", e)) setStatus("splitPdfStatus", "Could not split this PDF. Please check the file and page ranges."); }
});

const rotatePdfBtn = $("rotatePdfBtn");
if (rotatePdfBtn) rotatePdfBtn.addEventListener("click", async () => {
  const file = ($("rotateInput").files || [])[0];
  if (!file) { setStatus("rotatePdfStatus", "Please select a PDF file first."); return; }
  const angle = parseInt($("rotateAngle").value, 10);
  try {
    const doc = await loadPdfLibDoc(file, "rotatePdfStatus");
    if (!doc) return;
    // Add to the page's existing rotation instead of replacing it, so a
    // page already rotated 90 degrees becomes 180, not 90 again.
    doc.getPages().forEach((page) => {
      const current = page.getRotation().angle || 0;
      page.setRotation(window.PDFLib.degrees((current + angle) % 360));
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-rotated.pdf");
    setStatus("rotatePdfStatus", "Done. Rotated PDF downloaded.");
  } catch (e) { if (!setPdfError("rotatePdfStatus", e)) setStatus("rotatePdfStatus", "Could not rotate this PDF. Please check the file."); }
});

const pageNumbersBtn = $("pageNumbersBtn");
if (pageNumbersBtn) pageNumbersBtn.addEventListener("click", async () => {
  const file = ($("numbersInput").files || [])[0];
  if (!file) { setStatus("pageNumbersStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pageNumbersStatus");
    if (!doc) return;
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    doc.getPages().forEach((page, i) => {
      const { width, height } = page.getSize();
      page.drawText(String(i + 1), { x: width / 2 - 5, y: 20, size: 11, font, color: window.PDFLib.rgb(0.2, 0.2, 0.2) });
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-numbered.pdf");
    setStatus("pageNumbersStatus", "Done. Numbered PDF downloaded.");
  } catch (e) { if (!setPdfError("pageNumbersStatus", e)) setStatus("pageNumbersStatus", "Could not add page numbers to this PDF."); }
});

/* Honest size wording for Compress: a tiny text PDF re-rendered as images
   can come out larger, and "0% smaller" would hide that. */

const compressQuality = $("compressQuality");
if (compressQuality) compressQuality.addEventListener("input", () => {
  const label = $("compressQualityLabel");
  if (label) label.textContent = compressQuality.value + "%";
});

const compressPdfBtn = $("compressPdfBtn");
if (compressPdfBtn) compressPdfBtn.addEventListener("click", async () => {
  const file = ($("compressInput").files || [])[0];
  if (!file) { setStatus("compressPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "compressPdfStatus")) return;
  const level = $("compressLevel") ? $("compressLevel").value : "light";
  const quality = parseInt(($("compressQuality") || {}).value || "70", 10) / 100;
  try {
    if (level === "light") {
      const doc = await loadPdfLibDoc(file, "compressPdfStatus");
      if (!doc) return;
      const bytes = await doc.save({ useObjectStreams: true });
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
      setStatus("compressPdfStatus", "Done. Light: " + humanBytes(file.size) + " to " + humanBytes(bytes.length) + " (" + sizeChangeNote(file.size, bytes.length) + "). Text stays selectable.");
      return;
    }
    if (!(await ensurePdfJs("compressPdfStatus"))) return;
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "compressPdfStatus")) return;
    const scale = level === "strong" ? 1.0 : 1.5;
    const q = level === "strong" ? Math.min(quality, 0.5) : quality;
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const out = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus("compressPdfStatus", "Compressing page " + i + " of " + pdf.numPages + "...");
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const jpg = await out.embedJpg(canvas.toDataURL("image/jpeg", q));
      const pg = out.addPage([viewport.width, viewport.height]);
      pg.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
    }
    const outBytes = await out.save({ useObjectStreams: true });
    downloadBlob(new Blob([outBytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
    setStatus("compressPdfStatus", "Done. " + (level === "strong" ? "Strong" : "Medium") + ": " + humanBytes(file.size) + " to " + humanBytes(outBytes.length) + " (" + sizeChangeNote(file.size, outBytes.length) + "). Warning: pages are now images, so text is not selectable and cannot be searched.");
  } catch (e) { if (!setPdfError("compressPdfStatus", e)) setStatus("compressPdfStatus", "Could not compress this PDF. Please check the file."); }
});

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const removePagesBtn = $("removePagesBtn");
if (removePagesBtn) removePagesBtn.addEventListener("click", async () => {
  const file = ($("removePagesInput").files || [])[0];
  if (!file) { setStatus("removePagesStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "removePagesStatus");
    if (!src) return;
    const count = src.getPageCount();
    const parsed = parsePageSelection($("removePagesList").value, count);
    if (parsed.error) { setStatus("removePagesStatus", parsed.error); return; }
    const keep = [];
    for (let i = 1; i <= count; i++) if (!parsed.remove.has(i)) keep.push(i - 1);
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, keep);
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-pages-removed.pdf");
    setStatus("removePagesStatus", "Done. Removed " + parsed.remove.size + " page(s); " + keep.length + " remain.");
  } catch (e) { if (!setPdfError("removePagesStatus", e)) setStatus("removePagesStatus", "Could not remove pages from this PDF."); }
});

const watermarkBtn = $("watermarkBtn");
if (watermarkBtn) watermarkBtn.addEventListener("click", async () => {
  const file = ($("watermarkInput").files || [])[0];
  if (!file) { setStatus("watermarkStatus", "Please select a PDF file first."); return; }
  const text = ($("watermarkText").value || "").trim();
  if (!text) { setStatus("watermarkStatus", "Please enter watermark text first."); return; }
  if (text.length > 60) { setStatus("watermarkStatus", "Please keep the watermark under 60 characters."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "watermarkStatus");
    if (!doc) return;
    const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    const size = parseInt($("watermarkSize").value, 10) || 48;
    const opacity = parseFloat($("watermarkOpacity").value) || 0.35;
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width * 0.15, y: height * 0.5, size, font,
        color: window.PDFLib.rgb(0.5, 0.5, 0.5), opacity,
        rotate: window.PDFLib.degrees(-45)
      });
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-watermarked.pdf");
    setStatus("watermarkStatus", "Done. Watermarked PDF downloaded.");
  } catch (e) { if (!setPdfError("watermarkStatus", e)) setStatus("watermarkStatus", "Could not add a watermark to this PDF."); }
});

/* Group pdf.js text items into lines by y-coordinate (within 3pt) and sort
   each line by x, so paragraphs and simple tables keep their shape instead
   of collapsing into one long string. Returns [{page, lines:[{y, text, items}]}]. */

const pdfTextBtn = $("pdfTextBtn");
if (pdfTextBtn) pdfTextBtn.addEventListener("click", async () => {
  const file = ($("pdfTextInput").files || [])[0];
  if (!file) { setStatus("pdfTextStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "pdfTextStatus");
    if (text === null) return;
    downloadText(text, "ak-premium-text.txt");
    setStatus("pdfTextStatus", "Done. Text file downloaded.");
  } catch (e) { if (!setPdfError("pdfTextStatus", e)) setStatus("pdfTextStatus", "Could not extract text from this PDF. Scanned-image PDFs without a text layer cannot be read this way."); }
});

const pdfImagesBtn = $("pdfImagesBtn");
if (pdfImagesBtn) pdfImagesBtn.addEventListener("click", async () => {
  const file = ($("pdfImagesInput").files || [])[0];
  if (!file) { setStatus("pdfImagesStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.pdfjsLib, "pdf.js", "pdfImagesStatus")) return;
  try {
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const out = $("pdfImagesOutput"); out.innerHTML = "";
    const blobs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) continue;
      blobs.push({ name: "ak-premium-page-" + i + ".png", blob });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "ak-premium-page-" + i + ".png"; a.textContent = "Download page " + i + " PNG";
      out.appendChild(a); out.appendChild(document.createElement("br"));
    }
    if (window.JSZip && blobs.length) {
      const zip = new window.JSZip();
      blobs.forEach((b) => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "ak-premium-pages.zip");
      setStatus("pdfImagesStatus", "Done. PNG links are above; ZIP download also started.");
    } else {
      setStatus("pdfImagesStatus", "Done. PNG links are above. ZIP needs JSZip, which did not load.");
    }
  } catch (e) { if (!setPdfError("pdfImagesStatus", e)) setStatus("pdfImagesStatus", "Could not render this PDF to images. Please check the file."); }
});

/* ---------- e-Sign canvas ---------- */

const esignCanvas = $("esignCanvas");
if (esignCanvas) {
  const ctx = esignCanvas.getContext("2d") || { lineWidth: 0, lineCap: "", strokeStyle: "", beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, clearRect(){}, getImageData(){ return { data: [] }; } };
  ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111827";
  let drawing = false;
  let hasSignature = false;
  function pos(e) {
    const r = esignCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (esignCanvas.width / r.width), y: (t.clientY - r.top) * (esignCanvas.height / r.height) };
  }
  function start(e) { e.preventDefault(); drawing = true; hasSignature = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function move(e) { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function stop() { drawing = false; }
  esignCanvas.addEventListener("mousedown", start);
  esignCanvas.addEventListener("mousemove", move);
  esignCanvas.addEventListener("mouseup", stop);
  esignCanvas.addEventListener("mouseleave", stop);
  esignCanvas.addEventListener("touchstart", start, { passive: false });
  esignCanvas.addEventListener("touchmove", move, { passive: false });
  esignCanvas.addEventListener("touchend", stop);
  const clearBtn = $("esignClearBtn");
  if (clearBtn) clearBtn.addEventListener("click", () => { ctx.clearRect(0, 0, esignCanvas.width, esignCanvas.height); hasSignature = false; setStatus("esignStatus", "Signature cleared."); });
  const dlBtn = $("esignDownloadBtn");
  if (dlBtn) dlBtn.addEventListener("click", () => {
    // Previously a blank canvas still produced a "Done" PNG download.
    if (!hasSignature) { setStatus("esignStatus", "Please draw a signature first."); return; }
    esignCanvas.toBlob((blob) => {
      if (!blob) { setStatus("esignStatus", "Please draw a signature first."); return; }
      downloadBlob(blob, "ak-premium-signature.png");
      setStatus("esignStatus", "Done. Signature PNG downloaded.");
    }, "image/png");
  });
}

/* ---------- New tools (all in browser) ---------- */

const unlockPdfBtn = $("unlockPdfBtn");
if (unlockPdfBtn) unlockPdfBtn.addEventListener("click", async () => {
  const file = ($("unlockInput").files || [])[0];
  if (!file) { setStatus("unlockPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "unlockPdfStatus")) return;
  const password = $("unlockPassword").value || "";
  if (!password) { setStatus("unlockPdfStatus", "Please enter the PDF password. This tool does not guess or crack passwords."); return; }
  setStatus("unlockPdfStatus", "Unlocking with standard PDF decryption, this may take a moment...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const out = await runQpdf("unlock", bytes, password, "unlockPdfStatus");
  if (!out) return;
  downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-unlocked.pdf");
  setStatus("unlockPdfStatus", "Done. Unlocked PDF downloaded with its original pages and layout.");
});

const protectPdfBtn = $("protectPdfBtn");
if (protectPdfBtn) protectPdfBtn.addEventListener("click", async () => {
  const file = ($("protectInput").files || [])[0];
  const password = $("protectPassword").value || "";
  if (!file) { setStatus("protectPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "protectPdfStatus")) return;
  if (password.length < 4) { setStatus("protectPdfStatus", "Please enter a password of at least 4 characters. A longer password is safer."); return; }
  setStatus("protectPdfStatus", "Encrypting with standard AES-256 PDF encryption, this may take a moment...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const out = await runQpdf("protect", bytes, password, "protectPdfStatus");
  if (!out) return;
  downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-protected.pdf");
  setStatus("protectPdfStatus", "Done. Standard password-protected PDF downloaded (" + humanBytes(file.size) + " to " + humanBytes(out.length) + "). It opens in Acrobat and Chrome with this password. Keep the password safe, it cannot be recovered.");
});

const cropPdfBtn = $("cropPdfBtn");
if (cropPdfBtn) cropPdfBtn.addEventListener("click", async () => {
  const file = ($("cropInput").files || [])[0]; if (!file) { setStatus("cropPdfStatus", "Please select a PDF file first."); return; }
  const m = parseFloat($("cropMargin").value) || 0;
  try {
    const doc = await loadPdfLibDoc(file, "cropPdfStatus"); if (!doc) return;
    doc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.setCropBox(m, m, Math.max(10, width - 2*m), Math.max(10, height - 2*m));
    });
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-cropped.pdf");
    setStatus("cropPdfStatus", "Done. Cropped PDF downloaded.");
  } catch (e) { if (!setPdfError("cropPdfStatus", e)) setStatus("cropPdfStatus", "Could not crop this PDF."); }
});

const redactPdfBtn = $("redactPdfBtn");
if (redactPdfBtn) redactPdfBtn.addEventListener("click", async () => {
  const file = ($("redactInput").files || [])[0]; const needle = ($("redactText").value || "").trim();
  if (!file) { setStatus("redactPdfStatus", "Please select a PDF file first."); return; }
  if (!needle) { setStatus("redactPdfStatus", "Please enter text to redact."); return; }
  try {
    if (!needLibrary(!!window.pdfjsLib, "pdf.js", "redactPdfStatus")) return;
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file);
    /* pdf.js sends its copy to a Web Worker, which detaches (empties) the
       buffer — pdf-lib then fails with "detached ArrayBuffer". So pdf.js
       gets a copy and pdf-lib keeps the original. */
    const pdf = await window.pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    let found = 0; const matchedPages = new Set();
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent(); const viewport = page.getViewport({ scale: 1 });
      const p = doc.getPage(i-1); const { height } = p.getSize();
      for (const item of content.items) {
        if (String(item.str || "").toLowerCase().includes(needle.toLowerCase())) {
          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
          p.drawRectangle({ x: tx[4], y: height - tx[5] - h, width: w, height: h + 2, color: window.PDFLib.rgb(0,0,0) });
          found++; matchedPages.add(i);
        }
      }
    }
    if (!found) { setStatus("redactPdfStatus", "That text was not found in the PDF text layer. Scanned PDFs have no text layer — try OCR PDF first."); return; }
    /* True redaction: for every page with a match, render the page to an
       image, burn the black box into that image, and rebuild the page from
       the image alone. The original text layer on that page is destroyed,
       so the redacted text cannot be selected or copied out of it.
       Pages without a match are copied unchanged. */
    const outDoc = await window.PDFLib.PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const matches = content.items.filter((it) => String(it.str || "").toLowerCase().includes(needle.toLowerCase()));
      if (!matches.length) {
        const [copied] = await outDoc.copyPages(doc, [i - 1]); outDoc.addPage(copied); continue;
      }
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      for (const item of matches) {
        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
        ctx.fillStyle = "#000"; ctx.fillRect(tx[4], tx[5] - h, w, h + 2);
      }
      const jpg = await outDoc.embedJpg(canvas.toDataURL("image/jpeg", 0.9));
      const { width, height } = doc.getPage(i - 1).getSize();
      const pg = outDoc.addPage([width, height]);
      pg.drawImage(jpg, { x: 0, y: 0, width, height });
    }
    const out = await outDoc.save(); downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-redacted.pdf");
    setStatus("redactPdfStatus", "Done. Redacted " + found + " match(es) on " + matchedPages.size + " page(s) — those pages are now images with no text layer, so the covered text cannot be copied. Check the result before sharing sensitive files.");
  } catch (e) { if (!setPdfError("redactPdfStatus", e)) setStatus("redactPdfStatus", "Could not redact this PDF. (" + (e && e.message ? e.message : "unknown error") + ")"); }
});

const pdfaPdfBtn = $("pdfaPdfBtn");
if (pdfaPdfBtn) pdfaPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfaInput").files || [])[0]; if (!file) { setStatus("pdfaPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pdfaPdfStatus"); if (!doc) return;
    doc.setTitle($("pdfaTitle").value || "Archive document"); doc.setAuthor("AK Premium"); doc.setSubject("Archive copy"); doc.setKeywords(["archive", "PDF/A-style"]); doc.setProducer("AK Premium browser tool"); doc.setCreator("AK Premium");
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-archive.pdf");
    setStatus("pdfaPdfStatus", "Done. Archive-style copy downloaded. This is not a certified PDF/A validation.");
  } catch (e) { if (!setPdfError("pdfaPdfStatus", e)) setStatus("pdfaPdfStatus", "Could not make an archive copy."); }
});

const repairPdfBtn = $("repairPdfBtn");
if (repairPdfBtn) repairPdfBtn.addEventListener("click", async () => {
  const file = ($("repairInput").files || [])[0]; if (!file) { setStatus("repairPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "repairPdfStatus");
    if (doc) { const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-repaired.pdf"); setStatus("repairPdfStatus", "Done. Re-saved PDF downloaded."); return; }
  } catch (e) {}
  try {
    const text = await extractPdfText(file, "repairPdfStatus"); if (text === null) return;
    const JsPDF = getJsPdf(); const doc = new JsPDF(); addWrappedTextPaginated(doc, text); doc.save("ak-premium-repaired-text.pdf");
    setStatus("repairPdfStatus", "Done, from readable text only. Layout was rebuilt, not preserved.");
  } catch (e2) { setStatus("repairPdfStatus", "Could not repair this PDF."); }
});

const comparePdfBtn = $("comparePdfBtn");
if (comparePdfBtn) comparePdfBtn.addEventListener("click", async () => {
  const a = ($("compareInputA").files || [])[0], b = ($("compareInputB").files || [])[0];
  if (!a || !b) { setStatus("comparePdfStatus", "Please select two PDF files."); return; }
  try {
    const ta = await extractPdfText(a, "comparePdfStatus"); const tb = await extractPdfText(b, "comparePdfStatus");
    const la = new Set(ta.split("\n").map(s=>s.trim()).filter(Boolean)); const lb = new Set(tb.split("\n").map(s=>s.trim()).filter(Boolean));
    const onlyA = [...la].filter(x=>!lb.has(x)); const onlyB = [...lb].filter(x=>!la.has(x));
    $("comparePdfOutput").textContent = "Only in first PDF:\n" + (onlyA.join("\n") || "(none)") + "\n\nOnly in second PDF:\n" + (onlyB.join("\n") || "(none)");
    setStatus("comparePdfStatus", "Done. " + onlyA.length + " line(s) only in first, " + onlyB.length + " only in second.");
  } catch (e) { if (!setPdfError("comparePdfStatus", e)) setStatus("comparePdfStatus", "Could not compare these PDFs."); }
});

const pdfmdPdfBtn = $("pdfmdPdfBtn");
if (pdfmdPdfBtn) pdfmdPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfmdInput").files || [])[0]; if (!file) { setStatus("pdfmdPdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "pdfmdPdfStatus"); if (text === null) return;
    const md = text.split("\n").map((line) => {
      const t = line.trim(); if (!t) return "";
      if (/^--- Page/.test(t)) return "\n## " + t + "\n";
      return t;
    }).join("\n");
    downloadText(md, "ak-premium-document.md", "text/markdown;charset=utf-8");
    setStatus("pdfmdPdfStatus", "Done. Markdown file downloaded.");
  } catch (e) { if (!setPdfError("pdfmdPdfStatus", e)) setStatus("pdfmdPdfStatus", "Could not convert this PDF to Markdown."); }
});

const scanPdfBtn = $("scanPdfBtn");
if (scanPdfBtn) scanPdfBtn.addEventListener("click", async () => {
  const file = ($("scanInput").files || [])[0]; if (!file) { setStatus("scanPdfStatus", "Please select a photo first."); return; }
  try {
    const JsPDF = getJsPdf(); if (!JsPDF) { setStatus("scanPdfStatus", "jsPDF did not load."); return; }
    const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height; canvas.getContext("2d").drawImage(img, 0, 0);
    const doc = new JsPDF(); const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / img.width, pageH / img.height); const w = img.width * ratio, h = img.height * ratio;
    doc.addImage(canvas.toDataURL("image/png"), "PNG", (pageW-w)/2, (pageH-h)/2, w, h); doc.save("ak-premium-scan.pdf");
    setStatus("scanPdfStatus", "Done. Scan PDF downloaded.");
  } catch (e) { if (!setPdfError("scanPdfStatus", e)) setStatus("scanPdfStatus", "Could not make a PDF from this photo."); }
});

const ocrpdfPdfBtn = $("ocrpdfPdfBtn");
if (ocrpdfPdfBtn) ocrpdfPdfBtn.addEventListener("click", async () => {
  const file = ($("ocrpdfInput").files || [])[0]; if (!file) { setStatus("ocrpdfPdfStatus", "Please select a PDF file first."); return; }
  if (!window.Tesseract) { setStatus("ocrpdfPdfStatus", "OCR library did not load."); return; }
  try {
    if (!needLibrary(!!window.pdfjsLib, "pdf.js", "ocrpdfPdfStatus")) return;
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file); const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const JsPDF = getJsPdf(); const doc = new JsPDF(); let first = true;
    for (let i = 1; i <= pdf.numPages; i++) {
      setStatus("ocrpdfPdfStatus", "Reading page " + i + " of " + pdf.numPages + "…");
      const page = await pdf.getPage(i); const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas"); canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const result = await window.Tesseract.recognize(canvas, "eng", { logger: () => {} });
      if (!first) doc.addPage(); first = false; addWrappedTextPaginated(doc, result.data.text || "");
    }
    doc.save("ak-premium-ocr.pdf"); setStatus("ocrpdfPdfStatus", "Done. OCR PDF downloaded.");
  } catch (e) { if (!setPdfError("ocrpdfPdfStatus", e)) setStatus("ocrpdfPdfStatus", "Could not OCR this PDF."); }
});

const formsPdfBtn = $("formsPdfBtn");
if (formsPdfBtn) formsPdfBtn.addEventListener("click", async () => {
  try {
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "formsPdfStatus")) return;
    const doc = await window.PDFLib.PDFDocument.create(); const page = doc.addPage([595, 842]); const form = doc.getForm();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    page.drawText($("formsTitle").value || "Application Form", { x: 50, y: 780, size: 20, font });
    page.drawText("Full name:", { x: 50, y: 730, size: 12, font });
    const nameField = form.createTextField("fullName"); nameField.addToPage(page, { x: 150, y: 715, width: 300, height: 20, borderWidth: 1 });
    page.drawText("Email:", { x: 50, y: 690, size: 12, font });
    const emailField = form.createTextField("email"); emailField.addToPage(page, { x: 150, y: 675, width: 300, height: 20, borderWidth: 1 });
    page.drawText("Agree:", { x: 50, y: 650, size: 12, font });
    const agree = form.createCheckBox("agree"); agree.addToPage(page, { x: 150, y: 640, width: 15, height: 15, borderWidth: 1 });
    page.drawText("Category:", { x: 50, y: 610, size: 12, font });
    const cat = form.createDropdown("category"); cat.addOptions(["General", "Support", "Sales"]); cat.select("General"); cat.addToPage(page, { x: 150, y: 595, width: 200, height: 20, borderWidth: 1 });
    form.updateFieldAppearances();
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-form.pdf");
    setStatus("formsPdfStatus", "Done. Fillable form PDF downloaded.");
  } catch (e) { if (!setPdfError("formsPdfStatus", e)) setStatus("formsPdfStatus", "Could not create a form PDF."); }
});

const summaryPdfBtn = $("summaryPdfBtn");
if (summaryPdfBtn) summaryPdfBtn.addEventListener("click", async () => {
  const file = ($("summaryInput").files || [])[0]; if (!file) { setStatus("summaryPdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "summaryPdfStatus"); if (text === null) return;
    const sentences = text.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length > 30);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w=>w.length > 3);
    const freq = {}; words.forEach(w=>freq[w]=(freq[w]||0)+1);
    const scored = sentences.map(s=>({ s, score: s.toLowerCase().split(/\s+/).reduce((a,w)=>a+(freq[w]||0),0) })).sort((a,b)=>b.score-a.score);
    const n = parseInt($("summaryCount").value, 10) || 5;
    $("summaryPdfOutput").textContent = scored.slice(0, n).map(x=>"- " + x.s).join("\n");
    setStatus("summaryPdfStatus", "Done. Local summary shown above. No AI server was used.");
  } catch (e) { if (!setPdfError("summaryPdfStatus", e)) setStatus("summaryPdfStatus", "Could not summarize this PDF."); }
});

const translatePdfBtn = $("translatePdfBtn");
if (translatePdfBtn) translatePdfBtn.addEventListener("click", async () => {
  const file = ($("translateInput").files || [])[0]; if (!file) { setStatus("translatePdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "translatePdfStatus"); if (text === null) return;
    downloadText(text, "ak-premium-for-translation.txt"); setStatus("translatePdfStatus", "Done. Text file downloaded, ready to translate elsewhere. No text was sent to a translation server by AK Premium.");
  } catch (e) { if (!setPdfError("translatePdfStatus", e)) setStatus("translatePdfStatus", "Could not extract text from this PDF."); }
});


/* More dropdown: horizontal panel, closes on selection or outside click */

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
  if (!file) { setStatus("organizeStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "organizeStatus");
    if (!src) return;
    const count = src.getPageCount();
    let order = organizePages.length ? organizePages : null;
    if (!order) {
      const parsed = parseOrganizeOrder($("organizeOrder").value, count);
      if (parsed.error) { setStatus("organizeStatus", parsed.error); return; }
      order = parsed.order.map((n) => ({ index: n - 1, rotation: 0 }));
    }
    if (!order.length) { setStatus("organizeStatus", "You deleted every page. Keep at least one page."); return; }
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, order.map((o) => o.index));
    pages.forEach((pg, i) => { if (order[i].rotation) pg.setRotation(window.PDFLib.degrees(order[i].rotation)); out.addPage(pg); });
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-organized.pdf");
    setStatus("organizeStatus", "Done. Organized PDF downloaded with " + order.length + " page(s).");
  } catch (e) { setStatus("organizeStatus", "Could not reorder this PDF. Please check the file and order."); }
});

const editPdfBtn = $("editPdfBtn");
if (editPdfBtn) editPdfBtn.addEventListener("click", async () => {
  const file = ($("editPdfInput").files || [])[0];
  if (!file) { setStatus("editPdfStatus", "Please select a PDF file first."); return; }
  const text = ($("editPdfText").value || "").trim();
  if (!text) { setStatus("editPdfStatus", "Please enter text to add first."); return; }
  const pageNum = parseInt($("editPdfPage").value, 10);
  const size = parseInt($("editPdfSize").value, 10) || 18;
  const position = $("editPdfPosition").value;
  try {
    const doc = await loadPdfLibDoc(file, "editPdfStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    if (!pageNum || pageNum < 1 || pageNum > count) { setStatus("editPdfStatus", "This PDF has " + count + " page(s). Please choose a page inside 1 to " + count + "."); return; }
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    let x = 40, y = height - 40;
    if (position === "top-centre") { x = Math.max(20, (width - textWidth) / 2); y = height - 40; }
    else if (position === "bottom-centre") { x = Math.max(20, (width - textWidth) / 2); y = 40; }
    else if (position === "centre") { x = Math.max(20, (width - textWidth) / 2); y = height / 2; }
    page.drawText(text, { x, y, size, font, color: window.PDFLib.rgb(0.11, 0.11, 0.11) });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-edited.pdf");
    setStatus("editPdfStatus", "Done. Edited PDF downloaded.");
  } catch (e) { setStatus("editPdfStatus", "Could not edit this PDF. Please check the file."); }
});
