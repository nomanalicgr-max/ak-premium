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
  if (!ok) { setStatus(statusId, name + " did not load. Check your connection and try again."); return false; }
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
// Write wrapped text across as many pages as needed, instead of clipping
// everything past the first page.
function addWrappedTextPaginated(doc, text) {
  let y = 20;
  wrapPdfText(doc, text, 170).forEach((line) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 15, y); y += 7;
  });
}

/* ---------- navigation categories + workspace (SPA) ---------- */
const navButtons = document.querySelectorAll(".nav-btn");
function showCategory(name) {
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === name));
  if (name === "faq") { const faq = $("section-faq"); if (faq) faq.scrollIntoView({ behavior: "smooth" }); return; }
  filterCards();
}
navButtons.forEach((b) => b.addEventListener("click", () => showCategory(b.dataset.category)));

/* Clicking a tool card opens its workspace panel below the grid. */
function openWorkspace(id, excelModule) {
  document.querySelectorAll(".tool-card").forEach((c) => c.classList.toggle("active", c.dataset.target === id));
  document.querySelectorAll(".workspace-tool").forEach((w) => w.classList.toggle("active", w.id === id));
  const empty = $("workspaceEmpty"); if (empty) empty.style.display = "none";
  if (excelModule) { const btn = document.querySelector('.excel-tab-btn[data-excel-tab="' + excelModule + '"]'); if (btn) btn.click(); }
  const ws = $("workspace"); if (ws) ws.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.querySelectorAll(".tool-card").forEach((card) => {
  card.addEventListener("click", () => openWorkspace(card.dataset.target, card.dataset.excelModule));
});

/* ---------- hero search: filter tool cards on every keypress ---------- */
const heroSearch = $("heroSearch");
const searchStatus = $("searchStatus");
function filterCards() {
  const query = (heroSearch ? heroSearch.value : "").trim().toLowerCase();
  const cards = document.querySelectorAll(".tool-card");
  let visible = 0; const sectionsWithVisible = new Set();
  cards.forEach((card) => {
    const hay = ((card.dataset.keywords || "") + " " + card.textContent).toLowerCase();
    const show = !query || hay.includes(query);
    card.style.display = show ? "" : "none";
    if (show) { visible++; const sec = card.closest(".tool-section"); if (sec) sectionsWithVisible.add(sec.id); }
  });
  if (searchStatus) { searchStatus.textContent = query ? "Found " + visible + " tool(s) matching \"" + heroSearch.value.trim() + "\"." : "Showing all tools."; }
  const sectionIds = ["section-pdf", "section-convert", "section-excel", "section-image", "section-everyday", "section-developer", "section-calculators"];
  if (query) {
    sectionIds.forEach((id) => { const sec = $(id); if (sec) sec.style.display = sectionsWithVisible.has(id) ? "" : "none"; });
  } else {
    const activeNav = document.querySelector(".nav-btn.active");
    const cat = activeNav ? activeNav.dataset.category : "all";
    if (cat !== "faq") {
      sectionIds.forEach((id) => { const sec = $(id); if (!sec) return; const show = cat === "all" || (cat === "pdf" && (id === "section-pdf" || id === "section-convert")) || (cat === "excel" && id === "section-excel"); sec.style.display = show ? "" : "none"; });
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
    setStatus("mergePdfStatus", "Done. Merged PDF downloaded.");
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
    setStatus("splitPdfStatus", "Done. Split PDF downloaded.");
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
    // Add to the page's existing rotation instead of replacing it, so a
    // page already rotated 90 degrees becomes 180, not 90 again.
    doc.getPages().forEach((page) => {
      const current = page.getRotation().angle || 0;
      page.setRotation(window.PDFLib.degrees((current + angle) % 360));
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-rotated.pdf");
    setStatus("rotatePdfStatus", "Done. Rotated PDF downloaded.");
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
    setStatus("pageNumbersStatus", "Done. Numbered PDF downloaded.");
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
    setStatus("compressPdfStatus", "Done. Re-saved: " + bytes.length + " bytes (was " + file.size + " bytes).");
  } catch (e) { setStatus("compressPdfStatus", "Could not compress this PDF. Please check the file."); }
});

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */
function parsePageSelection(input, count) {
  const remove = new Set();
  const tokens = String(input || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return { error: "Please enter page numbers, for example 2, 4-5." };
  for (const token of tokens) {
    if (token.includes("-")) {
      const parts = token.split("-").map((s) => s.trim());
      if (parts.length !== 2) return { error: "Invalid range: " + token + ". Use a range like 4-5." };
      const a = parseInt(parts[0], 10), b = parseInt(parts[1], 10);
      if (!a || !b || b < a || a < 1 || b > count) return { error: "Range " + token + " is outside 1 to " + count + "." };
      for (let i = a; i <= b; i++) remove.add(i);
    } else {
      const n = parseInt(token, 10);
      if (!n || String(n) !== token || n < 1 || n > count) return { error: "Page " + token + " is outside 1 to " + count + "." };
      remove.add(n);
    }
  }
  if (remove.size >= count) return { error: "You cannot remove every page. Keep at least one page." };
  return { remove };
}
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
  } catch (e) { setStatus("removePagesStatus", "Could not remove pages from this PDF."); }
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
  } catch (e) { setStatus("watermarkStatus", "Could not add a watermark to this PDF."); }
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
    setStatus("pdfTextStatus", "Done. Text file downloaded.");
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
  } catch (e) { setStatus("pdfImagesStatus", "Could not render this PDF to images. Please check the file."); }
});

