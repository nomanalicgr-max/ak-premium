/* AK Premium v4 - client-side application logic.
   AK Premium runs entirely in the browser. No file is uploaded by AK Premium.
   Site settings live in /config.js (SITE_NAME, SITE_URL, CONTACT_EMAIL,
   ADSENSE_CLIENT_ID, GA_MEASUREMENT_ID). Ads and analytics stay disabled
   while their IDs are empty, and consent-gated by common.js. */
const AK_CFG = window.AK_CONFIG || {};
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
/* Lazy-load a library only on the page that needs it. Pinned versions in LIB_URLS. */
const LIB_URLS = {
  "pdf-lib": "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "pdfjs": "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "xlsx": "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "jszip": "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
  "mammoth": "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  "docx": "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js",
  "pptxgenjs": "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
  "tesseract": "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "qrcode": "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "jspdf": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
};
const _libLoaded = {};
function loadLibrary(name, statusId) {
  if (window[name === "pdfjs" ? "pdfjsLib" : name === "jspdf" ? "jspdf" : name === "qrcode" ? "QRCode" : name] || _libLoaded[name]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const sc = document.createElement("script");
    sc.src = LIB_URLS[name]; sc.async = true;
    sc.onload = () => { _libLoaded[name] = true; resolve(true); };
    sc.onerror = () => { setStatus(statusId, "Could not load the " + name + " library. Check your connection and try again."); resolve(false); };
    document.head.appendChild(sc);
  });
}
async function ensurePdfJs(statusId) {
  if (window.pdfjsLib) return true;
  const ok = await loadLibrary("pdfjs", statusId);
  if (ok && window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return ok;
}
const MAX_FILE_BYTES = 50 * 1024 * 1024; /* 50 MB per file, browser memory guard */
function checkFileSize(file, statusId) {
  if (!file) return false;
  if (file.size > MAX_FILE_BYTES) { setStatus(statusId, "That file is " + (file.size / 1048576).toFixed(1) + " MB. Please use a file under 50 MB so the browser can process it."); return false; }
  return true;
}
function setProgress(id, pct) { const el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + "%"; }
function humanBytes(n) { if (n < 1024) return n + " B"; if (n < 1048576) return (n / 1024).toFixed(1) + " KB"; return (n / 1048576).toFixed(2) + " MB"; }

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
/* Category pages: one section per category, shareable via URL hash.
   Categories are views of this single page, not separate HTML files:
   #pdf, #convert, #excel, #image, #everyday, #developer, #calculators,
   #business, #design, #faq. "All Tools" shows everything, no hash. */
const CATEGORY_SECTIONS = {
  pdf: ["section-pdf"],
  convert: ["section-convert"],
  excel: ["section-excel"],
  image: ["section-image"],
  everyday: ["section-everyday"],
  developer: ["section-developer"],
  calculators: ["section-calculators"],
  business: ["section-business"],
  design: ["section-design"],
  faq: ["section-faq"]
};
const ALL_SECTION_IDS = ["section-pdf", "section-convert", "section-excel", "section-image", "section-everyday", "section-developer", "section-calculators", "section-business", "section-design", "section-faq"];
function categoryFromHash(hash) {
  const name = String(hash || "").replace(/^#/, "");
  return CATEGORY_SECTIONS[name] ? name : null;
}
function applyCategoryVisibility(name) {
  const ids = name === "all" ? ALL_SECTION_IDS : (CATEGORY_SECTIONS[name] || ALL_SECTION_IDS);
  ALL_SECTION_IDS.forEach((id) => { const sec = $(id); if (sec) sec.style.display = ids.indexOf(id) !== -1 ? "" : "none"; });
  const ws = $("workspace");
  if (ws) ws.style.display = (name === "faq") ? "none" : "";
}
function showCategory(name, opts) {
  const options = opts || {};
  navButtons.forEach((b) => b.classList.toggle("active", b.dataset.category === name));
  if (typeof history !== "undefined" && history.replaceState) {
    try {
      if (name === "all") history.replaceState(null, "", window.location.pathname + window.location.search);
      else history.replaceState(null, "", "#" + name);
    } catch (e) { /* hash update is a convenience, never a blocker */ }
  }
  if (name === "faq") {
    applyCategoryVisibility("faq");
    const faq = $("section-faq");
    if (faq && options.scroll !== false && faq.scrollIntoView) faq.scrollIntoView({ behavior: "smooth" });
    return;
  }
  filterCards();
}
const navButtons = document.querySelectorAll(".nav-btn");
navButtons.forEach((b) => b.addEventListener("click", () => showCategory(b.dataset.category)));
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("hashchange", () => {
    const h = window.location.hash || "";
    if (h.indexOf("#tool-") === 0) { const tid = h.replace("#tool-", ""); if (document.getElementById(tid)) { openWorkspace(tid); return; } }
    const name = categoryFromHash(window.location.hash);
    if (name) showCategory(name, { scroll: false });
  });
}

/* ilovepdf-style category tabs: filter PDF cards by data-ilove, plus all other cards stay visible for 'all' */
let currentIlove = "all";
document.querySelectorAll(".ilove-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ilove-tab").forEach((t) => t.classList.toggle("active", t === tab));
    currentIlove = tab.dataset.ilove || "all";
    const activeNav = document.querySelector(".nav-btn.active");
    if (activeNav && activeNav.dataset.category !== "all") { document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.category === "all")); }
    filterCards();
  });
});
const _origFilterCards = null;
/* Clicking a tool card opens its workspace panel below the grid. */
function closeToolPage() {
  document.body.classList.remove("tool-open");
  document.querySelectorAll(".tool-card").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll(".workspace-tool").forEach((w) => w.classList.remove("active"));
  const empty = $("workspaceEmpty"); if (empty) empty.style.display = "";
  try { if (typeof history !== "undefined" && history.replaceState) history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
  const top = $("top"); if (top && top.scrollIntoView) top.scrollIntoView({ behavior: "smooth" });
  filterCards();
}
function openWorkspace(id, excelModule) {
  document.querySelectorAll(".tool-card").forEach((c) => c.classList.toggle("active", c.dataset.target === id));
  document.querySelectorAll(".workspace-tool").forEach((w) => w.classList.toggle("active", w.id === id));
  const empty = $("workspaceEmpty"); if (empty) empty.style.display = "none";
  if (excelModule) { const btn = document.querySelector('.excel-tab-btn[data-excel-tab="' + excelModule + '"]'); if (btn) btn.click(); }
  // Dedicated tool page, like iLovePDF: hide the grid, show this tool on its own.
  const card = document.querySelector('.tool-card[data-target="' + id + '"]');
  const titleEl = $("toolPageTitle"); const descEl = $("toolPageDesc");
  if (titleEl && card) titleEl.textContent = (card.querySelector("strong") ? card.querySelector("strong").textContent : id);
  if (descEl && card) { const spans = card.querySelectorAll("span"); descEl.textContent = spans.length ? spans[spans.length-1].textContent : ""; }
  document.body.classList.add("tool-open");
  try { if (typeof history !== "undefined" && history.replaceState) history.replaceState(null, "", "#tool-" + id); } catch (e) {}
  const ws = $("workspace"); if (ws) { ws.style.display = ""; }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
const toolBackBtn = $("toolBackBtn");
if (toolBackBtn) toolBackBtn.addEventListener("click", closeToolPage);
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
    // Search wins over the PDF tab filter: a trending chip like "VBA Macro Writer"
    // must find its tool even when a PDF tab (e.g. PDF Intelligence) was active before.
    const show = query ? hay.includes(query) : (currentIlove === "all" || card.dataset.ilove === currentIlove);
    card.style.display = show ? "" : "none";
    if (show) { visible++; const sec = card.closest(".tool-section"); if (sec) sectionsWithVisible.add(sec.id); }
  });
  if (searchStatus) { searchStatus.textContent = query ? "Found " + visible + " tool(s) matching \"" + heroSearch.value.trim() + "\"." : "Showing all tools."; }
  if (query) {
    // Search wins over the selected category page: show every section
    // that has a matching card, whatever page the user is on.
    ALL_SECTION_IDS.forEach((id) => { const sec = $(id); if (sec) sec.style.display = sectionsWithVisible.has(id) ? "" : "none"; });
    const ws = $("workspace"); if (ws) ws.style.display = "";
  } else if (currentIlove !== "all") {
    ALL_SECTION_IDS.forEach((id) => { const sec = $(id); if (sec) sec.style.display = sectionsWithVisible.has(id) ? "" : "none"; });
  } else {
    const activeNav = document.querySelector(".nav-btn.active");
    const cat = activeNav ? activeNav.dataset.category : "all";
    applyCategoryVisibility(cat);
  }
  return visible;
}
if (heroSearch) heroSearch.addEventListener("input", filterCards);
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    currentIlove = "all";
    document.querySelectorAll(".ilove-tab").forEach((t) => t.classList.toggle("active", t.dataset.ilove === "all"));
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
let mergeOrder = [];
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
  } catch (e) { setStatus("mergePdfStatus", "Could not merge these PDFs. Please check that every file is a valid PDF."); }
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
  } catch (e) { setStatus("splitPdfStatus", "Could not split this PDF. Please check the file and page ranges."); }
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
  if (!checkFileSize(file, "compressPdfStatus")) return;
  const level = $("compressLevel") ? $("compressLevel").value : "light";
  const quality = parseInt(($("compressQuality") || {}).value || "70", 10) / 100;
  try {
    if (level === "light") {
      const doc = await loadPdfLibDoc(file, "compressPdfStatus");
      if (!doc) return;
      const bytes = await doc.save({ useObjectStreams: true });
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-compressed.pdf");
      const saved = Math.max(0, Math.round((1 - bytes.length / file.size) * 100));
      setStatus("compressPdfStatus", "Done. Light: " + humanBytes(file.size) + " to " + humanBytes(bytes.length) + " (" + saved + "% smaller). Text stays selectable.");
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
    const saved = Math.max(0, Math.round((1 - outBytes.length / file.size) * 100));
    setStatus("compressPdfStatus", "Done. " + (level === "strong" ? "Strong" : "Medium") + ": " + humanBytes(file.size) + " to " + humanBytes(outBytes.length) + " (" + saved + "% smaller). Warning: pages are now images, so text is not selectable and cannot be searched.");
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

/* Group pdf.js text items into lines by y-coordinate (within 3pt) and sort
   each line by x, so paragraphs and simple tables keep their shape instead
   of collapsing into one long string. Returns [{page, lines:[{y, text, items}]}]. */
async function extractPdfLines(file, statusId) {
  if (!(await ensurePdfJs(statusId))) return null;
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => (it.str || "").trim()).map((it) => ({
      str: it.str, x: it.transform[4], y: it.transform[5],
      w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 12, transform: it.transform
    }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      let line = lines.find((l) => Math.abs(l.y - it.y) < 3);
      if (!line) { line = { y: it.y, items: [] }; lines.push(line); }
      line.items.push(it);
    }
    lines.forEach((l) => { l.items.sort((a, b) => a.x - b.x); l.text = l.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim(); });
    pages.push({ page: i, lines: lines.filter((l) => l.text) });
  }
  return pages;
}
function splitLineIntoColumns(line) {
  /* Split a line into columns where the x-gap between items exceeds 40pt. */
  const cols = []; let cur = [];
  for (let i = 0; i < line.items.length; i++) {
    const it = line.items[i];
    if (cur.length) { const prev = cur[cur.length - 1]; if (it.x - (prev.x + prev.w) > 40) { cols.push(cur.map((c) => c.str).join(" ")); cur = []; } }
    cur.push(it);
  }
  if (cur.length) cols.push(cur.map((c) => c.str).join(" "));
  return cols;
}
async function extractPdfText(file, statusId) {
  const pages = await extractPdfLines(file, statusId);
  if (!pages) return null;
  const lines = [];
  for (const pg of pages) { lines.push("--- Page " + pg.page + " ---"); pg.lines.forEach((l) => lines.push(l.text)); }
  return lines.join("\n");
}
async function ocrPdfPages(file, lang, statusId, onProgress) {
  /* OCR fallback for scanned PDFs: render each page, run Tesseract, return text. */
  if (!(await ensurePdfJs(statusId))) return null;
  if (!window.Tesseract) { const ok = await loadLibrary("tesseract", statusId); if (!ok) return null; }
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const res = await window.Tesseract.recognize(canvas, lang || "eng", { logger: (m) => { if (onProgress && m.status === "recognizing text") onProgress((i - 1 + (m.progress || 0)) / pdf.numPages); } });
    out.push("--- Page " + i + " (OCR) ---\n" + (res.data.text || ""));
    if (onProgress) onProgress(i / pdf.numPages);
  }
  return out.join("\n");
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

/* ---------- Converters ---------- */
const pdfExcelBtn = $("pdfExcelBtn");
if (pdfExcelBtn) pdfExcelBtn.addEventListener("click", async () => {
  const file = ($("pdfExcelInput").files || [])[0];
  if (!file) { setStatus("pdfExcelStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.XLSX, "SheetJS", "pdfExcelStatus")) return;
  try {
    const pages = await extractPdfLines(file, "pdfExcelStatus");
    if (pages === null) return;
    const rows = [];
    for (const pg of pages) for (const line of pg.lines) {
      const cols = splitLineIntoColumns(line);
      rows.push(cols.length > 1 ? cols : [line.text]);
    }
    if (!rows.length) { setStatus("pdfExcelStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first, then convert the text PDF."); return; }
    const ws = window.XLSX.utils.aoa_to_sheet([["AK Premium - extracted PDF text"], ...rows]);
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
    let pages = await extractPdfLines(file, "pdfWordStatus");
    if (pages === null) return;
    let children = [];
    for (const pg of pages) {
      pg.lines.forEach((line, idx) => {
        const isHeading = idx === 0 && line.text.length < 80 && !/[.!?]$/.test(line.text);
        children.push(isHeading ? new window.docx.Paragraph({ heading: window.docx.HeadingLevel.HEADING_2, children: [new window.docx.TextRun({ text: line.text, bold: true })] }) : new window.docx.Paragraph({ text: line.text }));
      });
    }
    if (!children.length && $("pdfWordOcr") && $("pdfWordOcr").checked) {
      setStatus("pdfWordStatus", "No text layer found. Running OCR on the scanned pages, this takes a while...");
      const ocrText = await ocrPdfPages(file, "eng", "pdfWordStatus");
      if (ocrText) children = ocrText.split("\n").map((line) => new window.docx.Paragraph({ text: line }));
    }
    if (!children.length) { setStatus("pdfWordStatus", "No readable text was found in this PDF. It may be a scanned PDF — tick the OCR option and try again."); return; }
    // docx v8 Paragraph takes an options object, not a bare string.
    const doc = new window.docx.Document({ sections: [{ children }] });
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
    const pages = await extractPdfLines(file, "pdfPptStatus");
    if (pages === null) return;
    if (!pages.some((pg) => pg.lines.length)) { setStatus("pdfPptStatus", "No readable text was found in this PDF. It may be a scanned PDF — try OCR PDF first."); return; }
    const pptx = new window.PptxGenJS();
    pages.forEach((pg) => {
      const slide = pptx.addSlide();
      const title = pg.lines.length ? pg.lines[0].text : "Page " + pg.page;
      const body = pg.lines.slice(1).map((l) => l.text).join("\n");
      slide.addText(title, { x: 0.5, y: 0.3, w: 9, fontSize: 20, bold: true });
      slide.addText(body || "(no text on this page)", { x: 0.5, y: 1.0, w: 9, h: 4.5, fontSize: 12 });
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


/* ---------- New ilovepdf-style tools (all in browser) ---------- */
async function extractPdfTextWithPassword(file, password, statusId) {
  if (!needLibrary(!!window.pdfjsLib, "pdf.js", statusId)) return null;
  if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes, password: password || undefined }).promise;
  let lines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    lines.push("--- Page " + i + " ---");
    lines.push(content.items.map((it) => it.str).join(" "));
  }
  return lines.join("\n");
}
/* Protect / Unlock use qpdf-wasm (real standard AES-256 PDF encryption),
   self-hosted at /vendor/qpdf, run in a Web Worker. The old .akenc
   browser-only encryption is removed completely. */
function runQpdf(op, bytes, password, statusId) {
  return new Promise((resolve) => {
    let worker;
    try { worker = new Worker("/assets/js/qpdf-worker.js", { type: "module" }); }
    catch (e) { setStatus(statusId, "PDF encryption could not start in this browser. Please try Chrome, Edge or Firefox."); resolve(null); return; }
    const timer = setTimeout(() => { try { worker.terminate(); } catch (e) {} setStatus(statusId, "PDF encryption is taking too long. Please try a smaller file."); resolve(null); }, 120000);
    worker.onmessage = (e) => {
      clearTimeout(timer); worker.terminate();
      if (e.data && e.data.ok) resolve(new Uint8Array(e.data.bytes));
      else {
        const code = e.data && e.data.error;
        if (code === "WRONG_PASSWORD") setStatus(statusId, "Wrong password. Please check the password and try again.");
        else if (code === "NOT_ENCRYPTED") setStatus(statusId, "This PDF is not password-protected.");
        else setStatus(statusId, "Could not process this PDF (" + code + "). Please check the file and password.");
        resolve(null);
      }
    };
    worker.onerror = () => { clearTimeout(timer); setStatus(statusId, "PDF encryption could not load. Check your connection and try again."); resolve(null); };
    worker.postMessage({ op, bytes, password }, [bytes.buffer]);
  });
}
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
  } catch (e) { setStatus("cropPdfStatus", "Could not crop this PDF."); }
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
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    let found = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent(); const viewport = page.getViewport({ scale: 1 });
      const p = doc.getPage(i-1); const { height } = p.getSize();
      for (const item of content.items) {
        if (String(item.str || "").toLowerCase().includes(needle.toLowerCase())) {
          const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
          const w = (item.width || 50) * viewport.scale, h = (item.height || 12) * viewport.scale;
          p.drawRectangle({ x: tx[4], y: height - tx[5] - h, width: w, height: h + 2, color: window.PDFLib.rgb(0,0,0) });
          found++;
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
    setStatus("redactPdfStatus", "Done. Redacted " + found + " match(es) on " + new Set([...Array(pdf.numPages)].map((_, i) => i)).size + " page(s) — those pages are now images with no text layer, so the covered text cannot be copied. Check the result before sharing sensitive files.");
  } catch (e) { setStatus("redactPdfStatus", "Could not redact this PDF."); }
});
const pdfaPdfBtn = $("pdfaPdfBtn");
if (pdfaPdfBtn) pdfaPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfaInput").files || [])[0]; if (!file) { setStatus("pdfaPdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "pdfaPdfStatus"); if (!doc) return;
    doc.setTitle($("pdfaTitle").value || "Archive document"); doc.setAuthor("AK Premium"); doc.setSubject("Archive copy"); doc.setKeywords(["archive", "PDF/A-style"]); doc.setProducer("AK Premium browser tool"); doc.setCreator("AK Premium");
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-archive.pdf");
    setStatus("pdfaPdfStatus", "Done. Archive-style copy downloaded. This is not a certified PDF/A validation.");
  } catch (e) { setStatus("pdfaPdfStatus", "Could not make an archive copy."); }
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
  } catch (e) { setStatus("comparePdfStatus", "Could not compare these PDFs."); }
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
  } catch (e) { setStatus("pdfmdPdfStatus", "Could not convert this PDF to Markdown."); }
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
  } catch (e) { setStatus("scanPdfStatus", "Could not make a PDF from this photo."); }
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
  } catch (e) { setStatus("ocrpdfPdfStatus", "Could not OCR this PDF."); }
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
  } catch (e) { setStatus("formsPdfStatus", "Could not create a form PDF."); }
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
  } catch (e) { setStatus("summaryPdfStatus", "Could not summarize this PDF."); }
});
const translatePdfBtn = $("translatePdfBtn");
if (translatePdfBtn) translatePdfBtn.addEventListener("click", async () => {
  const file = ($("translateInput").files || [])[0]; if (!file) { setStatus("translatePdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "translatePdfStatus"); if (text === null) return;
    downloadText(text, "ak-premium-for-translation.txt"); setStatus("translatePdfStatus", "Done. Text file downloaded, ready to translate elsewhere. No text was sent to a translation server by AK Premium.");
  } catch (e) { setStatus("translatePdfStatus", "Could not extract text from this PDF."); }
});


/* More dropdown: horizontal panel, closes on selection or outside click */
const navMore = $("navMore"); const moreBtn = $("moreBtn");
if (moreBtn && navMore) {
  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = navMore.classList.toggle("open");
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".more-item").forEach((item) => {
    item.addEventListener("click", () => { navMore.classList.remove("open"); moreBtn.setAttribute("aria-expanded", "false"); moreBtn.classList.add("active"); });
  });
  document.addEventListener("click", (e) => { if (!navMore.contains(e.target)) { navMore.classList.remove("open"); moreBtn.setAttribute("aria-expanded", "false"); } });
  document.querySelectorAll(".nav-btn:not(.more-item):not(.more-btn)").forEach((b) => {
    b.addEventListener("click", () => { if (!["image","everyday","developer","calculators","business","design"].includes(b.dataset.category)) moreBtn.classList.remove("active"); });
  });
}

