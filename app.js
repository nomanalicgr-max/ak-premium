/* AK Premium — client-side application logic.
   AK Premium runs entirely in the browser. No file is uploaded by AK Premium.
   Optional integrations below are empty by design. Add a key only if you
   choose to use that optional service, and never commit a real key publicly. */

// Google Analytics — AK Premium loads gtag only when this is non-empty.
// See README.md for the exact steps to connect Google Analytics later.
const GA_MEASUREMENT_ID = "";
if (GA_MEASUREMENT_ID) {
  const gaScript = document.createElement("script");
  gaScript.async = true;
  gaScript.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(gaScript);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}

// Optional pixel-perfect conversion integrations — AK Premium built-in tools
// work without these. They are optional, free-tier (1,000 monthly actions)
// only, and are used only if you later wire them up deliberately.
// ConvertAPI: https://www.convertapi.com — CloudConvert: https://cloudconvert.com
const CONVERT_API_KEY = "";
const CLOUDCONVERT_API_KEY = "";
function optionalConversionNote() {
  if (CONVERT_API_KEY || CLOUDCONVERT_API_KEY) return "An optional conversion key is configured in app.js.";
  return "No ConvertAPI or CloudConvert key is configured. Built-in AK Premium tools are used instead, and complex original formatting is not preserved.";
}

/* ---------- helpers ---------- */
function $(id) { return document.getElementById(id); }
function setStatus(id, message) { const el = $(id); if (el) el.textContent = message; }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadText(text, filename, type) {
  downloadBlob(new Blob([text], { type: type || "text/plain;charset=utf-8" }), filename);
}
function readAsArrayBuffer(file) { return file.arrayBuffer(); }
function needLibrary(ok, name, statusId) {
  if (!ok) { setStatus(statusId, name + " did not load from its CDN. Check your connection and try again. AK Premium will not fake this result."); return false; }
  return true;
}
function getJsPdf() { return window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null; }
function newPdfDoc() {
  const JsPDF = getJsPdf();
  if (!JsPDF) return null;
  return new JsPDF();
}
function wrapPdfText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ""), maxWidth);
}

/* ---------- tabs (SPA) ---------- */
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
function showTab(name) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  tabPanels.forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  filterCards();
}
tabButtons.forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

/* ---------- hero search: filter tool cards on every keypress ---------- */
const heroSearch = $("heroSearch");
const searchStatus = $("searchStatus");
function filterCards() {
  const query = (heroSearch ? heroSearch.value : "").trim().toLowerCase();
  const cards = document.querySelectorAll(".tool-card");
  let visible = 0;
  let visibleByTab = {};
  cards.forEach((card) => {
    const hay = ((card.dataset.keywords || "") + " " + card.textContent).toLowerCase();
    const show = !query || hay.includes(query);
    card.style.display = show ? "" : "none";
    if (show) {
      visible++;
      const panel = card.closest(".tab-panel");
      if (panel) visibleByTab[panel.id] = (visibleByTab[panel.id] || 0) + 1;
    }
  });
  if (searchStatus) {
    searchStatus.textContent = query
      ? "Found " + visible + " tool card(s) matching “" + heroSearch.value.trim() + "” across AK Premium."
      : "Showing all AK Premium tools.";
  }
  if (query) {
    const active = document.querySelector(".tab-panel.active");
    if (active && !visibleByTab[active.id]) {
      const first = Object.keys(visibleByTab)[0];
      if (first) showTab(first.replace("tab-", ""));
    }
  }
  return visible;
}
if (heroSearch) heroSearch.addEventListener("input", filterCards);
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (heroSearch) { heroSearch.value = chip.dataset.query; heroSearch.focus(); }
    filterCards();
  });
});

/* ---------- PDF Studio ---------- */
const createPdfBtn = $("createPdfBtn");
if (createPdfBtn) createPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "createPdfStatus")) return;
  const text = $("createText").value.trim();
  if (!text) { setStatus("createPdfStatus", "Please type some text first."); return; }
  const doc = new JsPDF();
  doc.setFontSize(12);
  doc.text(wrapPdfText(doc, text, 170), 15, 20);
  doc.save("ak-premium-created.pdf");
  setStatus("createPdfStatus", "Done. Your PDF has been downloaded. It was created in your browser.");
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
      const format = files[i].type.includes("png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, format, (pageW - w) / 2, (pageH - h) / 2, w, h);
    }
    doc.save("ak-premium-images.pdf");
    setStatus("imagesPdfStatus", "Done. " + files.length + " image(s) converted to PDF, in the order you selected them.");
  } catch (e) { setStatus("imagesPdfStatus", "Could not convert these images. Please try JPG or PNG files and try again."); }
});