/* ---------- e-Sign canvas ---------- */
const esignCanvas = $("esignCanvas");
if (esignCanvas) {
  const ctx = esignCanvas.getContext("2d");
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
    setStatus("pdfExcelStatus", "Done. Excel file downloaded.");
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
    // docx v8 Paragraph takes an options object, not a bare string.
    const doc = new window.docx.Document({ sections: [{ children: text.split("\n").map((line) => new window.docx.Paragraph({ text: line })) }] });
    const blob = await window.docx.Packer.toBlob(doc);
    downloadBlob(blob, "ak-premium-pdf-to-word.docx");
    setStatus("pdfWordStatus", "Done. Word file downloaded.");
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
    setStatus("pdfPptStatus", "Done. Presentation file downloaded.");
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
  addWrappedTextPaginated(doc, clean);
  doc.save("ak-premium-text-to-pdf.pdf");
  setStatus("txtHtmlPdfStatus", "Done. PDF downloaded.");
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
    if (!wb.SheetNames || !wb.SheetNames.length) { setStatus("excelPdfStatus", "No sheets were found in this Excel file."); return; }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows.length) { setStatus("excelPdfStatus", "The first sheet is empty. Nothing to convert."); return; }
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
    setStatus("excelPdfStatus", "Done. PDF downloaded.");
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
    if (!result.value || !result.value.trim()) { setStatus("wordPdfStatus", "No text was found in this Word file. Nothing to convert."); return; }
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
    setStatus("wordPdfStatus", "Done. PDF downloaded.");
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
    setStatus("pptPdfStatus", "Done. PDF downloaded.");
  } catch (e) { setStatus("pptPdfStatus", "Could not convert this PowerPoint file to PDF. This is a basic, text-only conversion."); }
});