/* Initial state: open the category from the URL hash when present,
   otherwise show everything. */
(function initCategoryFromHash() {
  try {
    const h = window.location.hash || "";
    if (h.indexOf("#tool-") === 0) {
      const toolId = h.replace("#tool-", "");
      const w = document.getElementById(toolId);
      if (w) { openWorkspace(toolId); return; }
    }
  } catch (e) {}
  let name = null;
  try { name = (typeof window !== "undefined" && window.location) ? categoryFromHash(window.location.hash) : null; } catch (e) { name = null; }
  if (name) showCategory(name, { scroll: false });
  else filterCards();
})();

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
let organizePages = []; /* [{index (0-based), rotation}] */
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

/* ---------- Phase 1 handlers: Image ---------- */
const imgCompressQuality = $("imgCompressQuality");
if (imgCompressQuality) imgCompressQuality.addEventListener("input", () => {
  const label = $("imgCompressQualityLabel"); if (label) label.textContent = imgCompressQuality.value + "%";
});
const imgCompressBtn = $("imgCompressBtn");
if (imgCompressBtn) imgCompressBtn.addEventListener("click", async () => {
  const files = Array.from($("imgCompressInput").files || []);
  if (!files.length) { setStatus("imgCompressStatus", "Please select at least one image first."); return; }
  let quality = (parseInt(($("imgCompressQuality") || {}).value || "80", 10) || 80) / 100;
  const format = $("imgCompressFormat") ? $("imgCompressFormat").value : "jpeg";
  const targetKB = $("imgCompressTargetKB") ? parseInt($("imgCompressTargetKB").value, 10) : 0;
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const ext = format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
  const out = $("imgCompressOutput"); if (out) out.innerHTML = "";
  setStatus("imgCompressStatus", "Compressing " + files.length + " image(s)...");
  try {
    const blobs = [];
    for (let i = 0; i < files.length; i++) {
      const img = await loadImageFromFile(files[i]);
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (format === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      let q = quality, blob = null;
      /* Target size: lower quality in steps until the file fits (JPEG/WebP only). */
      for (let attempt = 0; attempt < 8; attempt++) {
        blob = await canvasToBlob(canvas, mime, q);
        if (!blob) break;
        if (!targetKB || format === "png" || blob.size <= targetKB * 1024 || q <= 0.1) break;
        q = Math.max(0.1, q - 0.1);
      }
      if (!blob) { setStatus("imgCompressStatus", "This browser could not encode that format. Please try again."); return; }
      const name = "ak-premium-compressed-" + (i + 1) + "." + ext; blobs.push({ name, blob });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
      a.textContent = "Download " + name + " (" + humanBytes(files[i].size) + " -> " + humanBytes(blob.size) + ")";
      if (out) { out.appendChild(a); out.appendChild(document.createElement("br")); }
    }
    if (window.JSZip && blobs.length > 1) {
      const zip = new window.JSZip(); blobs.forEach((b) => zip.file(b.name, b.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-compressed.zip");
      setStatus("imgCompressStatus", "Done. " + blobs.length + " image(s) compressed and downloaded as a ZIP. " + (format === "jpeg" ? "JPEG output flattens transparency." : format === "png" ? "PNG keeps transparency but may stay large." : "WebP keeps good quality at small sizes."));
    } else {
      setStatus("imgCompressStatus", "Done. " + (format === "jpeg" ? "JPEG output flattens transparency." : format === "png" ? "PNG keeps transparency but may stay large." : "WebP keeps good quality at small sizes."));
    }
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
    const lang = $("ocrLang") ? $("ocrLang").value : "eng";
    const result = await window.Tesseract.recognize(file, lang, {
      logger: (m) => { if (m && m.status === "recognizing text" && typeof m.progress === "number") { setStatus("ocrStatus", "Working... " + Math.round(m.progress * 100) + "%."); setProgress("ocrProgress", Math.round(m.progress * 100)); } }
    });
    setProgress("ocrProgress", 100);
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
  const container = $("qrContainer");
  if (!container) { setStatus("qrStatus", "QR output area is missing. Please reload the page."); return; }
  container.innerHTML = "";
  qrGenerated = false;
  try {
    if (window.QRCode && window.QRCode.toCanvas) {
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);
      window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1 }, (err) => {
        if (err) { setStatus("qrStatus", "Could not generate this QR code. Please try shorter text."); return; }
        qrGenerated = true; setStatus("qrStatus", "Done. QR code generated.");
      });
    } else if (typeof window.QRCode === "function") {
      new window.QRCode(container, { text: text, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
      qrGenerated = true; setStatus("qrStatus", "Done. QR code generated.");
    } else {
      setStatus("qrStatus", "QR library did not load. Check your connection and try again.");
    }
  } catch (e) {
    setStatus("qrStatus", "Could not generate this QR code. Please try shorter text.");
  }
});
const qrDownloadBtn = $("qrDownloadBtn");
if (qrDownloadBtn) qrDownloadBtn.addEventListener("click", async () => {
  if (!qrGenerated) { setStatus("qrStatus", "Generate a QR code first, then download it."); return; }
  const container = $("qrContainer");
  const canvas = container ? container.querySelector("canvas") : null;
  if (canvas) {
    canvas.toBlob((blob) => {
      if (!blob) { setStatus("qrStatus", "Could not download this QR code."); return; }
      downloadBlob(blob, "ak-premium-qr.png"); setStatus("qrStatus", "Done. QR PNG downloaded.");
    }, "image/png");
    return;
  }
  const img = container ? container.querySelector("img") : null;
  if (img && img.src) {
    try {
      const res = await fetch(img.src);
      const blob = await res.blob();
      downloadBlob(blob, "ak-premium-qr.png"); setStatus("qrStatus", "Done. QR PNG downloaded.");
    } catch (e) { setStatus("qrStatus", "Could not download this QR code."); }
    return;
  }
  setStatus("qrStatus", "Could not download this QR code.");
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


/* ---------- Phase 2 tools: pure logic (testable) ---------- */
function parseInvoiceItems(text) {
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return { error: "Please add at least one item, one per line as: Item name, quantity, price." };
  const items = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length !== 3 || !parts[0]) return { error: "Invalid item line: \"" + line + "\". Use: Item name, quantity, price." };
    const qty = parseFloat(parts[1]);
    const price = parseFloat(parts[2]);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return { error: "Invalid quantity or price in line: \"" + line + "\"." };
    items.push({ name: parts[0], qty, price, amount: Math.round(qty * price * 100) / 100 });
  }
  return { items };
}
function invoiceTotals(items, taxPct) {
  const subtotal = Math.round(items.reduce((sum, it) => sum + it.amount, 0) * 100) / 100;
  const tax = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}
function toTitleCase(text) {
  return String(text || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function toSentenceCase(text) {
  const s = String(text || "").toLowerCase();
  return s.replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (c) => c.toUpperCase());
}
function convertCase(text, mode) {
  if (mode === "upper") return String(text || "").toUpperCase();
  if (mode === "lower") return String(text || "").toLowerCase();
  if (mode === "title") return toTitleCase(text);
  if (mode === "sentence") return toSentenceCase(text);
  return String(text || "");
}
function generateUuid(randomBytes) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const bytes = randomBytes || (typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(16)) : null);
  if (!bytes) throw new Error("Secure random numbers are not available in this browser.");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}
function hexToHsl(hex) {
  const clean = String(hex || "").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}
function colorPalette(baseHex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(String(baseHex || ""))) return { error: "Please choose a valid color." };
  const hsl = hexToHsl(baseHex);
  const items = [
    { label: "Base", hex: baseHex.toLowerCase() },
    { label: "Complementary", hex: hslToHex(hsl.h + 180, hsl.s, hsl.l) },
    { label: "Analogous -30", hex: hslToHex(hsl.h - 30, hsl.s, hsl.l) },
    { label: "Analogous +30", hex: hslToHex(hsl.h + 30, hsl.s, hsl.l) },
    { label: "Triadic +120", hex: hslToHex(hsl.h + 120, hsl.s, hsl.l) },
    { label: "Triadic +240", hex: hslToHex(hsl.h + 240, hsl.s, hsl.l) }
  ];
  return { items };
}
function emiCalc(principal, annualRatePct, years) {
  if (!principal || principal <= 0 || !years || years <= 0) return { error: "Please enter a positive loan amount and number of years." };
  if (annualRatePct === null || annualRatePct === undefined || isNaN(annualRatePct) || annualRatePct < 0) return { error: "Please enter an interest rate of 0 or more." };
  const n = Math.round(years * 12);
  if (annualRatePct === 0) {
    const emi = Math.round((principal / n) * 100) / 100;
    return { emi, total: Math.round(emi * n * 100) / 100, interest: Math.round((emi * n - principal) * 100) / 100, months: n };
  }
  const r = annualRatePct / 1200;
  const factor = Math.pow(1 + r, n);
  const emi = Math.round(principal * r * factor / (factor - 1) * 100) / 100;
  const total = Math.round(emi * n * 100) / 100;
  return { emi, total, interest: Math.round((total - principal) * 100) / 100, months: n };
}
function parseCgpa(text) {
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return { error: "Please add at least one course, one per line as: Course, credit hours, grade point." };
  let creditSum = 0, weighted = 0;
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length !== 3 || !parts[0]) return { error: "Invalid course line: \"" + line + "\". Use: Course, credit hours, grade point." };
    const credits = parseFloat(parts[1]);
    const grade = parseFloat(parts[2]);
    if (isNaN(credits) || credits <= 0 || isNaN(grade) || grade < 0) return { error: "Invalid credit hours or grade point in line: \"" + line + "\"." };
    creditSum += credits; weighted += credits * grade;
  }
  if (!creditSum) return { error: "Total credit hours cannot be zero." };
  return { cgpa: Math.round((weighted / creditSum) * 100) / 100, credits: creditSum };
}
function parseCsvLine(line) {
  const fields = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
    else current += ch;
  }
  fields.push(current.trim());
  return fields;
}
function csvToJson(text) {
  const lines = String(text || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length < 2) return { error: "CSV needs a header row and at least one data row." };
  const headers = parseCsvLine(lines[0]);
  if (!headers.length || headers.some((h) => !h)) return { error: "The first row must be a valid header row." };
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length !== headers.length) return { error: "Row " + (i + 1) + " has " + fields.length + " fields but the header has " + headers.length + ". Please fix that row." };
    const obj = {};
    headers.forEach((h, j) => { obj[h] = fields[j]; });
    rows.push(obj);
  }
  return { rows };
}
function diffTexts(original, changed) {
  const a = String(original || "").split("\n");
  const b = String(changed || "").split("\n");
  const removed = [], added = [];
  const aSet = new Set(a), bSet = new Set(b);
  a.forEach((line) => { if (!bSet.has(line)) removed.push(line); });
  b.forEach((line) => { if (!aSet.has(line)) added.push(line); });
  const unchanged = a.filter((line) => bSet.has(line)).length;
  return { removed, added, unchanged, identical: removed.length === 0 && added.length === 0 };
}