async function loadPdfLibDoc(file, statusId) {
  if (!needLibrary(!!window.PDFLib, "pdf-lib", statusId)) return null;
  const bytes = await readAsArrayBuffer(file);
  return window.PDFLib.PDFDocument.load(bytes);
}
const mergePdfBtn = $("mergePdfBtn");
if (mergePdfBtn) mergePdfBtn.addEventListener("click", async () => {
  const files = Array.from($("mergeInput").files || []);
  if (files.length < 2) { setStatus("mergePdfStatus", "Please select at least two PDF files to merge."); return; }
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
    setStatus("mergePdfStatus", "Done. " + files.length + " PDFs merged and downloaded.");
  } catch (e) { setStatus("mergePdfStatus", "Could not merge these PDFs. Please check that every file is a valid PDF."); }
});

const splitPdfBtn = $("splitPdfBtn");
if (splitPdfBtn) splitPdfBtn.addEventListener("click", async () => {
  const file = ($("splitInput").files || [])[0];
  if (!file) { setStatus("splitPdfStatus", "Please select a PDF file first."); return; }
  const start = parseInt($("splitStart").value, 10);
  const end = parseInt($("splitEnd").value, 10);
  if (!start || !end || end < start) { setStatus("splitPdfStatus", "Please enter a valid page range, with end page at or after start page."); return; }
  try {
    const src = await loadPdfLibDoc(file, "splitPdfStatus");
    if (!src) return;
    const count = src.getPageCount();
    if (start < 1 || end > count) { setStatus("splitPdfStatus", "This PDF has " + count + " page(s). Please choose a range inside 1 to " + count + "."); return; }
    const out = await window.PDFLib.PDFDocument.create();
    const indices = [];
    for (let i = start - 1; i <= end - 1; i++) indices.push(i);
    const pages = await out.copyPages(src, indices);
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-split.pdf");
    setStatus("splitPdfStatus", "Done. Pages " + start + " to " + end + " extracted and downloaded.");
  } catch (e) { setStatus("splitPdfStatus", "Could not split this PDF. Please check the file and page range."); }
});

const rotatePdfBtn = $("rotatePdfBtn");
if (rotatePdfBtn) rotatePdfBtn.addEventListener("click", async () => {
  const file = ($("rotateInput").files || [])[0];
  if (!file) { setStatus("rotatePdfStatus", "Please select a PDF file first."); return; }
  const angle = parseInt($("rotateAngle").value, 10);
  try {
    const doc = await loadPdfLibDoc(file, "rotatePdfStatus");
    if (!doc) return;
    doc.getPages().forEach((page) => page.setRotation(window.PDFLib.degrees(angle)));
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-rotated.pdf");
    setStatus("rotatePdfStatus", "Done. Every page rotated by " + angle + " degrees and downloaded.");
  } catch (e) { setStatus("rotatePdfStatus", "Could not rotate this PDF. Please check the file."); }
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
    setStatus("pageNumbersStatus", "Done. Page numbers added to the bottom of every page.");
  } catch (e) { setStatus("pageNumbersStatus", "Could not add page numbers to this PDF."); }
});

const compressQuality = $("compressQuality");
if (compressQuality) compressQuality.addEventListener("input", () => {
  const label = $("compressQualityLabel");
  if (label) label.textContent = compressQuality.value + "%";
});
const compressPdfBtn = $("compressPdfBtn");
if (compressPdfBtn) compressPdfBtn.addEventListener("click", async () => {
  const file = ($("compressInput").files || [])[0];
  if (!file) { setStatus("compressPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "compressPdfStatus");
    if (!doc) return;
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
    setStatus("compressPdfStatus", "Re-saved at " + compressQuality.value + "% quality preference. Honest note: browser re-saving does not fully recompress embedded images, so image-heavy PDFs may shrink only a little. Original: " + file.size + " bytes, re-saved: " + bytes.length + " bytes.");
  } catch (e) { setStatus("compressPdfStatus", "Could not compress this PDF. Please check the file."); }
});

async function extractPdfText(file, statusId) {
  if (!needLibrary(!!window.pdfjsLib, "pdf.js", statusId)) return null;
  if (window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  let lines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    lines.push("--- Page " + i + " ---");
    lines.push(content.items.map((it) => it.str).join(" "));
  }
  return lines.join("\n");
}
const pdfTextBtn = $("pdfTextBtn");
if (pdfTextBtn) pdfTextBtn.addEventListener("click", async () => {
  const file = ($("pdfTextInput").files || [])[0];
  if (!file) { setStatus("pdfTextStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "pdfTextStatus");
    if (text === null) return;
    downloadText(text, "ak-premium-text.txt");
    setStatus("pdfTextStatus", "Done. Extracted text downloaded as a .txt file.");
  } catch (e) { setStatus("pdfTextStatus", "Could not extract text from this PDF. Scanned-image PDFs without a text layer cannot be read this way."); }
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
      setStatus("pdfImagesStatus", "Done. " + blobs.length + " page(s) rendered. Individual PNG links are above, and a ZIP download was also started.");
    } else {
      setStatus("pdfImagesStatus", "Done. " + blobs.length + " page(s) rendered as PNG links above. ZIP download needs JSZip, which did not load.");
    }
  } catch (e) { setStatus("pdfImagesStatus", "Could not render this PDF to images. Please check the file."); }
});