/* ---------- New spreadsheet tools: Excel to CSV + CSV to Excel ---------- */
const excelCsvBtn = $("excelCsvBtn");
if (excelCsvBtn) excelCsvBtn.addEventListener("click", async () => {
  const file = ($("excelCsvInput").files || [])[0];
  if (!file) { setStatus("excelCsvStatus", "Please select an Excel file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "excelCsvStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(data, { type: "array" });
    if (!wb.SheetNames || !wb.SheetNames.length) { setStatus("excelCsvStatus", "No sheets were found in this Excel file."); return; }
    const csv = window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
    if (!csv.trim()) { setStatus("excelCsvStatus", "The first sheet is empty. Nothing to export."); return; }
    downloadText(csv, "ak-premium-sheet.csv", "text/csv;charset=utf-8");
    setStatus("excelCsvStatus", "Done. CSV downloaded (first sheet).");
  } catch (e) { setStatus("excelCsvStatus", "Could not convert this Excel file to CSV."); }
});

const csvExcelBtn = $("csvExcelBtn");
if (csvExcelBtn) csvExcelBtn.addEventListener("click", async () => {
  if (!needLibrary(!!window.XLSX, "SheetJS", "csvExcelStatus")) return;
  let csvText = "";
  const file = ($("csvExcelInput").files || [])[0];
  try {
    if (file) csvText = await file.text();
    else csvText = ($("csvExcelText").value || "").trim();
    if (!csvText) { setStatus("csvExcelStatus", "Please upload a .csv file or paste CSV text first."); return; }
    let wb = null;
    try { wb = window.XLSX.read(csvText, { type: "string" }); } catch (e) { wb = null; }
    if (!wb || !wb.SheetNames || !wb.SheetNames.length || !wb.Sheets[wb.SheetNames[0]] || !Object.keys(wb.Sheets[wb.SheetNames[0]]).length) {
      // Fallback: simple line/comma split for plain CSV without quoted commas.
      const rows = csvText.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(","));
      const ws = window.XLSX.utils.aoa_to_sheet(rows);
      wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    }
    window.XLSX.writeFile(wb, "ak-premium-csv-to-excel.xlsx");
    setStatus("csvExcelStatus", "Done. Excel file downloaded.");
  } catch (e) { setStatus("csvExcelStatus", "Could not convert this CSV to Excel."); }
});