/* ---------- Phase 2 handlers: Business ---------- */
const invoiceCalcBtn = $("invoiceCalcBtn");
if (invoiceCalcBtn) invoiceCalcBtn.addEventListener("click", () => {
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setStatus("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, tax);
  const lines = parsed.items.map((it) => it.name + " x " + it.qty + " @ " + it.price + " = " + it.amount.toFixed(2));
  $("invoiceSummary").textContent = lines.join("\n") + "\nSubtotal: " + totals.subtotal.toFixed(2) + "\nTax (" + tax + "%): " + totals.tax.toFixed(2) + "\nTotal: " + totals.total.toFixed(2);
  setStatus("invoiceStatus", "Done. Summary calculated.");
});
const invoicePdfBtn = $("invoicePdfBtn");
if (invoicePdfBtn) invoicePdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "invoiceStatus")) return;
  const business = ($("invoiceBusiness").value || "").trim();
  const client = ($("invoiceClient").value || "").trim();
  if (!business || !client) { setStatus("invoiceStatus", "Please enter both the business name and the client name."); return; }
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setStatus("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, tax);
  const template = $("invoiceTemplate") ? $("invoiceTemplate").value : "1";
  const notes = $("invoiceNotes") ? ($("invoiceNotes").value || "").trim() : "";
  const doc = new JsPDF();
  if (template === "2") {
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("INVOICE", 15, 18);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    doc.text("From: " + business, 15, 40);
    doc.text("To: " + client, 15, 48);
    if ($("invoiceDate").value) doc.text("Date: " + $("invoiceDate").value, 15, 56);
  } else {
    doc.setFontSize(18); doc.text("INVOICE", 15, 20);
    doc.setFontSize(12);
    doc.text("From: " + business, 15, 32);
    doc.text("To: " + client, 15, 40);
    if ($("invoiceDate").value) doc.text("Date: " + $("invoiceDate").value, 15, 48);
  }
  let y = 62;
  parsed.items.forEach((it) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(it.name + "  x " + it.qty + "  @ " + it.price + "  = " + it.amount.toFixed(2), 15, y); y += 8;
  });
  if (y > 250) { doc.addPage(); y = 20; }
  doc.text("Subtotal: " + totals.subtotal.toFixed(2), 15, y + 6);
  doc.text("Tax (" + tax + "%): " + totals.tax.toFixed(2), 15, y + 14);
  doc.setFontSize(13); doc.text("Total: " + totals.total.toFixed(2), 15, y + 24);
  if (template === "2" && notes) { doc.setFontSize(11); doc.text("Notes: " + notes, 15, y + 34); }
  doc.save("ak-premium-invoice.pdf");
  setStatus("invoiceStatus", "Done. Invoice PDF downloaded.");
});
const resumeBtn = $("resumeBtn");
if (resumeBtn) resumeBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "resumeStatus")) return;
  const name = ($("resumeName").value || "").trim();
  const title = ($("resumeTitle").value || "").trim();
  if (!name || !title) { setStatus("resumeStatus", "Please enter your full name and job title."); return; }
  const template = $("resumeTemplate") ? $("resumeTemplate").value : "1";
  const doc = new JsPDF();
  if (template === "2") {
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(name, 15, 16);
    doc.setFontSize(13); doc.text(title, 15, 26);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFontSize(20); doc.text(name, 15, 20);
    doc.setFontSize(13); doc.text(title, 15, 29);
  }
  doc.setFontSize(11);
  const contact = [($("resumeEmail").value || "").trim(), ($("resumePhone").value || "").trim()].filter(Boolean).join("  |  ");
  if (contact) doc.text(contact, 15, 38);
  let y = 52;
  const skills = ($("resumeSkills").value || "").trim();
  if (skills) {
    doc.setFontSize(13); doc.text("Skills", 15, y); y += 8;
    doc.setFontSize(11);
    if (template === "2") {
      skills.split(",").map((sk) => sk.trim()).filter(Boolean).forEach((sk) => { if (y > 270) { doc.addPage(); y = 20; } doc.text("- " + sk, 15, y); y += 7; });
    } else {
      wrapPdfText(doc, skills, 170).forEach((line) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 15, y); y += 7; });
    }
    y += 6;
  }
  const exp = ($("resumeExperience").value || "").trim();
  if (exp) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(13); doc.text("Experience", 15, y); y += 8;
    doc.setFontSize(11);
    addWrappedTextPaginatedFrom(doc, exp, y);
  }
  doc.save("ak-premium-resume.pdf");
  setStatus("resumeStatus", "Done. Resume PDF downloaded.");
});
function addWrappedTextPaginatedFrom(doc, text, startY) {
  let y = startY;
  wrapPdfText(doc, text, 170).forEach((line) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 15, y); y += 7;
  });
}