/* ---------- e-Sign canvas ---------- */
const esignCanvas = $("esignCanvas");
if (esignCanvas) {
  const ctx = esignCanvas.getContext("2d");
  ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111827";
  let drawing = false;
  function pos(e) {
    const r = esignCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: (t.clientX - r.left) * (esignCanvas.width / r.width), y: (t.clientY - r.top) * (esignCanvas.height / r.height) };
  }
  function start(e) { e.preventDefault(); drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
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
  if (clearBtn) clearBtn.addEventListener("click", () => { ctx.clearRect(0, 0, esignCanvas.width, esignCanvas.height); setStatus("esignStatus", "Signature cleared."); });
  const dlBtn = $("esignDownloadBtn");
  if (dlBtn) dlBtn.addEventListener("click", () => {
    esignCanvas.toBlob((blob) => {
      if (!blob) { setStatus("esignStatus", "Please draw a signature first."); return; }
      downloadBlob(blob, "ak-premium-signature.png");
      setStatus("esignStatus", "Done. Your signature PNG has been downloaded. This is a visual signature only, not a legal digital signature.");
    }, "image/png");
  });
}

/* ---------- Converters ---------- */
const pdfExcelBtn = $("pdfExcelBtn");
if (pdfExcelBtn) pdfExcelBtn.addEventListener("click", async () => {
  const file = ($("pdfExcelInput").files || [])[0];
  if (!file) { setStatus("pdfExcelStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  try {
    const text = await extractPdfText(file, "pdfExcelStatus");
    if (text === null) return;
    const rows = text.split("\n").map((line) => [line]);
    const ws = window.XLSX.utils.aoa_to_sheet([["AK Premium — extracted PDF text"], ...rows]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Extracted Text");
    window.XLSX.writeFile(wb, "ak-premium-pdf-to-excel.xlsx");
    setStatus("pdfExcelStatus", "Done. Extracted text saved as an .xlsx file. Tables and layout from the original PDF are not reconstructed.");
  } catch (e) { setStatus("pdfExcelStatus", "Could not convert this PDF to Excel."); }
});

const pdfWordBtn = $("pdfWordBtn");
if (pdfWordBtn) pdfWordBtn.addEventListener("click", async () => {
  const file = ($("pdfWordInput").files || [])[0];
  if (!file) { setStatus("pdfWordStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.docx, "docx", "pdfWordStatus")) return;
  try {
    const text = await extractPdfText(file, "pdfWordStatus");
    if (text === null) return;
    const doc = new window.docx.Document({ sections: [{ children: text.split("\n").map((line) => new window.docx.Paragraph(line)) }] });
    const blob = await window.docx.Packer.toBlob(doc);
    downloadBlob(blob, "ak-premium-pdf-to-word.docx");
    setStatus("pdfWordStatus", "Done. A simple .docx was created from extracted text. " + optionalConversionNote());
  } catch (e) { setStatus("pdfWordStatus", "Could not convert this PDF to Word. Complex original formatting is not preserved by this simple conversion."); }
});

const pdfPptBtn = $("pdfPptBtn");
if (pdfPptBtn) pdfPptBtn.addEventListener("click", async () => {
  const file = ($("pdfPptInput").files || [])[0];
  if (!file) { setStatus("pdfPptStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.PptxGenJS, "PptxGenJS", "pdfPptStatus")) return;
  try {
    const text = await extractPdfText(file, "pdfPptStatus");
    if (text === null) return;
    const pptx = new window.PptxGenJS();
    const chunks = text.match(/.{1,600}/gs) || [text];
    chunks.forEach((chunk, i) => {
      const slide = pptx.addSlide();
      slide.addText("AK Premium — PDF to PPT, part " + (i + 1), { x: 0.5, y: 0.3, w: 9, fontSize: 20, bold: true });
      slide.addText(chunk, { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 12 });
    });
    await pptx.writeFile({ fileName: "ak-premium-pdf-to-ppt.pptx" });
    setStatus("pdfPptStatus", "Done. A simple .pptx was created from extracted text. " + optionalConversionNote());
  } catch (e) { setStatus("pdfPptStatus", "Could not convert this PDF to PPT."); }
});

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "txtHtmlPdfStatus")) return;
  const raw = $("txtHtmlInput").value.trim();
  if (!raw) { setStatus("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const doc = new JsPDF();
  doc.setFontSize(12);
  doc.text(wrapPdfText(doc, clean, 170), 15, 20);
  doc.save("ak-premium-text-to-pdf.pdf");
  setStatus("txtHtmlPdfStatus", "Done. Your text was converted to PDF. HTML tags were stripped for a clean result.");
});

const excelPdfBtn = $("excelPdfBtn");
if (excelPdfBtn) excelPdfBtn.addEventListener("click", async () => {
  const file = ($("excelPdfInput").files || [])[0];
  if (!file) { setStatus("excelPdfStatus", "Please select an Excel file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "excelPdfStatus") || !needLibrary(!!window.XLSX, "SheetJS", "excelPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const doc = new JsPDF();
    let y = 20;
    doc.setFontSize(11);
    rows.forEach((row) => {
      const line = row.map((c) => String(c == null ? "" : c)).join("  |  ");
      wrapPdfText(doc, line, 170).forEach((part) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(part, 15, y); y += 7;
      });
    });
    doc.save("ak-premium-excel-to-pdf.pdf");
    setStatus("excelPdfStatus", "Done. First sheet rendered as a PDF. This is a simple row rendering, not a pixel-perfect spreadsheet print.");
  } catch (e) { setStatus("excelPdfStatus", "Could not convert this Excel file to PDF."); }
});

const wordPdfBtn = $("wordPdfBtn");
if (wordPdfBtn) wordPdfBtn.addEventListener("click", async () => {
  const file = ($("wordPdfInput").files || [])[0];
  if (!file) { setStatus("wordPdfStatus", "Please select a Word (.docx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "wordPdfStatus") || !needLibrary(!!window.mammoth, "mammoth", "wordPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const result = await window.mammoth.extractRawText({ arrayBuffer: data });
    const doc = new JsPDF();
    doc.setFontSize(12);
    let y = 20;
    result.value.split("\n").forEach((line) => {
      wrapPdfText(doc, line, 170).forEach((part) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(part, 15, y); y += 7;
      });
    });
    doc.save("ak-premium-word-to-pdf.pdf");
    setStatus("wordPdfStatus", "Done. Word text extracted and rendered as a PDF. Complex formatting is not preserved.");
  } catch (e) { setStatus("wordPdfStatus", "Could not convert this Word file to PDF."); }
});

const pptPdfBtn = $("pptPdfBtn");
if (pptPdfBtn) pptPdfBtn.addEventListener("click", async () => {
  const file = ($("pptPdfInput").files || [])[0];
  if (!file) { setStatus("pptPdfStatus", "Please select a PowerPoint (.pptx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "pptPdfStatus") || !needLibrary(!!window.JSZip, "JSZip", "pptPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const zip = await window.JSZip.loadAsync(data);
    const slideNames = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    if (!slideNames.length) { setStatus("pptPdfStatus", "No slide text was found in this .pptx file. This basic conversion cannot read it."); return; }
    const doc = new JsPDF();
    let first = true;
    for (const name of slideNames) {
      const xml = await zip.files[name].async("string");
      const texts = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).join(" ");
      if (!first) doc.addPage(); first = false;
      doc.setFontSize(12);
      doc.text(wrapPdfText(doc, texts || "(No text on this slide)", 170), 15, 20);
    }
    doc.save("ak-premium-ppt-to-pdf.pdf");
    setStatus("pptPdfStatus", "Done. Basic slide text extracted and rendered as a PDF. Images, charts and animations are not preserved.");
  } catch (e) { setStatus("pptPdfStatus", "Could not convert this PowerPoint file to PDF. This is a basic, text-only conversion."); }
});

/* ---------- Excel Automation Engine ---------- */
let excelModule = "generator";
const excelTabBtns = document.querySelectorAll(".excel-tab-btn");
const excelHints = {
  generator: "Formula Generator: try “sum condition if”, “vlookup search table”, “average”, “countif”, “xlookup”, or “unique filter”.",
  explainer: "Formula Explainer: paste a formula such as =IF(A1>10, SUM(B1:B5), 0) and AK Premium will break it into functions and plain language.",
  vba: "VBA Macro Writer: try “userform entry form password automation”, “sort data”, “remove duplicates”, “format report”, “email report”, or “backup sheet”.",
  regex: "Regex Creator: paste text to extract emails, or describe a pattern such as email, phone, date, URL, or numbers. Also try messy dates like 12/03/2024.",
  dax: "DAX Query: try “total sales”, “average”, “count”, “year to date”, or “distinct count”."
};
excelTabBtns.forEach((btn) => btn.addEventListener("click", () => {
  excelTabBtns.forEach((b) => b.classList.toggle("active", b === btn));
  excelModule = btn.dataset.excelTab;
  const hint = $("excelHint"); if (hint) hint.textContent = excelHints[excelModule] || "";
  const input = $("excelInput");
  if (input) input.placeholder = excelModule === "explainer" ? "Paste a formula here, for example: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)" : "Describe your task in plain words…";
}));

function containsAll(text, words) { return words.every((w) => text.includes(w)); }
function generateFormula(input) {
  const t = input.toLowerCase();
  const head = "AK Premium — Formula Generator\n";
  if (containsAll(t, ["sum", "condition", "if"])) {
    return head + "=IF(condition, SUM(range1), SUM(range2))\n\nHow to use it: replace condition with your test (for example A2>100), range1 with the range to sum when the test is true, and range2 with the range to sum when it is false.";
  }
  if (containsAll(t, ["vlookup", "search", "table"])) {
    return head + "=VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])\n\nHow to use it: lookup_value is what you are searching for, table_array is the table to search, col_index_num is the column to return, and range_lookup is FALSE for an exact match or TRUE for an approximate match.";
  }
  if (t.includes("xlookup")) return head + "=XLOOKUP(lookup_value, lookup_array, return_array, \"Not found\")\n\nHow to use it: XLOOKUP searches lookup_array for lookup_value and returns the matching value from return_array. Change \"Not found\" to your own message if you like.";
  if (t.includes("index") && t.includes("match")) return head + "=INDEX(return_range, MATCH(lookup_value, lookup_range, 0))\n\nHow to use it: MATCH finds the position of lookup_value, and INDEX returns the value at that position from return_range. The 0 means exact match.";
  if (t.includes("sumif")) return head + "=SUMIF(range, criteria, sum_range)\n\nHow to use it: range is where the criteria are checked, criteria is the condition, and sum_range is what gets added up.";
  if (t.includes("countif")) return head + "=COUNTIF(range, criteria)\n\nHow to use it: range is the range to check, and criteria is the condition to count, for example \">100\" or \"Approved\".";
  if (t.includes("iferror")) return head + "=IFERROR(formula, \"\")\n\nHow to use it: put your formula in place of formula. If it errors, Excel shows the second value instead — here, an empty cell.";
  if (t.includes("average")) return head + "=AVERAGE(range)\n\nHow to use it: replace range with your numbers, for example B2:B20. AVERAGE ignores empty cells and text.";
  if (t.includes("textjoin") || t.includes("concatenate")) return head + "=TEXTJOIN(\", \", TRUE, range)\n\nHow to use it: the first value is the separator, TRUE skips empty cells, and range is the cells to join.";
  if (t.includes("date")) return head + "=DATE(year, month, day)\n\nExample for a clean date: =TEXT(A2, \"YYYY-MM-DD\")\n\nHow to use it: DATE builds a real Excel date from year, month and day. TEXT formats an existing date as YYYY-MM-DD.";
  if (t.includes("left")) return head + "=LEFT(cell, number_of_characters)\n\nHow to use it: cell is the source cell, and number_of_characters is how many characters to take from the left.";
  if (t.includes("right")) return head + "=RIGHT(cell, number_of_characters)\n\nHow to use it: cell is the source cell, and number_of_characters is how many characters to take from the right.";
  if (t.includes("mid")) return head + "=MID(cell, start_number, number_of_characters)\n\nHow to use it: cell is the source cell, start_number is where to start, and number_of_characters is how many to take.";
  if (t.includes("trim")) return head + "=TRIM(cell)\n\nHow to use it: TRIM removes extra spaces from text, keeping single spaces between words. Use =TRIM(CLEAN(cell)) to also remove non-printing characters.";
  if (t.includes("unique") || t.includes("filter")) return head + "=UNIQUE(range)\n=FILTER(range, condition_range=\"value\")\n\nHow to use it: UNIQUE lists each value once. FILTER returns only rows that meet the condition. Both need Microsoft 365 Excel.";
  if (t.includes("pivot")) return head + "=SUMIFS(sum_range, criteria_range1, criteria1)\n\nPivot-style summary: in Excel, select your data, then Insert > PivotTable, drag a field to Rows, another to Values, and choose Sum. SUMIFS above is the formula version of the same summary.";
  if (t.includes("sum")) return head + "=SUM(range)\n\nHow to use it: replace range with your numbers, for example B2:B20.";
  if (t.includes("count")) return head + "=COUNT(range)\n\nHow to use it: COUNT counts cells that contain numbers. Use COUNTA(range) to count non-empty cells, including text.";
  return head + "No exact keyword rule matched.\n\nTry keywords such as: sum, average, countif, sumif, vlookup, xlookup, index match, iferror, textjoin, date, left, right, mid, trim, unique, filter, or pivot.\n\nTemplate to adapt:\n=IF(condition, value_if_true, value_if_false)\n\nReplace condition, value_if_true and value_if_false with your own test and results. AK Premium does not guess your cell addresses.";
}

const functionHelp = {
  SUM: "SUM adds all the numbers in a range.",
  IF: "IF tests a condition and returns one value when it is true and another when it is false.",
  VLOOKUP: "VLOOKUP searches the first column of a table and returns a value from a column to its right.",
  XLOOKUP: "XLOOKUP searches a range for a value and returns the matching value from another range.",
  INDEX: "INDEX returns a value from a range at a given position.",
  MATCH: "MATCH returns the position of a value inside a range.",
  COUNTIF: "COUNTIF counts cells in a range that meet a condition.",
  SUMIF: "SUMIF adds cells in a range that meet a condition."
};
function explainFormula(input) {
  const formula = input.trim();
  if (!formula.startsWith("=")) return "AK Premium — Formula Explainer\n\nPlease paste a formula that starts with =. Example: =IF(A1>10, SUM(B1:B5), 0)";
  const fns = Array.from(formula.matchAll(/([A-Z][A-Z0-9.]*)\s*\(/g)).map((m) => m[1]);
  const uniqueFns = [...new Set(fns)];
  let out = "AK Premium — Formula Explainer\nFormula: " + formula + "\n\nFunctions found: " + (uniqueFns.join(", ") || "none") + "\n\n";
  uniqueFns.forEach((fn) => { out += fn + ": " + (functionHelp[fn] || "This function is not in the AK Premium explanation dictionary yet. Check Excel help for its exact arguments.") + "\n"; });
  out += "\nPlain-language reading: this formula starts with = and evaluates from the innermost function outward. Replace the cell references with your own ranges before using it, and test it on a copy of your data first.";
  return out;
}

function vbaAdvancedForm() {
  return `' AK Premium — Advanced VBA: UserForm-style entry with validation, hidden management sheet and password protection
' IMPORTANT: Change the placeholder password below before using this in a real workbook.
' How to use: In Excel, press Alt + F11, insert a Module, paste this code, then run StartEntry.

Option Explicit
Private Const ADMIN_PASSWORD As String = "ChangeMe123" ' <-- CHANGE THIS PASSWORD

Sub StartEntry()
    Dim ws As Worksheet, mgmt As Worksheet
    Dim nextRow As Long, i As Long
    Dim entryName As String, entryAmount As String
    Set ws = ThisWorkbook.Worksheets("Data")
    Set mgmt = GetManagementSheet()
    entryName = InputBox("Enter customer / item name:", "AK Premium Entry Form")
    If Trim(entryName) = "" Then MsgBox "Entry cancelled: name was empty.", vbInformation: Exit Sub
    entryAmount = InputBox("Enter amount (numbers only):", "AK Premium Entry Form")
    If Not IsNumeric(entryAmount) Then MsgBox "Validation failed: amount must be a number.", vbExclamation: Exit Sub
    If CDbl(entryAmount) < 0 Then MsgBox "Validation failed: amount cannot be negative.", vbExclamation: Exit Sub
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    If ws.Cells(1, 1).Value = "" Then nextRow = 2
    ws.Cells(nextRow, 1).Value = entryName
    ws.Cells(nextRow, 2).Value = CDbl(entryAmount)
    ws.Cells(nextRow, 3).Value = Date
    ' Loop example: mark any earlier blank rows in column A for review
    For i = 2 To nextRow
        If Trim(ws.Cells(i, 1).Value) = "" Then ws.Cells(i, 4).Value = "REVIEW: blank name"
    Next i
    mgmt.Cells(mgmt.Rows.Count, 1).End(xlUp).Offset(1, 0).Value = "Entry added: " & entryName & " on " & Date
    MsgBox "Saved to row " & nextRow & ".", vbInformation
End Sub

Private Function GetManagementSheet() As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets("Management")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = "Management"
        ws.Range("A1").Value = "AK Premium management log"
    End If
    ws.Visible = xlSheetVeryHidden
    Set GetManagementSheet = ws
End Function

Sub ProtectWorkbookWithPassword()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Protect Password:=ADMIN_PASSWORD, UserInterfaceOnly:=True
    Next ws
    MsgBox "Workbook sheets protected. Keep the password safe — it cannot be recovered from this code.", vbInformation
End Sub

Sub UnprotectWorkbookWithPassword()
    Dim attempt As String
    attempt = InputBox("Enter the admin password:", "AK Premium Protection")
    If attempt = ADMIN_PASSWORD Then
        Dim ws As Worksheet
        For Each ws In ThisWorkbook.Worksheets
            ws.Unprotect Password:=ADMIN_PASSWORD
        Next ws
        MsgBox "Sheets unprotected.", vbInformation
    Else
        MsgBox "Incorrect password.", vbExclamation
    End If
End Sub`;
}
function generateVba(input) {
  const t = input.toLowerCase();
  const head = "AK Premium — VBA Macro Writer\n\n";
  if (["userform", "entry", "form", "password", "automation"].some((w) => t.includes(w))) return head + vbaAdvancedForm();
  if (t.includes("sort")) return head + `' AK Premium — Sort data by column A, with headers
Sub SortData()
    Dim ws As Worksheet: Set ws = ActiveSheet
    ws.Sort.SortFields.Clear
    ws.Sort.SortFields.Add Key:=ws.Range("A2:A100"), Order:=xlAscending
    ws.Sort.SetRange ws.UsedRange
    ws.Sort.Header = xlYes
    ws.Sort.Apply
End Sub`;
  if (t.includes("duplicate")) return head + `' AK Premium — Remove duplicates from columns A to C
Sub RemoveDuplicates()
    ActiveSheet.UsedRange.RemoveDuplicates Columns:=Array(1, 2, 3), Header:=xlYes
    MsgBox "Duplicates removed.", vbInformation
End Sub`;
  if (t.includes("format")) return head + `' AK Premium — Format report: bold headers, borders, autofit
Sub FormatReport()
    Dim rng As Range: Set rng = ActiveSheet.UsedRange
    rng.Rows(1).Font.Bold = True
    rng.Borders.LineStyle = xlContinuous
    rng.Columns.AutoFit
End Sub`;
  if (t.includes("email")) return head + `' AK Premium — Email report via Outlook (Outlook must be installed)
Sub EmailReport()
    Dim ol As Object, mail As Object
    Set ol = CreateObject("Outlook.Application")
    Set mail = ol.CreateItem(0)
    mail.To = "recipient@example.com"
    mail.Subject = "AK Premium report"
    mail.Body = "Please find the report attached."
    mail.Display
End Sub`;
  if (t.includes("backup")) return head + `' AK Premium — Backup active sheet to a new workbook
Sub BackupSheet()
    ActiveSheet.Copy
    ActiveWorkbook.SaveAs Filename:=ThisWorkbook.Path & "\\AK-Premium-Backup-" & Format(Date, "yyyy-mm-dd") & ".xlsx"
    ActiveWorkbook.Close SaveChanges:=False
End Sub`;
  return head + "No exact VBA intent matched.\n\nTry: userform entry form password automation, sort data, remove duplicates, format report, email report, or backup sheet.\n\nAK Premium does not run VBA in the browser — paste the generated code into Excel (Alt + F11) and test it on a copy of your workbook first.";
}

function regexTool(input) {
  const head = "AK Premium — Regex Creator\n\n";
  const emails = input.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  const t = input.toLowerCase();
  let out = head;
  if (emails.length) out += "Emails found (" + emails.length + "):\n" + emails.join("\n") + "\n\n";
  if (t.includes("email")) out += "Email pattern: [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\n";
  if (t.includes("phone")) out += "Phone pattern (general): \\+?\\d[\\d\\s-]{7,}\\d\n";
  if (t.includes("url")) out += "URL pattern: https?:\\/\\/[^\\s/$.?#].[^\\s]*\n";
  if (t.includes("number")) out += "Number pattern: -?\\d+(\\.\\d+)?\n";
  if (t.includes("date")) out += "Date pattern (YYYY-MM-DD): \\d{4}-\\d{2}-\\d{2}\n\nMessy-date cleaning: AK Premium converts common formats below where possible.\n";
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    /(\d{1,2})-(\d{1,2})-(\d{4})/g
  ];
  let cleaned = [];
  datePatterns.forEach((re) => {
    let m;
    while ((m = re.exec(input)) !== null) {
      let y, mo, d;
      if (m[0].startsWith("20") || m[0].startsWith("19")) { y = m[1]; mo = m[2]; d = m[3]; }
      else { d = m[1]; mo = m[2]; y = m[3]; }
      const pad = (n) => String(n).padStart(2, "0");
      cleaned.push(m[0] + " -> " + y + "-" + pad(mo) + "-" + pad(d));
    }
  });
  const monthNames = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const monthMatch = input.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (monthMatch) {
    const key = monthMatch[2].slice(0, 3).toLowerCase();
    cleaned.push(monthMatch[0] + " -> " + monthMatch[3] + "-" + monthNames[key] + "-" + String(monthMatch[1]).padStart(2, "0"));
  }
  if (cleaned.length) out += "\nCleaned dates:\n" + cleaned.join("\n") + "\n";
  if (!emails.length && !cleaned.length && out === head) out += "No emails or dates were found. Try pasting text with an email address, or describe a pattern: email, phone, date, URL, or numbers.";
  out += "\nNote: patterns are templates. Test them on your own data before using them in production.";
  return out;
}

function generateDax(input) {
  const t = input.toLowerCase();
  const head = "AK Premium — DAX Query\n\n";
  if (t.includes("year") && (t.includes("date") || t.includes("ytd"))) return head + "YTD Sales = TOTALYTD(SUM(Sales[Amount]), 'Date'[Date])\n\nExplanation: TOTALYTD adds Sales Amount from the start of the year to the latest date in the Date table. Replace Sales[Amount] and 'Date'[Date] with your own table and column names.";
  if (t.includes("distinct")) return head + "Distinct Customers = DISTINCTCOUNT(Sales[CustomerID])\n\nExplanation: DISTINCTCOUNT counts each customer once, even if they appear on many rows. Replace Sales[CustomerID] with your own table and column.";
  if (t.includes("average")) return head + "Average Sales = AVERAGE(Sales[Amount])\n\nExplanation: AVERAGE returns the mean of Sales Amount in the current filter context. Replace Sales[Amount] with your own table and column.";
  if (t.includes("count")) return head + "Count Orders = COUNTROWS(Sales)\n\nExplanation: COUNTROWS counts rows in the Sales table in the current filter context. Replace Sales with your own table name.";
  if (t.includes("total") || t.includes("sales")) return head + "Total Sales = SUM(Sales[Amount])\n\nExplanation: SUM adds the Amount column. This is a measure, not a calculated column — use it in a visual or card, and it will respond to slicers and filters. Replace Sales[Amount] with your own table and column.";
  return head + "No exact DAX intent matched.\n\nTry: total sales, average, count, year to date, or distinct count.\n\nTemplate:\nTotal Sales = SUM(Sales[Amount])\n\nReplace Sales and Amount with your own table and column names. AK Premium does not connect to your Power BI model.";
}

function runExcelEngine() {
  const input = $("excelInput").value.trim();
  const output = $("excelOutput");
  const status = $("excelStatus");
  if (!input) { if (status) status.textContent = "Please describe your task or paste a formula first."; return; }
  let result = "";
  if (excelModule === "generator") result = generateFormula(input);
  else if (excelModule === "explainer") result = explainFormula(input);
  else if (excelModule === "vba") result = generateVba(input);
  else if (excelModule === "regex") result = regexTool(input);
  else if (excelModule === "dax") result = generateDax(input);
  if (output) output.textContent = result;
  if (status) status.textContent = "Done. Review the template, replace placeholders with your own ranges and names, and test it on a copy of your data first.";
}
const excelGenerateBtn = $("excelGenerateBtn");
if (excelGenerateBtn) excelGenerateBtn.addEventListener("click", runExcelEngine);
const excelCopyBtn = $("excelCopyBtn");
if (excelCopyBtn) excelCopyBtn.addEventListener("click", async () => {
  const text = $("excelOutput") ? $("excelOutput").textContent : "";
  if (!text || text.startsWith("Your generated")) { setStatus("excelStatus", "Generate an output first, then use Copy."); return; }
  try {
    await navigator.clipboard.writeText(text);
    setStatus("excelStatus", "Copied to clipboard.");
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    setStatus("excelStatus", "Copied to clipboard (fallback).");
  }
});

/* Initial state */
filterCards();