/* ---------- Excel Automation Engine ---------- */
let excelModule = "generator";
const excelTabBtns = document.querySelectorAll(".excel-tab-btn");
const excelHints = {
  generator: "Formula Generator: try sum condition if or vlookup search table.",
  explainer: "Formula Explainer: paste a formula starting with =.",
  vba: "VBA Macro Writer: try userform entry form password automation or sort data.",
  regex: "Regex Creator: paste text, or describe a pattern such as email or date.",
  dax: "DAX Query: try total sales, average, or year to date."
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
  if (status) status.textContent = "Done. Replace placeholders before use.";
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

/* ---------- Phase 1 tools: pure logic (testable) ---------- */
function parseOrganizeOrder(input, count) {
  const tokens = String(input || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return { error: "Please enter a page order, for example 3,1,2." };
  const order = [];
  for (const token of tokens) {
    const n = parseInt(token, 10);
    if (!n || String(n) !== token || n < 1 || n > count) return { error: "Page " + token + " is outside 1 to " + count + "." };
    order.push(n);
  }
  if (order.length !== count) return { error: "The order must list every page from 1 to " + count + " exactly once." };
  if (new Set(order).size !== count) return { error: "Duplicate page in the order. List every page from 1 to " + count + " exactly once." };
  return { order };
}
function countWords(text) {
  const s = String(text || "");
  const trimmed = s.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = s.length;
  const charsNoSpaces = s.replace(/\s/g, "").length;
  const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+/g) || (trimmed ? [trimmed] : [])).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((x) => x.trim()).length : 0;
  const readingMinutes = Math.ceil(words / 200);
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingMinutes };
}
function prettyJson(text) { return JSON.stringify(JSON.parse(text), null, 2); }
function minifyJson(text) { return JSON.stringify(JSON.parse(text)); }
function base64EncodeText(text) {
  const bytes = new TextEncoder().encode(String(text));
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}
function base64DecodeText(text) {
  const clean = String(text || "").replace(/\s/g, "");
  if (!clean || clean.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error("Invalid Base64 text.");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function calculateAge(dobStr, todayStr) {
  const dob = new Date(dobStr + "T00:00:00");
  if (isNaN(dob.getTime())) return { error: "Please choose a valid date of birth." };
  const today = todayStr ? new Date(todayStr + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return { error: "Date of birth cannot be in the future." };
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthLast = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLast;
  }
  if (months < 0) { years -= 1; months += 12; }
  return { years, months, days };
}
function percentageCalc(mode, x, y) {
  if (isNaN(x) || isNaN(y)) return { error: "Please enter numbers for both X and Y." };
  if (mode === "of") return { value: (x / 100) * y, text: x + "% of " + y + " = " + ((x / 100) * y) };
  if (mode === "share") {
    if (y === 0) return { error: "Y cannot be zero for this calculation." };
    return { value: (x / y) * 100, text: x + " is " + ((x / y) * 100) + "% of " + y };
  }
  if (mode === "change") {
    if (x === 0) return { error: "X cannot be zero for a percentage change." };
    const v = ((y - x) / Math.abs(x)) * 100;
    return { value: v, text: "Percentage change from " + x + " to " + y + " = " + v + "%" };
  }
  return { error: "Please choose a calculation type." };
}
function bmiCalc(heightCm, weightKg) {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return { error: "Please enter a positive height and weight." };
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  const rounded = Math.round(bmi * 10) / 10;
  let category = "Obese";
  if (rounded < 18.5) category = "Underweight";
  else if (rounded < 25) category = "Normal";
  else if (rounded < 30) category = "Overweight";
  return { bmi: rounded, category };
}
function defaultRandInt(n) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
  }
  throw new Error("Secure random numbers are not available in this browser.");
}
function generatePassword(length, opts, randInt) {
  const rand = randInt || defaultRandInt;
  const sets = [];
  if (opts.upper) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (opts.lower) sets.push("abcdefghijklmnopqrstuvwxyz");
  if (opts.numbers) sets.push("0123456789");
  if (opts.symbols) sets.push("!@#$%^&*()-_=+[]{};:,.<>?");
  if (!sets.length) return { error: "Please select at least one character set." };
  if (length < sets.length) return { error: "Length must be at least the number of selected character sets." };
  const all = sets.join("");
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = rand(i + 1); const tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp; }
  return { password: chars.join("") };
}
function passwordStrengthNote(length, setCount) {
  if (length >= 16 && setCount >= 4) return "Strong: long, with all character types.";
  if (length >= 12 && setCount >= 3) return "Good: use 16+ characters with all types for best strength.";
  return "Weak: use a longer password with more character types.";
}
function copyTextToClipboard(text, statusId, doneMessage) {
  const done = doneMessage || "Copied to clipboard.";
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => setStatus(statusId, done)).catch(() => {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); setStatus(statusId, done);
    });
  }
  const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); setStatus(statusId, done);
  return Promise.resolve();
}
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load failed")); };
    img.src = url;
  });
}
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/* ---------- Phase 1 handlers: PDF ---------- */
const organizeBtn = $("organizeBtn");
if (organizeBtn) organizeBtn.addEventListener("click", async () => {
  const file = ($("organizeInput").files || [])[0];
  if (!file) { setStatus("organizeStatus", "Please select a PDF file first."); return; }
  try {
    const src = await loadPdfLibDoc(file, "organizeStatus");
    if (!src) return;
    const count = src.getPageCount();
    const parsed = parseOrganizeOrder($("organizeOrder").value, count);
    if (parsed.error) { setStatus("organizeStatus", parsed.error); return; }
    const out = await window.PDFLib.PDFDocument.create();
    const pages = await out.copyPages(src, parsed.order.map((n) => n - 1));
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-organized.pdf");
    setStatus("organizeStatus", "Done. Reordered PDF downloaded.");
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

/* ---------- Phase 1 handlers: Image ---------- */
const imgCompressQuality = $("imgCompressQuality");
if (imgCompressQuality) imgCompressQuality.addEventListener("input", () => {
  const label = $("imgCompressQualityLabel"); if (label) label.textContent = imgCompressQuality.value + "%";
});
const imgCompressBtn = $("imgCompressBtn");
if (imgCompressBtn) imgCompressBtn.addEventListener("click", async () => {
  const files = Array.from($("imgCompressInput").files || []);
  if (!files.length) { setStatus("imgCompressStatus", "Please select at least one image first."); return; }
  const quality = (parseInt($("imgCompressQuality").value, 10) || 80) / 100;
  const out = $("imgCompressOutput"); if (out) out.innerHTML = "";
  setStatus("imgCompressStatus", "Compressing " + files.length + " image(s)…");
  try {
    const blobs = [];
    for (let i = 0; i < files.length; i++) {
      const img = await loadImageFromFile(files[i]);
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob) { setStatus("imgCompressStatus", "This browser could not encode a JPEG. Please try again."); return; }
      const name = "ak-premium-compressed-" + (i + 1) + ".jpg"; blobs.push({ name, blob });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      a.textContent = "Download " + name + " (" + files[i].size + " bytes -> " + blob.size + " bytes)";
      if (out) { out.appendChild(a); out.appendChild(document.createElement("br")); }
    }
    if (window.JSZip && blobs.length > 1) {
      const zip = new window.JSZip(); blobs.forEach((b) => zip.file(b.name, b.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-compressed.zip");
    }
    setStatus("imgCompressStatus", "Done. JPEG output flattens transparency.");
  } catch (e) { setStatus("imgCompressStatus", "Could not compress these images. Please try JPG or PNG files."); }
});

let resizeOriginal = null;
const imgResizeInput = $("imgResizeInput");
if (imgResizeInput) imgResizeInput.addEventListener("change", async () => {
  const file = (imgResizeInput.files || [])[0]; if (!file) return;
  try {
    const img = await loadImageFromFile(file);
    resizeOriginal = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    if ($("imgResizeWidth")) $("imgResizeWidth").value = resizeOriginal.w;
    if ($("imgResizeHeight")) $("imgResizeHeight").value = resizeOriginal.h;
    setStatus("imgResizeStatus", "Original size: " + resizeOriginal.w + " x " + resizeOriginal.h + " px.");
  } catch (e) { setStatus("imgResizeStatus", "Could not read this image."); }
});
const imgResizeWidth = $("imgResizeWidth");
if (imgResizeWidth) imgResizeWidth.addEventListener("input", () => {
  if ($("imgResizeKeep") && $("imgResizeKeep").checked && resizeOriginal) {
    const w = parseInt(imgResizeWidth.value, 10);
    if (w > 0 && $("imgResizeHeight")) $("imgResizeHeight").value = Math.round((w * resizeOriginal.h) / resizeOriginal.w);
  }
});
const imgResizeHeight = $("imgResizeHeight");
if (imgResizeHeight) imgResizeHeight.addEventListener("input", () => {
  if ($("imgResizeKeep") && $("imgResizeKeep").checked && resizeOriginal) {
    const h = parseInt(imgResizeHeight.value, 10);
    if (h > 0 && $("imgResizeWidth")) $("imgResizeWidth").value = Math.round((h * resizeOriginal.w) / resizeOriginal.h);
  }
});
const imgResizeBtn = $("imgResizeBtn");
if (imgResizeBtn) imgResizeBtn.addEventListener("click", async () => {
  const file = ($("imgResizeInput").files || [])[0];
  if (!file) { setStatus("imgResizeStatus", "Please select an image first."); return; }
  const w = parseInt($("imgResizeWidth").value, 10), h = parseInt($("imgResizeHeight").value, 10);
  if (!w || !h || w < 1 || h < 1 || w > 8000 || h > 8000) { setStatus("imgResizeStatus", "Please enter a width and height between 1 and 8000 px."); return; }
  const format = $("imgResizeFormat").value;
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, format === "jpeg" ? "image/jpeg" : "image/png", 0.92);
    if (!blob) { setStatus("imgResizeStatus", "This browser could not encode this format."); return; }
    downloadBlob(blob, "ak-premium-resized." + format);
    setStatus("imgResizeStatus", "Done. Resized image downloaded (" + w + " x " + h + " px).");
  } catch (e) { setStatus("imgResizeStatus", "Could not resize this image."); }
});

const imgConvertBtn = $("imgConvertBtn");
if (imgConvertBtn) imgConvertBtn.addEventListener("click", async () => {
  const file = ($("imgConvertInput").files || [])[0];
  if (!file) { setStatus("imgConvertStatus", "Please select an image first."); return; }
  const format = $("imgConvertFormat").value;
  const mime = format === "jpg" ? "image/jpeg" : (format === "png" ? "image/png" : "image/webp");
  try {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, mime, 0.92);
    if (!blob) { setStatus("imgConvertStatus", "This browser cannot encode " + format.toUpperCase() + ". Please choose PNG or JPG."); return; }
    downloadBlob(blob, "ak-premium-converted." + format);
    setStatus("imgConvertStatus", "Done. Converted image downloaded.");
  } catch (e) { setStatus("imgConvertStatus", "Could not convert this image."); }
});

const ocrBtn = $("ocrBtn");
if (ocrBtn) ocrBtn.addEventListener("click", async () => {
  const file = ($("ocrInput").files || [])[0];
  if (!file) { setStatus("ocrStatus", "Please select an image first."); return; }
  if (!window.Tesseract) { setStatus("ocrStatus", "OCR library (Tesseract.js) did not load. Check your connection and try again."); return; }
  setStatus("ocrStatus", "Working… first run downloads language data and may take time.");
  try {
    const result = await window.Tesseract.recognize(file, "eng", {
      logger: (m) => { if (m && m.status === "recognizing text" && typeof m.progress === "number") setStatus("ocrStatus", "Working… " + Math.round(m.progress * 100) + "%."); }
    });
    const text = (result && result.data && result.data.text ? result.data.text : "").trim();
    if ($("ocrOutput")) $("ocrOutput").textContent = text || "(No text recognized in this image.)";
    setStatus("ocrStatus", text ? "Done. Text recognized." : "Done. No text recognized in this image.");
  } catch (e) { setStatus("ocrStatus", "OCR failed. Please try a clear image with printed text."); }
});
const ocrCopyBtn = $("ocrCopyBtn");
if (ocrCopyBtn) ocrCopyBtn.addEventListener("click", () => {
  const text = $("ocrOutput") ? $("ocrOutput").textContent : "";
  if (!text || text.startsWith("Recognized text")) { setStatus("ocrStatus", "Read text from an image first, then use Copy."); return; }
  copyTextToClipboard(text, "ocrStatus");
});

/* ---------- Phase 1 handlers: Everyday ---------- */
let qrGenerated = false;
const qrBtn = $("qrBtn");
if (qrBtn) qrBtn.addEventListener("click", () => {
  const text = ($("qrText").value || "").trim();
  if (!text) { setStatus("qrStatus", "Please enter text or a URL first."); return; }
  if (!window.QRCode || !window.QRCode.toCanvas) { setStatus("qrStatus", "QR library did not load. Check your connection and try again."); return; }
  const canvas = $("qrCanvas");
  window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1 }, (err) => {
    if (err) { setStatus("qrStatus", "Could not generate this QR code. Please try shorter text."); return; }
    qrGenerated = true; setStatus("qrStatus", "Done. QR code generated.");
  });
});
const qrDownloadBtn = $("qrDownloadBtn");
if (qrDownloadBtn) qrDownloadBtn.addEventListener("click", () => {
  if (!qrGenerated) { setStatus("qrStatus", "Generate a QR code first, then download it."); return; }
  $("qrCanvas").toBlob((blob) => {
    if (!blob) { setStatus("qrStatus", "Could not download this QR code."); return; }
    downloadBlob(blob, "ak-premium-qr.png"); setStatus("qrStatus", "Done. QR PNG downloaded.");
  }, "image/png");
});