/* ---------- Phase 2 handlers: Developer ---------- */
document.querySelectorAll("[data-case-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const out = convertCase($("caseInput").value, btn.dataset.caseMode);
    if ($("caseOutput")) $("caseOutput").textContent = out;
    setStatus("caseStatus", "Done.");
  });
});
const caseCopyBtn = $("caseCopyBtn");
if (caseCopyBtn) caseCopyBtn.addEventListener("click", () => {
  const text = $("caseOutput") ? $("caseOutput").textContent : "";
  if (!text || text.startsWith("Converted text")) { setStatus("caseStatus", "Convert text first, then use Copy."); return; }
  copyTextToClipboard(text, "caseStatus");
});
function renderUuids(count) {
  try {
    const list = [];
    for (let i = 0; i < count; i++) list.push(generateUuid());
    if ($("uuidOutput")) $("uuidOutput").textContent = list.join("\n");
    setStatus("uuidStatus", "Done.");
  } catch (e) { setStatus("uuidStatus", "Secure random numbers are not available in this browser."); }
}
const uuidBtn = $("uuidBtn");
if (uuidBtn) uuidBtn.addEventListener("click", () => renderUuids(1));
const uuidBtn5 = $("uuidBtn5");
if (uuidBtn5) uuidBtn5.addEventListener("click", () => renderUuids(5));
const uuidCopyBtn = $("uuidCopyBtn");
if (uuidCopyBtn) uuidCopyBtn.addEventListener("click", () => {
  const text = $("uuidOutput") ? $("uuidOutput").textContent : "";
  if (!text || text.startsWith("Your UUID")) { setStatus("uuidStatus", "Generate a UUID first, then use Copy."); return; }
  copyTextToClipboard(text, "uuidStatus");
});
const csvJsonBtn = $("csvJsonBtn");
if (csvJsonBtn) csvJsonBtn.addEventListener("click", async () => {
  let text = ($("csvJsonText").value || "").trim();
  const file = ($("csvJsonFile").files || [])[0];
  if (file) { try { text = await file.text(); } catch (e) { setStatus("csvJsonStatus", "Could not read this CSV file."); return; } }
  const parsed = csvToJson(text);
  if (parsed.error) { setStatus("csvJsonStatus", parsed.error); return; }
  const json = JSON.stringify(parsed.rows, null, 2);
  if ($("csvJsonOutput")) $("csvJsonOutput").textContent = json;
  setStatus("csvJsonStatus", "Done. " + parsed.rows.length + " row(s) converted.");
});
const csvJsonCopyBtn = $("csvJsonCopyBtn");
if (csvJsonCopyBtn) csvJsonCopyBtn.addEventListener("click", () => {
  const text = $("csvJsonOutput") ? $("csvJsonOutput").textContent : "";
  if (!text || text.startsWith("JSON output")) { setStatus("csvJsonStatus", "Convert CSV first, then use Copy."); return; }
  copyTextToClipboard(text, "csvJsonStatus");
});
const csvJsonDownloadBtn = $("csvJsonDownloadBtn");
if (csvJsonDownloadBtn) csvJsonDownloadBtn.addEventListener("click", () => {
  const text = $("csvJsonOutput") ? $("csvJsonOutput").textContent : "";
  if (!text || text.startsWith("JSON output")) { setStatus("csvJsonStatus", "Convert CSV first, then download."); return; }
  downloadText(text, "ak-premium-data.json", "application/json;charset=utf-8");
  setStatus("csvJsonStatus", "Done. JSON downloaded.");
});
const diffBtn = $("diffBtn");
if (diffBtn) diffBtn.addEventListener("click", () => {
  const result = diffTexts($("diffOriginal").value, $("diffChanged").value);
  if (result.identical) { if ($("diffOutput")) $("diffOutput").textContent = "No differences found."; setStatus("diffStatus", "Done."); return; }
  const parts = [];
  if (result.removed.length) parts.push("Removed:\n- " + result.removed.join("\n- "));
  if (result.added.length) parts.push("Added:\n+ " + result.added.join("\n+ "));
  parts.push("Unchanged lines: " + result.unchanged);
  if ($("diffOutput")) $("diffOutput").textContent = parts.join("\n\n");
  setStatus("diffStatus", "Done.");
});

/* ---------- Phase 2 handlers: Design ---------- */
const paletteBtn = $("paletteBtn");
if (paletteBtn) paletteBtn.addEventListener("click", () => {
  const parsed = colorPalette($("paletteBase").value);
  if (parsed.error) { setStatus("paletteStatus", parsed.error); return; }
  const out = $("paletteOutput");
  if (out) {
    out.innerHTML = "";
    parsed.items.forEach((item) => {
      const sw = document.createElement("button");
      sw.type = "button"; sw.className = "swatch"; sw.dataset.hex = item.hex;
      sw.title = "Click to copy " + item.hex;
      sw.innerHTML = "<span class=\"swatch-color\" style=\"background:" + item.hex + "\"></span><span>" + item.label + "</span><span>" + item.hex + "</span>";
      out.appendChild(sw);
    });
  }
  setStatus("paletteStatus", "Done. Click a swatch to copy its hex code.");
});
const paletteOutput = $("paletteOutput");
if (paletteOutput) paletteOutput.addEventListener("click", (event) => {
  const sw = event.target.closest ? event.target.closest(".swatch") : null;
  if (sw && sw.dataset.hex) copyTextToClipboard(sw.dataset.hex, "paletteStatus", "Copied " + sw.dataset.hex + ".");
});

/* ---------- Phase 2 handlers: Calculators ---------- */
const emiBtn = $("emiBtn");
if (emiBtn) emiBtn.addEventListener("click", () => {
  const result = emiCalc(parseFloat($("emiPrincipal").value), parseFloat($("emiRate").value), parseFloat($("emiYears").value));
  if (result.error) { setStatus("emiStatus", result.error); return; }
  if ($("emiOutput")) $("emiOutput").textContent = "Monthly EMI: " + result.emi.toFixed(2) + "\nTotal payment: " + result.total.toFixed(2) + "\nTotal interest: " + result.interest.toFixed(2) + "\nMonths: " + result.months;
  setStatus("emiStatus", "Done.");
});
const cgpaBtn = $("cgpaBtn");
if (cgpaBtn) cgpaBtn.addEventListener("click", () => {
  const result = parseCgpa($("cgpaInput").value);
  if (result.error) { setStatus("cgpaStatus", result.error); return; }
  if ($("cgpaOutput")) $("cgpaOutput").textContent = "CGPA: " + result.cgpa.toFixed(2) + "\nTotal credit hours: " + result.credits;
  setStatus("cgpaStatus", "Done.");
});

/* ---------- File preview: show the chosen file before converting ---------- */
/* Runs for every file input on the page. For a PDF it renders page 1 with pdf.js,
   plus name, size and page count, so the user can confirm it is the right document
   before pressing Convert. For an image it shows a thumbnail. Files stay in the
   browser; nothing is uploaded. If a PDF cannot be rendered (for example it is
   password-protected), the name and size are still shown instead of failing. */
function akFormatBytes(n){ if(!n && n!==0) return ""; if(n<1024) return n+" bytes"; if(n<1048576) return (n/1024).toFixed(1)+" KB"; return (n/1048576).toFixed(2)+" MB"; }
async function akRenderFilePreview(input, box){
  box.innerHTML=""; box.classList.remove("visible");
  const files=input.files||[];
  if(!files.length) return;
  const meta=document.createElement("p"); meta.className="preview-meta";
  const names=Array.from(files).map(f=>f.name).join(", ");
  meta.innerHTML="<strong>Selected:</strong> "+names+" &middot; "+files.map(f=>akFormatBytes(f.size)).join(", ");
  box.appendChild(meta); box.classList.add("visible");
  const first=files[0];
  const isPdf=(input.accept||"").indexOf("application/pdf")!==-1 || /\.pdf$/i.test(first.name||"");
  const isImage=(input.accept||"").indexOf("image/")!==-1 || /^image\//.test(first.type||"");
  if(isImage && typeof URL!=="undefined" && URL.createObjectURL){
    try{
      const img=document.createElement("img"); img.alt="Preview of "+first.name;
      img.src=URL.createObjectURL(first); box.appendChild(img);
      const note=document.createElement("p"); note.className="preview-note";
      note.textContent=files.length>1 ? (files.length+" images selected. First image shown as a preview.") : "Check this is the right image before you continue.";
      box.appendChild(note); return;
    }catch(e){}
  }
  if(!isPdf) return;
  const note=document.createElement("p"); note.className="preview-note";
  note.textContent="Rendering page 1 preview…";
  box.appendChild(note);
  try{
    if(!window.pdfjsLib) throw new Error("pdf.js not loaded");
    const buf=await first.arrayBuffer();
    const doc=await window.pdfjsLib.getDocument({data:buf}).promise;
    meta.innerHTML="<strong>Selected:</strong> "+first.name+" &middot; "+akFormatBytes(first.size)+" &middot; "+doc.numPages+" page(s)";
    if(files.length>1) meta.innerHTML+=" &middot; "+files.length+" files selected, first file previewed";
    const page=await doc.getPage(1);
    const viewport=page.getViewport({scale:1.4});
    const canvas=document.createElement("canvas");
    canvas.width=viewport.width; canvas.height=viewport.height;
    await page.render({canvasContext:canvas.getContext("2d"), viewport}).promise;
    box.insertBefore(canvas, note);
    note.textContent="Page 1 of "+doc.numPages+". Check this is the right document before you convert it.";
  }catch(e){
    note.textContent="Page preview could not be rendered for this file (it may be password-protected or scanned). The file name and size above are still shown so you can confirm you picked the right file.";
  }
}
document.querySelectorAll('input[type="file"]').forEach((input)=>{
  if(input.dataset.akPreviewAttached) return; input.dataset.akPreviewAttached="1";
  const box=document.createElement("div"); box.className="file-preview";
  box.setAttribute("aria-live","polite");
  input.insertAdjacentElement("afterend", box);
  input.addEventListener("change", ()=>{ akRenderFilePreview(input, box); });
  // Unlock tool: re-render the preview once the password is entered, if present.
  const tool=input.closest ? input.closest(".workspace-tool") : null;
  if(tool){
    const pw=tool.querySelector('input[type="password"]');
    if(pw && !pw.dataset.akPreviewAttached){ pw.dataset.akPreviewAttached="1";
      pw.addEventListener("change", ()=>{ if(input.files && input.files.length) akRenderFilePreview(input, box); });
    }
  }
});

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */
/* Each wizard: pick a task, fill labelled fields, get the exact formula/code
   with a plain-language explanation and an example. No keyword guessing. */