const pwdLength = $("pwdLength");
if (pwdLength) pwdLength.addEventListener("input", () => { const l = $("pwdLengthLabel"); if (l) l.textContent = pwdLength.value; });
const pwdBtn = $("pwdBtn");
if (pwdBtn) pwdBtn.addEventListener("click", () => {
  const length = parseInt($("pwdLength").value, 10) || 16;
  const opts = { upper: !!$("pwdUpper").checked, lower: !!$("pwdLower").checked, numbers: !!$("pwdNumbers").checked, symbols: !!$("pwdSymbols").checked };
  const setCount = Object.values(opts).filter(Boolean).length;
  const result = generatePassword(length, opts);
  if (result.error) { setStatus("pwdStatus", result.error); return; }
  if ($("pwdOutput")) $("pwdOutput").textContent = result.password;
  setStatus("pwdStatus", "Done. " + passwordStrengthNote(length, setCount));
});
const pwdCopyBtn = $("pwdCopyBtn");
if (pwdCopyBtn) pwdCopyBtn.addEventListener("click", () => {
  const text = $("pwdOutput") ? $("pwdOutput").textContent : "";
  if (!text || text.startsWith("Your password")) { setStatus("pwdStatus", "Generate a password first, then use Copy."); return; }
  copyTextToClipboard(text, "pwdStatus");
});

const wordCountInput = $("wordCountInput");
if (wordCountInput) wordCountInput.addEventListener("input", () => {
  const c = countWords(wordCountInput.value);
  const out = $("wordCountOutput");
  if (out) out.textContent = "Words: " + c.words + " | Characters: " + c.chars + " | Characters (no spaces): " + c.charsNoSpaces + " | Sentences: " + c.sentences + " | Paragraphs: " + c.paragraphs + " | Reading time: " + c.readingMinutes + " min";
});

/* ---------- Phase 1 handlers: Developer ---------- */
const jsonFormatBtn = $("jsonFormatBtn");
if (jsonFormatBtn) jsonFormatBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = prettyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON formatted."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});
const jsonMinifyBtn = $("jsonMinifyBtn");
if (jsonMinifyBtn) jsonMinifyBtn.addEventListener("click", () => {
  try { $("jsonOutput").textContent = minifyJson($("jsonInput").value); setStatus("jsonStatus", "Done. JSON minified."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});
const jsonValidateBtn = $("jsonValidateBtn");
if (jsonValidateBtn) jsonValidateBtn.addEventListener("click", () => {
  try { JSON.parse($("jsonInput").value); $("jsonOutput").textContent = "Valid JSON."; setStatus("jsonStatus", "Done. JSON is valid."); }
  catch (e) { setStatus("jsonStatus", "Invalid JSON: " + e.message); }
});
const jsonCopyBtn = $("jsonCopyBtn");
if (jsonCopyBtn) jsonCopyBtn.addEventListener("click", () => {
  const text = $("jsonOutput") ? $("jsonOutput").textContent : "";
  if (!text || text.startsWith("Formatted JSON")) { setStatus("jsonStatus", "Format, minify or validate JSON first, then use Copy."); return; }
  copyTextToClipboard(text, "jsonStatus");
});

const base64EncodeBtn = $("base64EncodeBtn");
if (base64EncodeBtn) base64EncodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64EncodeText($("base64Input").value); setStatus("base64Status", "Done. Text encoded."); }
  catch (e) { setStatus("base64Status", "Could not encode this text."); }
});
const base64DecodeBtn = $("base64DecodeBtn");
if (base64DecodeBtn) base64DecodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64DecodeText($("base64Input").value); setStatus("base64Status", "Done. Text decoded."); }
  catch (e) { setStatus("base64Status", "Invalid Base64: " + e.message); }
});
const base64CopyBtn = $("base64CopyBtn");
if (base64CopyBtn) base64CopyBtn.addEventListener("click", () => {
  const text = $("base64Output") ? $("base64Output").textContent : "";
  if (!text || text.startsWith("Result will")) { setStatus("base64Status", "Encode or decode text first, then use Copy."); return; }
  copyTextToClipboard(text, "base64Status");
});