function wizardField(id, label, placeholder) {
  return '<label>' + label + ' <input id="' + id + '" type="text" placeholder="' + (placeholder || '') + '"></label>';
}
const FORMULA_TASKS = {
  sumif: { name: "SUMIF — add up values that meet one condition", fields: [["f_sum_range", "Range to add up", "B2:B20"], ["f_criteria_range", "Range to check", "A2:A20"], ["f_criteria", "Condition", "\"Approved\" or \">100\""]],
    build: (v) => "=SUMIF(" + v.f_criteria_range + ", " + v.f_criteria + ", " + v.f_sum_range + ")",
    explain: (v) => "Adds up the numbers in " + v.f_sum_range + " only where " + v.f_criteria_range + " meets " + v.f_criteria + ".",
    example: "With sales in B2:B20 and region in A2:A20, =SUMIF(A2:A20, \"Lahore\", B2:B20) adds up Lahore sales only." },
  sumifs: { name: "SUMIFS — add up values that meet several conditions", fields: [["f_sum_range", "Range to add up", "C2:C20"], ["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Lahore\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\"2026\""]],
    build: (v) => "=SUMIFS(" + v.f_sum_range + ", " + v.f_criteria_range1 + ", " + v.f_criteria1 + ", " + v.f_criteria_range2 + ", " + v.f_criteria2 + ")",
    explain: (v) => "Adds up " + v.f_sum_range + " only where both conditions are true at the same time.",
    example: "Add Lahore 2026 sales: =SUMIFS(C2:C20, A2:A20, \"Lahore\", B2:B20, \"2026\")." },
  countifs: { name: "COUNTIFS — count rows that meet several conditions", fields: [["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Approved\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\">100\""]],
    build: (v) => "=COUNTIFS(" + v.f_criteria_range1 + ", " + v.f_criteria1 + ", " + v.f_criteria_range2 + ", " + v.f_criteria2 + ")",
    explain: (v) => "Counts the rows where both conditions are true.",
    example: "Count approved orders over 100: =COUNTIFS(A2:A20, \"Approved\", B2:B20, \">100\")." },
  vlookup: { name: "VLOOKUP — find a value in a table", fields: [["f_lookup", "Value to look up", "A2"], ["f_table", "Table to search", "Sheet2!A:B"], ["f_col", "Column number to return", "2"]],
    build: (v) => "=VLOOKUP(" + v.f_lookup + ", " + v.f_table + ", " + v.f_col + ", FALSE)",
    explain: (v) => "Searches the first column of " + v.f_table + " for " + v.f_lookup + " and returns the value from column " + v.f_col + ". FALSE means exact match.",
    example: "Find a product price: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)." },
  xlookup: { name: "XLOOKUP — find a value (modern replacement for VLOOKUP)", fields: [["f_lookup", "Value to look up", "A2"], ["f_lookup_array", "Range to search", "Sheet2!A:A"], ["f_return_array", "Range to return from", "Sheet2!B:B"]],
    build: (v) => "=XLOOKUP(" + v.f_lookup + ", " + v.f_lookup_array + ", " + v.f_return_array + ", \"Not found\")",
    explain: (v) => "Searches " + v.f_lookup_array + " for " + v.f_lookup + " and returns the matching value from " + v.f_return_array + ". Shows \"Not found\" if there is no match.",
    example: "Find a price: =XLOOKUP(A2, Sheet2!A:A, Sheet2!B:B, \"Not found\"). Needs Microsoft 365 or Excel 2021." },
  indexmatch: { name: "INDEX + MATCH — look up in any direction", fields: [["f_return_range", "Range to return from", "B2:B20"], ["f_lookup", "Value to look up", "A2"], ["f_lookup_range", "Range to search", "Sheet2!A2:A20"]],
    build: (v) => "=INDEX(" + v.f_return_range + ", MATCH(" + v.f_lookup + ", " + v.f_lookup_range + ", 0))",
    explain: (v) => "MATCH finds the position of " + v.f_lookup + " in " + v.f_lookup_range + " (0 means exact match), and INDEX returns the value at that position from " + v.f_return_range + ". Unlike VLOOKUP it can look to the left.",
    example: "Find a price by product code: =INDEX(B2:B20, MATCH(A2, Sheet2!A2:A20, 0))." },
  ifformula: { name: "IF — one condition, two results", fields: [["f_condition", "Condition to test", "A2>100"], ["f_true", "Value if true", "\"High\""], ["f_false", "Value if false", "\"Low\""]],
    build: (v) => "=IF(" + v.f_condition + ", " + v.f_true + ", " + v.f_false + ")",
    explain: (v) => "Tests " + v.f_condition + ". If it is true the result is " + v.f_true + ", otherwise " + v.f_false + ".",
    example: "Mark high sales: =IF(A2>100, \"High\", \"Low\")." },
  nestedif: { name: "Nested IF — grade or category from a number", fields: [["f_cell", "Cell with the number", "A2"], ["f_high", "Top threshold", "80"], ["f_mid", "Middle threshold", "50"]],
    build: (v) => "=IF(" + v.f_cell + ">=" + v.f_high + ", \"A\", IF(" + v.f_cell + ">=" + v.f_mid + ", \"B\", \"C\"))",
    explain: (v) => "Checks the top threshold first, then the middle one. Change the letters A, B and C to your own labels.",
    example: "Grade a mark: =IF(A2>=80, \"A\", IF(A2>=50, \"B\", \"C\"))." },
  textformula: { name: "TEXT — format a date or number as text", fields: [["f_cell", "Cell to format", "A2"], ["f_format", "Format code", "YYYY-MM-DD"]],
    build: (v) => "=TEXT(" + v.f_cell + ", \"" + v.f_format + "\")",
    explain: (v) => "Shows the value in " + v.f_cell + " using the format " + v.f_format + ". The result is text, not a real date or number.",
    example: "Show a date as 2026-11-09: =TEXT(A2, \"YYYY-MM-DD\")." },
  datedif: { name: "DATEDIF — difference between two dates", fields: [["f_start", "Start date cell", "A2"], ["f_end", "End date cell", "B2"], ["f_unit", "Unit: Y (years), M (months) or D (days)", "D"]],
    build: (v) => "=DATEDIF(" + v.f_start + ", " + v.f_end + ", \"" + v.f_unit + "\")",
    explain: (v) => "Returns the difference between the two dates in " + (v.f_unit === "Y" ? "whole years" : v.f_unit === "M" ? "whole months" : "days") + ".",
    example: "Days between two dates: =DATEDIF(A2, B2, \"D\")." },
  unique: { name: "UNIQUE — list each value once (remove duplicates)", fields: [["f_range", "Range with duplicates", "A2:A20"]],
    build: (v) => "=UNIQUE(" + v.f_range + ")",
    explain: (v) => "Lists each value in " + v.f_range + " once. Needs Microsoft 365 Excel.",
    example: "List unique cities: =UNIQUE(A2:A20). To count them, use =COUNTA(UNIQUE(A2:A20))." }
};
function initWizard(prefix, tasks, outId, statusId) {
  const taskSel = $(prefix + "Task"), fieldsEl = $(prefix + "Fields"), btn = $(prefix + "Btn");
  if (!taskSel || !fieldsEl || !btn) return;
  function renderFields() {
    const t = tasks[taskSel.value]; if (!t) return;
    fieldsEl.innerHTML = t.fields.map((f) => wizardField("w_" + prefix + "_" + f[0], f[1], f[2])).join("");
  }
  taskSel.addEventListener("change", renderFields); renderFields();
  btn.addEventListener("click", () => {
    const t = tasks[taskSel.value]; if (!t) return;
    const v = {};
    for (const f of t.fields) { const el = $("w_" + prefix + "_" + f[0]); v[f[0]] = el ? el.value.trim() : ""; if (!v[f[0]]) { setStatus(statusId, "Please fill in: " + f[1] + "."); return; } }
    const formula = t.build(v);
    const out = $(outId);
    if (out) out.textContent = "AK Premium - " + t.name + "\n\n" + formula + "\n\nWhat it does: " + t.explain(v) + "\n\nExample: " + t.example + "\n\nTest it on a copy of your data first.";
    setStatus(statusId, "Done. Your formula is ready above.");
  });
}
initWizard("formula", FORMULA_TASKS, "formulaOutput", "formulaStatus");

const VBA_TASKS = {
  looprows: { name: "Loop through rows and mark a condition", fields: [["f_sheet", "Sheet name", "Data"], ["f_col", "Column letter to check", "A"], ["f_condition", "Condition (VBA test)", "Cells(i, 1).Value > 100"], ["f_action", "What to write in column B", "\"High\""]],
    build: (v) => "Sub MarkRows()\n    Dim ws As Worksheet, i As Long, lastRow As Long\n    Set ws = ThisWorkbook.Worksheets(\"" + v.f_sheet + "\")\n    lastRow = ws.Cells(ws.Rows.Count, \"" + v.f_col + "\").End(xlUp).Row\n    For i = 2 To lastRow\n        If " + v.f_condition.replace(/\(i, 1\)/g, "(i, 1)") + " Then\n            ws.Cells(i, 2).Value = " + v.f_action + "\n        End If\n    Next i\n    MsgBox \"Done. Checked \" & (lastRow - 1) & \" rows.\", vbInformation\nEnd Sub",
    explain: "Goes through each row from row 2 to the last used row, tests your condition, and writes your value in column B.",
    example: "Marks every row where column A is over 100." },
  copydata: { name: "Copy data from one sheet to another", fields: [["f_from", "Source sheet", "Data"], ["f_to", "Target sheet", "Report"], ["f_range", "Range to copy", "A1:D100"]],
    build: (v) => "Sub CopyData()\n    ThisWorkbook.Worksheets(\"" + v.f_from + "\").Range(\"" + v.f_range + "\").Copy\n    ThisWorkbook.Worksheets(\"" + v.f_to + "\").Range(\"A1\").PasteSpecial xlPasteValues\n    Application.CutCopyMode = False\n    MsgBox \"Copied " + v.f_range + " from " + v.f_from + " to " + v.f_to + ".\", vbInformation\nEnd Sub",
    explain: "Copies the range as values only, so no formulas are carried over.",
    example: "Copy A1:D100 from Data to Report." },
  autofilter: { name: "AutoFilter a table by a value", fields: [["f_sheet", "Sheet name", "Data"], ["f_range", "Table range", "A1:D100"], ["f_field", "Column number to filter (1 = first)", "2"], ["f_value", "Value to keep", "\"Lahore\""]],
    build: (v) => "Sub FilterTable()\n    With ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Range(\"" + v.f_range + "\")\n        .AutoFilter Field:=" + v.f_field + ", Criteria1:=" + v.f_value + "\n    End With\nEnd Sub",
    explain: "Filters the table so only rows matching your value stay visible.",
    example: "Show only Lahore rows in a table." },
  sortdata: { name: "Sort a table by a column", fields: [["f_sheet", "Sheet name", "Data"], ["f_range", "Table range", "A1:D100"], ["f_key", "Sort column (e.g. A2:A100)", "B2:B100"]],
    build: (v) => "Sub SortTable()\n    With ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Sort\n        .SortFields.Clear\n        .SortFields.Add Key:=Range(\"" + v.f_key + "\"), Order:=xlDescending\n        .SetRange Range(\"" + v.f_range + "\")\n        .Header = xlYes\n        .Apply\n    End With\nEnd Sub",
    explain: "Sorts the table by your column, largest first. Change xlDescending to xlAscending for smallest first.",
    example: "Sort sales from largest to smallest." },
  hidesheet: { name: "Hide a sheet (very hidden, not in the unhide menu)", fields: [["f_sheet", "Sheet name to hide", "Management"]],
    build: (v) => "Sub HideSheet()\n    ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Visible = xlSheetVeryHidden\n    MsgBox \"" + v.f_sheet + " is now very hidden.\", vbInformation\nEnd Sub\n\nSub UnhideSheet()\n    ThisWorkbook.Worksheets(\"" + v.f_sheet + "\").Visible = xlSheetVisible\nEnd Sub",
    explain: "Very hidden sheets do not appear in the Unhide menu. Run UnhideSheet to bring the sheet back.",
    example: "Hide a management or settings sheet." }
};
initWizard("vba", VBA_TASKS, "vbaOutput", "vbaStatus");

const REGEX_TASKS = {
  email: { name: "Email address", fields: [], build: () => "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", explain: "Matches a normal email address: letters, numbers and . _ % + - before @, a domain after it, and a dot with at least 2 letters.", example: "Finds ali@example.com in a block of text." },
  phonepk: { name: "Pakistan mobile number (03xx-xxxxxxx)", fields: [], build: () => "03\\d{2}[- ]?\\d{7}", explain: "Matches a Pakistan mobile number starting 03, with an optional dash or space.", example: "Finds 0317-7483793 and 03177483793." },
  date: { name: "Date (DD/MM/YYYY)", fields: [], build: () => "\\b\\d{2}/\\d{2}/\\d{4}\\b", explain: "Matches a date with two digits, slash, two digits, slash, four digits.", example: "Finds 09/11/2026." },
  url: { name: "Web link (http/https)", fields: [], build: () => "https?://[^\\s]+", explain: "Matches a link starting http:// or https:// up to the next space.", example: "Finds https://example.com/page." },
  numbers: { name: "Numbers in text", fields: [], build: () => "\\d+(\\.\\d+)?", explain: "Matches whole numbers and decimals.", example: "Finds 100, 25.5 and 2026 in text." },
  cnic: { name: "Pakistan CNIC (xxxxx-xxxxxxx-x)", fields: [], build: () => "\\d{5}-\\d{7}-\\d", explain: "Matches a CNIC in the standard 5-7-1 digit format with dashes.", example: "Finds 35202-1234567-1." }
};
(function initRegex() {
  const taskSel = $("regexTask"), btn = $("regexBtn"), out = $("regexOutput");
  if (!taskSel || !btn) return;
  btn.addEventListener("click", () => {
    const t = REGEX_TASKS[taskSel.value]; if (!t) return;
    const pattern = t.build();
    const test = $("regexTest") ? $("regexTest").value : "";
    let matches = "";
    try { const found = test ? (test.match(new RegExp(pattern, "g")) || []) : []; matches = found.length ? "\n\nMatches in your test text: " + found.join(", ") : (test ? "\n\nNo matches in your test text." : ""); }
    catch (e) { matches = "\n\nCould not test this pattern."; }
    if (out) out.textContent = "AK Premium - Regex: " + t.name + "\n\nPattern: " + pattern + "\n\nWhat it does: " + t.explain + "\n\nExample: " + t.example + matches + "\n\nUse it in Excel with a VBA regex, in Google Sheets with REGEXEXTRACT, or in any text editor that supports regular expressions.";
    setStatus("regexStatus", "Done. Your pattern is ready above.");
  });
})();

const DAX_TASKS = {
  totalsales: { name: "Total Sales — sum a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Amount column", "Amount"]],
    build: (v) => "Total Sales = SUM(" + v.f_table + "[" + v.f_column + "])",
    explain: "Adds up every value in the amount column.",
    example: "Total Sales = SUM(Sales[Amount])." },
  average: { name: "Average — average a column", fields: [["f_table", "Table name", "Sales"], ["f_column", "Column to average", "Amount"]],
    build: (v) => "Average Amount = AVERAGE(" + v.f_table + "[" + v.f_column + "])",
    explain: "Averages the values in the column, ignoring blanks.",
    example: "Average Amount = AVERAGE(Sales[Amount])." },
  ytd: { name: "Year to Date — running total for the year", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"], ["f_date", "Date table and column", "'Calendar'[Date]"]],
    build: (v) => "YTD Sales = TOTALYTD([" + v.f_measure + "], " + v.f_date + ")",
    explain: "Adds up the base measure from 1 January to the current date in the filter context.",
    example: "YTD Sales = TOTALYTD([Total Sales], 'Calendar'[Date]). Needs a date table." },
  pcttotal: { name: "Percent of Total — share of the grand total", fields: [["f_table", "Table name", "Sales"], ["f_measure", "Base measure name", "Total Sales"]],
    build: (v) => "% of Total = DIVIDE([" + v.f_measure + "], CALCULATE([" + v.f_measure + "], ALL(" + v.f_table + ")))",
    explain: "Divides the measure by the same measure with all filters on the table removed, so you get the share of the total.",
    example: "A product with 25,000 of 100,000 total sales shows 25%." },
  countrows: { name: "Count Rows — count orders or records", fields: [["f_table", "Table name", "Sales"]],
    build: (v) => "Order Count = COUNTROWS(" + v.f_table + ")",
    explain: "Counts the rows in the table in the current filter context.",
    example: "Order Count = COUNTROWS(Sales)." }
};
initWizard("dax", DAX_TASKS, "daxOutput", "daxStatus");

/* ---------- v4: Pakistan / Urdu tools ---------- */
/* Land converter: 1 Kanal = 20 Marla = 5,445 sq ft; 1 Acre = 8 Kanal = 43,560 sq ft; 1 Marla = 272.25 sq ft. */
const LAND_UNITS = { marla: 272.25, kanal: 5445, acre: 43560, sqft: 1, sqyd: 9, sqm: 10.7639 };
(function initLand() {
  const btn = $("landBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const val = parseFloat(($("landValue").value || "").trim());
    const from = $("landFrom") ? $("landFrom").value : "kanal";
    if (!val || val <= 0) { setStatus("landStatus", "Please enter a land area greater than zero."); return; }
    const sqft = val * LAND_UNITS[from];
    const out = [
      ["Marla", sqft / 272.25], ["Kanal", sqft / 5445], ["Acre", sqft / 43560],
      ["Square feet", sqft], ["Square yards", sqft / 9], ["Square metres", sqft / 10.7639]
    ].map((r) => r[0] + ": " + (Math.round(r[1] * 100) / 100).toLocaleString("en-PK")).join("\n");
    const el = $("landOutput"); if (el) el.textContent = val + " " + from + " is:\n" + out + "\n\n1 Kanal = 20 Marla = 5,445 sq ft. 1 Acre = 8 Kanal = 43,560 sq ft.";
    setStatus("landStatus", "Done.");
  });
})();
/* Pakistan salary tax: slabs loaded from /assets/data/tax-slabs.json (FBR, verified 2026-11-09). */
/* Fallback slabs, identical to /assets/data/tax-slabs.json (FBR, verified 2026-11-09).
   Used only if the JSON file cannot be fetched, so the calculator still works. */