/* ---------- Phase 1 handlers: Calculators ---------- */
const ageBtn = $("ageBtn");
if (ageBtn) ageBtn.addEventListener("click", () => {
  const result = calculateAge($("ageDob").value);
  if (result.error) { setStatus("ageStatus", result.error); return; }
  if ($("ageOutput")) $("ageOutput").textContent = "Age: " + result.years + " years, " + result.months + " months, " + result.days + " days.";
  setStatus("ageStatus", "Done.");
});
const percentBtn = $("percentBtn");
if (percentBtn) percentBtn.addEventListener("click", () => {
  const result = percentageCalc($("percentMode").value, parseFloat($("percentX").value), parseFloat($("percentY").value));
  if (result.error) { setStatus("percentStatus", result.error); return; }
  if ($("percentOutput")) $("percentOutput").textContent = result.text;
  setStatus("percentStatus", "Done.");
});
const bmiBtn = $("bmiBtn");
if (bmiBtn) bmiBtn.addEventListener("click", () => {
  const result = bmiCalc(parseFloat($("bmiHeight").value), parseFloat($("bmiWeight").value));
  if (result.error) { setStatus("bmiStatus", result.error); return; }
  if ($("bmiOutput")) $("bmiOutput").textContent = "BMI: " + result.bmi + " (" + result.category + ")";
  setStatus("bmiStatus", "Done.");
});