const TAX_SLABS_FALLBACK = {"years": [
  {"tax_year": "2026", "label": "Tax Year 2026 (FY 2025-26, Finance Act 2025)", "default": false, "slabs": [{"up_to": 600000, "rate": 0, "base_tax": 0}, {"up_to": 1200000, "rate": 0.01, "base_tax": 0}, {"up_to": 2200000, "rate": 0.11, "base_tax": 6000}, {"up_to": 3200000, "rate": 0.23, "base_tax": 116000}, {"up_to": 4100000, "rate": 0.30, "base_tax": 346000}, {"up_to": null, "rate": 0.35, "base_tax": 616000}], "surcharge": {"threshold": 10000000, "rate": 0.09, "note": "9% surcharge on tax payable where taxable income exceeds Rs 10,000,000 (s.4AB)."}},
  {"tax_year": "2027", "label": "Tax Year 2027 (FY 2026-27, Finance Act 2026) - current", "default": true, "slabs": [{"up_to": 600000, "rate": 0, "base_tax": 0}, {"up_to": 1200000, "rate": 0.01, "base_tax": 0}, {"up_to": 2200000, "rate": 0.11, "base_tax": 6000}, {"up_to": 3200000, "rate": 0.20, "base_tax": 116000}, {"up_to": 4100000, "rate": 0.25, "base_tax": 316000}, {"up_to": 5600000, "rate": 0.29, "base_tax": 541000}, {"up_to": 7000000, "rate": 0.32, "base_tax": 976000}, {"up_to": null, "rate": 0.35, "base_tax": 1424000}], "surcharge": {"threshold": null, "rate": 0, "note": "The 9% surcharge for salaried individuals was withdrawn by Finance Act 2026 (s.4AB). No surcharge for salaried TY2027."}}
]};
let TAX_DATA = null;
async function loadTaxData(statusId) {
  if (TAX_DATA) return TAX_DATA;
  try {
    const r = await fetch("/assets/data/tax-slabs.json");
    if (!r.ok) throw new Error("tax slabs HTTP " + r.status);
    TAX_DATA = await r.json(); return TAX_DATA;
  } catch (e) {
    TAX_DATA = TAX_SLABS_FALLBACK; return TAX_DATA;
  }
}
function calcSalaryTax(income, yearData) {
  let prev = 0, tax = 0;
  for (const slab of yearData.slabs) {
    if (slab.up_to === null || income <= slab.up_to) { tax = slab.base_tax + slab.rate * (income - prev); break; }
    prev = slab.up_to;
  }
  let surcharge = 0;
  if (yearData.surcharge && yearData.surcharge.threshold && income > yearData.surcharge.threshold) surcharge = tax * yearData.surcharge.rate;
  return { tax, surcharge, total: tax + surcharge };
}
(function initTax() {
  const btn = $("taxBtn"); if (!btn) return;
  const sel = $("taxYear");
  loadTaxData("taxStatus").then((d) => {
    if (!d || !sel) return;
    sel.innerHTML = d.years.map((y) => '<option value="' + y.tax_year + '"' + (y.default ? " selected" : "") + ">" + y.label + "</option>").join("");
  });
  btn.addEventListener("click", async () => {
    const d = await loadTaxData("taxStatus"); if (!d) return;
    const monthly = parseFloat(($("taxMonthly").value || "").trim());
    if (!monthly || monthly <= 0) { setStatus("taxStatus", "Please enter your monthly salary greater than zero."); return; }
    const year = d.years.find((y) => y.tax_year === (sel ? sel.value : "")) || d.years.find((y) => y.default) || d.years[0];
    const annual = monthly * 12;
    const r = calcSalaryTax(annual, year);
    const el = $("taxOutput");
    if (el) el.textContent = year.label + "\nAnnual salary: Rs " + annual.toLocaleString("en-PK") + "\nTax on salary: Rs " + Math.round(r.tax).toLocaleString("en-PK") + "\nSurcharge: Rs " + Math.round(r.surcharge).toLocaleString("en-PK") + "\nTotal annual tax: Rs " + Math.round(r.total).toLocaleString("en-PK") + "\nMonthly tax: Rs " + Math.round(r.total / 12).toLocaleString("en-PK") + "\nTake-home per month: Rs " + Math.round(monthly - r.total / 12).toLocaleString("en-PK") + "\n\nEstimate only. " + (year.surcharge ? year.surcharge.note : "") + " This calculator uses FBR slabs for salaried individuals only and does not include rebates, allowances or other income.";
    setStatus("taxStatus", "Done. This is an estimate only, not tax advice.");
  });
})();
/* Zakat: 2.5% of net zakatable wealth held for one lunar year. Nisab by weight (7.5 tola gold / 52.5 tola silver). */
(function initZakat() {
  const btn = $("zakatBtn"); if (!btn) return;
  btn.addEventListener("click", async () => {
    const cash = parseFloat(($("zakatCash").value || "0")) || 0;
    const gold = parseFloat(($("zakatGold").value || "0")) || 0;
    const silver = parseFloat(($("zakatSilver").value || "0")) || 0;
    const debts = parseFloat(($("zakatDebts").value || "0")) || 0;
    const goldRate = parseFloat(($("zakatGoldRate").value || "0")) || 0;
    const silverRate = parseFloat(($("zakatSilverRate").value || "0")) || 0;
    const net = cash + gold * goldRate + silver * silverRate - debts;
    const nisabSilver = 52.5 * silverRate, nisabGold = 7.5 * goldRate;
    const nisab = silverRate > 0 ? nisabSilver : nisabGold;
    const due = net >= nisab && nisab > 0 ? net * 0.025 : 0;
    const el = $("zakatOutput");
    if (el) el.textContent = "Net zakatable wealth: Rs " + Math.round(net).toLocaleString("en-PK") + "\nNisab (52.5 tola silver at your rate): Rs " + Math.round(nisab).toLocaleString("en-PK") + "\nZakat due (2.5%): Rs " + Math.round(due).toLocaleString("en-PK") + (due === 0 ? "\nNo Zakat is due, because your wealth is below the nisab." : "") + "\n\nNisab is 7.5 tola gold or 52.5 tola silver. The government bank-deduction nisab for Ramadan 2026 was reported as Rs 503,529, but that figure was not directly verified from an official source, and the government re-notifies it every year — verify before relying on it. This calculator is an estimate only, not religious advice.";
    setStatus("zakatStatus", "Done. This is an estimate only.");
  });
})();
/* Amount to words: English and Urdu, for invoices and cheques. */
const ONES_EN = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS_EN = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function numToWordsEn(n) {
  if (n === 0) return "zero";
  if (n < 0) return "minus " + numToWordsEn(-n);
  let out = "";
  const scales = [[1000000000, "billion"], [1000000, "million"], [1000, "thousand"], [100, "hundred"]];
  for (const [v, name] of scales) {
    if (n >= v) { out += numToWordsEn(Math.floor(n / v)) + " " + name + " "; n %= v; }
  }
  if (n >= 20) { out += TENS_EN[Math.floor(n / 10)] + (n % 10 ? "-" + ONES_EN[n % 10] : ""); }
  else if (n > 0) out += ONES_EN[n];
  return out.trim();
}
/* Urdu numbers 1-99 are irregular, so they are listed in full rather than
   built from tens + ones (which would give wrong forms like "بیس پانچ" for 25). */
const UR_0_99 = ["صفر", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو", "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس", "بیس", "اکیس", "بائیس", "تیئیس", "چوبیس", "پچیس", "چھبیس", "ستائیس", "اٹھائیس", "انتیس", "تیس", "اکتیس", "بتیس", "تینتیس", "چونتیس", "پینتیس", "چھتیس", "سینتیس", "اٹھتیس", "انتالیس", "چالیس", "اکتالیس", "بیالیس", "تینتالیس", "چوالیس", "پینتالیس", "چھتالیس", "سینتالیس", "اٹھتالیس", "انچاس", "پچاس", "اکیاون", "باون", "ترپن", "چون", "پچپن", "چھپن", "ستاون", "اٹھاون", "انسٹھ", "ساٹھ", "اکسٹھ", "باسٹھ", "تریسٹھ", "چونسٹھ", "پینسٹھ", "چھیاسٹھ", "ستاسٹھ", "اٹھاسٹھ", "انہتر", "ستر", "اکہتر", "بہتر", "تہتر", "چوہتر", "پچہتر", "چھیہتر", "ستتر", "اٹھہتر", "اناسی", "اسی", "اکیاسی", "بیاسی", "تراسی", "چوراسی", "پچاسی", "چھیاسی", "ستاسی", "اٹھاسی", "نواسی", "نوے", "اکیانوے", "بانوے", "ترانوے", "چورانوے", "پچانوے", "چھانوے", "ستانوے", "اٹھانوے", "ننانوے"];
function numToWordsUr(n) {
  if (n === 0) return "صفر";
  if (n < 0) return "منفی " + numToWordsUr(-n);
  let out = "";
  const scales = [[10000000, "کروڑ"], [100000, "لاکھ"], [1000, "ہزار"], [100, "سو"]];
  for (const [v, name] of scales) {
    if (n >= v) { out += numToWordsUr(Math.floor(n / v)) + " " + name + " "; n %= v; }
  }
  if (n > 0) out += UR_0_99[n];
  return out.trim();
}
(function initAmountWords() {
  const btn = $("amountWordsBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const raw = ($("amountWordsInput").value || "").trim().replace(/,/g, "");
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount < 0 || amount >= 1000000000) { setStatus("amountWordsStatus", "Please enter an amount from 0 to 999,999,999."); return; }
    const rupees = Math.floor(amount), paisa = Math.round((amount - rupees) * 100);
    const en = numToWordsEn(rupees) + " rupees" + (paisa ? " and " + numToWordsEn(paisa) + " paisa" : "") + " only";
    const ur = numToWordsUr(rupees) + " روپے" + (paisa ? " اور " + numToWordsUr(paisa) + " پیسے" : "") + " صرف";
    const el = $("amountWordsOutput");
    if (el) { el.innerHTML = ""; const p1 = document.createElement("p"); p1.textContent = en; const p2 = document.createElement("p"); p2.setAttribute("dir", "rtl"); p2.setAttribute("lang", "ur"); p2.textContent = ur; el.appendChild(p1); el.appendChild(p2); }
    setStatus("amountWordsStatus", "Done.");
  });
})();
/* Urdu word / character counter. */
(function initUrduCounter() {
  const btn = $("urduCounterBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const text = $("urduCounterInput") ? $("urduCounterInput").value : "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length, charsNoSpaces = text.replace(/\s/g, "").length;
    const el = $("urduCounterOutput");
    if (el) el.textContent = "Words: " + words + "\nCharacters (with spaces): " + chars + "\nCharacters (without spaces): " + charsNoSpaces + "\nReading time: about " + Math.max(1, Math.ceil(words / 200)) + " minute(s) at 200 words per minute.";
    setStatus("urduCounterStatus", "Done.");
  });
})();
/* Percentage / marks / merit aggregate: generic weighted formula, user-editable weights. */
(function initMerit() {
  const btn = $("meritBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const rows = [];
    for (let i = 1; i <= 3; i++) {
      const obtained = parseFloat(($("meritObtained" + i).value || "")) || 0;
      const total = parseFloat(($("meritTotal" + i).value || "")) || 0;
      const weight = parseFloat(($("meritWeight" + i).value || "")) || 0;
      if (total > 0 && weight > 0) rows.push({ obtained, total, weight, pct: obtained / total * 100 });
    }
    if (!rows.length) { setStatus("meritStatus", "Please enter at least one part: obtained marks, total marks and its weight."); return; }
    const weightSum = rows.reduce((a, r) => a + r.weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) { setStatus("meritStatus", "Weights add up to " + weightSum + "%. They should add up to 100% for a merit aggregate."); return; }
    const aggregate = rows.reduce((a, r) => a + r.pct * r.weight / 100, 0);
    const el = $("meritOutput");
    if (el) el.textContent = rows.map((r, i) => "Part " + (i + 1) + ": " + r.pct.toFixed(2) + "% x " + r.weight + "% weight = " + (r.pct * r.weight / 100).toFixed(2)).join("\n") + "\n\nMerit aggregate: " + aggregate.toFixed(2) + "%\n\nFormula: sum of (obtained / total x 100 x weight / 100) for each part.";
    setStatus("meritStatus", "Done.");
  });
})();

/* ---------- v4: standalone Formula Explainer page ---------- */
(function initExplainerPage() {
  const btn = $("explainerBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const input = ($("explainerInput") || {}).value || "";
    if (!input.trim()) { setStatus("explainerStatus", "Please paste a formula starting with = first."); return; }
    const out = $("explainerOutput");
    if (out) out.textContent = explainFormula(input);
    setStatus("explainerStatus", "Done.");
  });
})();

/* v4 tool pages: each tool page embeds exactly one workspace, and the
   v3 CSS hides .workspace-tool until it gains .active (which only
   happened on homepage card clicks). A tool page has no cards and no
   #tool- hash, so without this the tool area stays an empty white box.
   Activate the single workspace on any /tools/ page. */
(function activateToolPageWorkspace() {
  function activate() {
    try {
      var path = (window.location && window.location.pathname) || "";
      var tools = document.querySelectorAll(".workspace-tool");
      if (tools.length === 1 || path.indexOf("/tools/") === 0) {
        tools.forEach(function (w) { w.classList.add("active"); });
      }
    } catch (e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate);
  } else {
    activate();
  }
})();
