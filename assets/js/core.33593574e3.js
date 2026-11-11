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
  /* Visible fallback link: the automatic download can be blocked or
     missed, so always leave a clickable link in the active tool area
     (the old version showed only a status line and no way to get the
     file back). The link stays usable for 10 minutes. */
  try {
    const ws = document.querySelector(".workspace-tool.active") || document.querySelector(".workspace-tool");
    showSuccess(ws, filename, url);
  } catch (e) {}
  setTimeout(() => URL.revokeObjectURL(url), 600000);
}

/* ---------- Phase 3.2: success card after a download ---------- */
const NEXT_STEPS = {
  "tool-merge": [["Compress PDF", "/tools/compress-pdf"], ["Split PDF", "/tools/split-pdf"], ["Organize PDF", "/tools/organize-pdf"]],
  "tool-split": [["Merge PDF", "/tools/merge-pdf"], ["Organize PDF", "/tools/organize-pdf"], ["Compress PDF", "/tools/compress-pdf"]],
  "tool-compress": [["Merge PDF", "/tools/merge-pdf"], ["Protect PDF", "/tools/protect-pdf"], ["Split PDF", "/tools/split-pdf"]],
  "tool-organize": [["Merge PDF", "/tools/merge-pdf"], ["Split PDF", "/tools/split-pdf"], ["Compress PDF", "/tools/compress-pdf"]],
  "tool-protect": [["Unlock PDF", "/tools/unlock-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-unlock": [["Protect PDF", "/tools/protect-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-redact": [["Protect PDF", "/tools/protect-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-pdfword": [["PDF to Excel", "/tools/pdf-to-excel"], ["PDF to PPT", "/tools/pdf-to-ppt"], ["PDF to Text", "/tools/pdf-to-text"]],
  "tool-pdfexcel": [["PDF to Word", "/tools/pdf-to-word"], ["Excel to PDF", "/tools/excel-to-pdf"], ["CSV to Excel", "/tools/csv-to-excel"]],
  "tool-pdfppt": [["PDF to Word", "/tools/pdf-to-word"], ["PDF to Excel", "/tools/pdf-to-excel"]],
  "tool-pdftext": [["PDF to Word", "/tools/pdf-to-word"], ["PDF to Markdown", "/tools/pdf-to-markdown"], ["Translate Helper", "/tools/translate-helper"]],
  "tool-imgcompress": [["Image Resizer", "/tools/image-resizer"], ["Image Converter", "/tools/image-converter"], ["Images to PDF", "/tools/images-to-pdf"]],
  "tool-ocrpdf": [["PDF to Word", "/tools/pdf-to-word"], ["Redact PDF", "/tools/redact-pdf"]],
  "tool-ocr": [["PDF to Word", "/tools/pdf-to-word"], ["Translate Helper", "/tools/translate-helper"]],
  "tool-images": [["Compress PDF", "/tools/compress-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-pdfimages": [["Image Compressor", "/tools/image-compressor"], ["Images to PDF", "/tools/images-to-pdf"]]
};
function showSuccess(ws, filename, url) {
  if (!ws) return;
  if (window.AK && window.AK.track) window.AK.track("tool_success", { tool: akToolName(ws) });
  const old = ws.querySelector(".tool-success"); if (old) old.remove();
  const box = document.createElement("div");
  box.className = "tool-success";
  box.setAttribute("role", "status");
  const title = document.createElement("p");
  title.className = "tool-success-title";
  title.textContent = "Done \u2014 your file is ready.";
  box.appendChild(title);
  const link = document.createElement("a");
  link.className = "download-link"; link.href = url; link.download = filename;
  link.textContent = "Download " + filename;
  box.appendChild(link);
  const actions = document.createElement("div");
  actions.className = "tool-success-actions";
  const again = document.createElement("button");
  again.type = "button"; again.className = "btn-secondary"; again.textContent = "Start over";
  again.addEventListener("click", () => {
    ws.querySelectorAll("input, textarea, select").forEach((el) => {
      if (el.type === "file") { el.value = ""; el.dispatchEvent(new Event("change", { bubbles: true })); }
      else if (el.tagName === "SELECT") { el.selectedIndex = 0; }
      else if (el.type === "checkbox" || el.type === "radio") { el.checked = false; }
      else el.value = "";
    });
    ws.querySelectorAll(".file-preview").forEach((p) => { p.classList.remove("visible"); p.innerHTML = ""; });
    const out = ws.querySelector(".terminal, .output-box");
    if (out) out.textContent = "";
    box.remove();
    const primary = ws.querySelector(".btn-primary");
    if (primary) primary.focus();
  });
  actions.appendChild(again);
  (NEXT_STEPS[ws.id] || []).forEach(([label, href]) => {
    const a = document.createElement("a");
    a.className = "btn-ghost"; a.href = href; a.textContent = "Next: " + label;
    actions.appendChild(a);
  });
  box.appendChild(actions);
  const status = ws.querySelector(".status");
  if (status && status.parentNode) status.parentNode.insertBefore(box, status.nextSibling);
  else ws.appendChild(box);
}

/* ---------- Phase 3.2: friendly errors for the common PDF failures ---------- */
function friendlyPdfError(err) {
  const msg = String((err && err.message) || err || "");
  if (/password|encrypted|PasswordException/i.test(msg)) return { text: "This PDF is password-protected. Unlock it first, then try again.", link: ["/tools/unlock-pdf", "Unlock PDF"] };
  if (/no text|scanned|no extractable/i.test(msg)) return { text: "This PDF has no text layer. It looks like a scan \u2014 run OCR first, then try again.", link: ["/tools/ocr-pdf", "OCR PDF"] };
  if (/damaged|corrupt|invalid|Invalid PDF/i.test(msg)) return { text: "This PDF looks damaged and could not be read. Try Repair PDF, or a fresh copy of the file.", link: ["/tools/repair-pdf", "Repair PDF"] };
  return null;
}
function setPdfError(statusId, err) {
  const f = friendlyPdfError(err);
  const el = $(statusId);
  if (f && el) {
    el.textContent = "";
    el.appendChild(document.createTextNode(f.text));
    if (f.link) {
      el.appendChild(document.createTextNode(" "));
      const a = document.createElement("a"); a.href = f.link[0]; a.textContent = f.link[1]; el.appendChild(a);
    }
    el.setAttribute("role", "alert");
    if (window.AK && window.AK.track) {
      const ws = el.closest ? el.closest(".workspace-tool") : null;
      window.AK.track("tool_error", { tool: akToolName(ws) });
    }
    return true;
  }
  return false;
}

/* Tool name for analytics (Phase 4.6): the tool slug from the page path on
   tool pages, else the workspace id. Only the tool is reported, never a
   file name. */
function akToolName(ws) {
  const m = (window.location.pathname || "").match(/^\/(?:tools|ur)\/([^\/]+)/);
  if (m) return m[1];
  return ws && ws.id ? ws.id : "";
}

/* ---------- Phase 3.3: money formatting, western or lakh/crore grouping ---------- */
function moneyGrouping() {
  try { return window.localStorage.getItem("ak-money-grouping") === "lakh" ? "lakh" : "western"; } catch (e) { return "western"; }
}
function setMoneyGrouping(g) {
  try { window.localStorage.setItem("ak-money-grouping", g); } catch (e) {}
}
function fmtMoney(n, decimals) {
  const dec = decimals || 0;
  const num = Number(n) || 0;
  const parts = num.toFixed(dec).split(".");
  let intPart = parts[0];
  const neg = intPart.charAt(0) === "-";
  if (neg) intPart = intPart.slice(1);
  let grouped;
  if (moneyGrouping() === "lakh") {
    const last3 = intPart.slice(-3);
    let rest = intPart.slice(0, -3);
    grouped = last3;
    while (rest.length > 0) { grouped = rest.slice(-2) + "," + grouped; rest = rest.slice(0, -2); }
  } else {
    grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return (neg ? "-" : "") + grouped + (parts[1] ? "." + parts[1] : "");
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
  "docx": "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
  "pptxgenjs": "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js",
  "tesseract": "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  "qrcode": "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "jspdf": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
};
/* SRI hashes for the pinned libraries above (Phase 4.2); same values as
   build.py. The docx URL was corrected at the same time: docx@8.5.0
   publishes /build/index.umd.js, not /build/index.js (a 404, so PDF to
   Word could not load docx). */
const LIB_SRI = {
  "pdf-lib": "sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI",
  "pdfjs": "sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e",
  "xlsx": "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw",
  "jszip": "sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG",
  "mammoth": "sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz",
  "docx": "sha384-4xaIisuLEy2lo2HkB2C4rEf7v8jbTb2kuogX6TkuEt9feTWKBSFSOzsqNNbV+sKh",
  "pptxgenjs": "sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ",
  "tesseract": "sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F",
  "qrcode": "sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU",
  "jspdf": "sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk"
};
const _libLoaded = {};
function loadLibrary(name, statusId) {
  if (window[name === "pdfjs" ? "pdfjsLib" : name === "jspdf" ? "jspdf" : name === "qrcode" ? "QRCode" : name] || _libLoaded[name]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const sc = document.createElement("script");
    sc.src = LIB_URLS[name]; sc.async = true;
    if (LIB_SRI[name]) { sc.integrity = LIB_SRI[name]; sc.crossOrigin = "anonymous"; }
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
  calculators: ["section-calculators"],
  pakistan: ["section-pakistan"],
  popular: ["section-popular"],
  more: ["section-more"],
  everyday: ["section-more"],
  developer: ["section-more"],
  business: ["section-more"],
  design: ["section-more"],
  faq: ["section-faq"]
};
const ALL_SECTION_IDS = ["section-popular", "section-pakistan", "section-pdf", "section-convert", "section-image", "section-excel", "section-calculators", "section-more", "section-faq"];
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
navButtons.forEach((b) => { if (b.dataset.category) b.addEventListener("click", () => showCategory(b.dataset.category)); });
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("hashchange", () => {
    const h = window.location.hash || "";
    if (h.indexOf("#tool-") === 0) { const tid = h.replace("#tool-", ""); if (document.getElementById(tid)) { openWorkspace(tid); return; } }
    const name = categoryFromHash(window.location.hash);
    if (name) showCategory(name, { scroll: false });
  });
}

/* Category tabs: filter PDF cards by data-group, plus all other cards stay visible for 'all' */
let currentGroup = "all";
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    currentGroup = tab.dataset.group || "all";
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
  const main = $("main"); if (main && main.scrollIntoView) main.scrollIntoView({ behavior: "smooth" });
  filterCards();
}
function openWorkspace(id, excelModule) {
  document.querySelectorAll(".tool-card").forEach((c) => c.classList.toggle("active", c.dataset.target === id));
  document.querySelectorAll(".workspace-tool").forEach((w) => w.classList.toggle("active", w.id === id));
  const empty = $("workspaceEmpty"); if (empty) empty.style.display = "none";
  if (excelModule) { const btn = document.querySelector('.excel-tab-btn[data-excel-tab="' + excelModule + '"]'); if (btn) btn.click(); }
  // Dedicated tool page: hide the grid, show this tool on its own.
  const card = document.querySelector('.tool-card[data-target="' + id + '"]');
  const titleEl = $("toolPageTitle"); const descEl = $("toolPageDesc");
  if (titleEl && card) titleEl.textContent = (card.querySelector("strong") ? card.querySelector("strong").textContent : id);
  if (descEl && card) { const d = card.querySelector(".tool-card-desc"); descEl.textContent = d ? d.textContent : ""; }
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
/* Search normalisation: lower-case, punctuation to spaces, and a spaceless
   form so "pdftoword" still finds "PDF to Word". */
function normText(s) { return String(s || "").toLowerCase().replace(/[\u0629]/g, "\u06c3").replace(/[\u064a]/g, "\u06cc").replace(/[\u0643]/g, "\u06a9").replace(/[^a-z0-9\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]+/g, " ").replace(/\s+/g, " ").trim(); }
function normCompact(s) { return normText(s).replace(/ /g, ""); }
function cardMatches(card, query) {
  if (!query) return true;
  const q = normText(query), qc = normCompact(query);
  const hay = normText((card.dataset.keywords || "") + " " + card.textContent);
  if (normCompact(hay).indexOf(qc) !== -1) return true;
  // Every query word must start some word in the card (prefix match).
  return q.split(" ").every((w) => hay.split(" ").some((hw) => hw.indexOf(w) === 0));
}
function visibleCards() {
  return Array.from(document.querySelectorAll(".tool-card")).filter((c) => {
    if (c.style.display === "none") return false;
    const sec = c.closest(".tool-section");
    return !sec || sec.style.display !== "none";
  });
}
function filterCards() {
  const query = (heroSearch ? heroSearch.value : "").trim();
  const cards = document.querySelectorAll(".tool-card");
  let visible = 0; const sectionsWithVisible = new Set();
  cards.forEach((card) => {
    // Search wins over the PDF tab filter: a trending chip like "VBA Macro Writer"
    // must find its tool even when a PDF tab was active before.
    const show = query ? cardMatches(card, query) : (currentGroup === "all" || card.dataset.group === currentGroup);
    card.style.display = show ? "" : "none";
    if (show) { visible++; const sec = card.closest(".tool-section"); if (sec) sectionsWithVisible.add(sec.id); }
  });
  if (searchStatus) { searchStatus.textContent = query ? "Found " + visible + " tool(s) matching \"" + query + "\"." : ""; }
  const noResults = $("noResults");
  if (noResults) {
    const showEmpty = !!query && visible === 0;
    noResults.hidden = !showEmpty;
    if (showEmpty) { const qEl = $("noResultsQuery"); if (qEl) qEl.textContent = query; }
  }
  const clearBtn = $("heroSearchClear");
  if (clearBtn) clearBtn.hidden = !query;
  if (query) {
    // Search wins over the selected category page: show every section
    // that has a matching card, whatever page the user is on.
    ALL_SECTION_IDS.forEach((id) => { const sec = $(id); if (sec) sec.style.display = sectionsWithVisible.has(id) ? "" : "none"; });
    const ws = $("workspace"); if (ws) ws.style.display = "";
  } else if (currentGroup !== "all") {
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
    currentGroup = "all";
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.group === "all"));
    if (heroSearch) { heroSearch.value = chip.dataset.query; heroSearch.focus(); }
    filterCards();
  });
});

/* ---------- header nav + search keyboard UX (Phase 2) ---------- */
(function headerNav() {
  // Tools dropdown (desktop).
  const drop = document.querySelector(".nav-drop");
  const dropBtn = $("toolsMenuBtn");
  if (drop && dropBtn) {
    dropBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = drop.classList.toggle("open");
      dropBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!drop.contains(e.target)) { drop.classList.remove("open"); dropBtn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { drop.classList.remove("open"); dropBtn.setAttribute("aria-expanded", "false"); }
    });
  }
  // Mobile full-screen menu.
  const burger = $("navBurger"), menu = $("mobileMenu"), closeBtn = $("mobileMenuClose");
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    if (burger) burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger) burger.addEventListener("click", () => setMenu(menu.hidden));
  if (closeBtn) closeBtn.addEventListener("click", () => setMenu(false));
  if (menu) menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  // Header search icon: focus the search box when on the homepage.
  const searchBtn = $("headerSearchBtn");
  if (searchBtn && heroSearch) {
    searchBtn.addEventListener("click", (e) => {
      if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
        e.preventDefault();
        heroSearch.focus();
        heroSearch.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
  // Sticky jump-bar scroll-spy (homepage only).
  const jumpBar = document.querySelector(".jump-bar");
  if (jumpBar && typeof IntersectionObserver !== "undefined") {
    const links = Array.from(jumpBar.querySelectorAll("a"));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id));
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll(".tool-section[id], #section-faq").forEach((sec) => obs.observe(sec));
  }
  // "/" focuses search; Enter opens the first visible result; arrows move
  // focus between the search box and the visible cards.
  if (heroSearch) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/^(input|textarea|select)$/i.test((document.activeElement && document.activeElement.tagName) || "")) {
        e.preventDefault(); heroSearch.focus();
      }
    });
    heroSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = visibleCards()[0];
        if (first) { e.preventDefault(); first.click(); }
      } else if (e.key === "ArrowDown") {
        const first = visibleCards()[0];
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    document.querySelectorAll(".tool-card").forEach((card) => {
      card.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const list = visibleCards();
        const i = list.indexOf(card);
        if (e.key === "ArrowDown" && list[i + 1]) { e.preventDefault(); list[i + 1].focus(); }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (list[i - 1]) list[i - 1].focus();
          else heroSearch.focus();
        }
      });
    });
    const clearBtn = $("heroSearchClear");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      heroSearch.value = ""; heroSearch.focus(); filterCards();
    });
  }
})();

/* ---------- PDF Studio ---------- */

async function loadPdfLibDoc(file, statusId) {
  if (!needLibrary(!!window.PDFLib, "pdf-lib", statusId)) return null;
  const bytes = await readAsArrayBuffer(file);
  return window.PDFLib.PDFDocument.load(bytes);
}
let mergeOrder = [];

function sizeChangeNote(oldSize, newSize) {
  const pct = Math.round((1 - newSize / oldSize) * 100);
  if (pct >= 0) return pct + "% smaller";
  return (-pct) + "% larger — this file was already small, so re-rendering its pages as images made it bigger";
}

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

/* ---------- Excel Automation Engine ---------- */

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

/* ---------- New tools (all in browser) ---------- */

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
    try { worker = new Worker("/assets/js/qpdf-worker.js?v=5", { type: "module" }); }
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
  // /?q=... prefill (SearchAction) and #heroSearch focus from the header icon.
  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && heroSearch) { heroSearch.value = q; }
    if (window.location.hash === "#heroSearch" && heroSearch) { heroSearch.focus(); }
  } catch (e) {}
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

let organizePages = []; /* [{index (0-based), rotation}] */

let qrGenerated = false;

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

function addWrappedTextPaginatedFrom(doc, text, startY) {
  let y = startY;
  wrapPdfText(doc, text, 170).forEach((line) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(line, 15, y); y += 7;
  });
}

document.querySelectorAll("[data-case-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const out = convertCase($("caseInput").value, btn.dataset.caseMode);
    if ($("caseOutput")) $("caseOutput").textContent = out;
    setStatus("caseStatus", "Done.");
  });
});

/* ---------- Phase 3.3: calculators recalculate live while typing ---------- */
const LIVE_CALCS = [
  { btn: "ageBtn", inputs: ["ageDob"] },
  { btn: "percentBtn", inputs: ["percentX", "percentY"] },
  { btn: "bmiBtn", inputs: ["bmiHeight", "bmiWeight"] },
  { btn: "emiBtn", inputs: ["emiPrincipal", "emiRate", "emiYears"] },
  { btn: "cgpaBtn", inputs: ["cgpaInput"], cgpa: true },
  { btn: "landBtn", inputs: ["landValue"], selects: ["landFrom"] },
  { btn: "taxBtn", inputs: ["taxMonthly"], selects: ["taxYear"] },
  { btn: "zakatBtn", inputs: ["zakatCash", "zakatDebts", "zakatGold", "zakatGoldRate", "zakatSilver", "zakatSilverRate", "zakatNisab"], zakat: true },
  { btn: "amountWordsBtn", inputs: ["amountWordsInput"] },
  { btn: "urduCounterBtn", inputs: ["urduCounterInput"] },
  { btn: "meritBtn", inputs: ["meritObtained1", "meritTotal1", "meritWeight1", "meritObtained2", "meritTotal2", "meritWeight2", "meritObtained3", "meritTotal3", "meritWeight3"], merit: true }
];
LIVE_CALCS.forEach((c) => {
  const btn = $(c.btn); if (!btn) return;
  const fields = c.inputs.map((id) => $(id)).filter(Boolean);
  const selects = (c.selects || []).map((id) => $(id)).filter(Boolean);
  const num = (id) => parseFloat(($(id) || {}).value || "") || 0;
  const ready = () => {
    if (c.zakat) {
      const wealth = num("zakatCash") + num("zakatGold") * num("zakatGoldRate") + num("zakatSilver") * num("zakatSilverRate");
      return wealth > 0 && (num("zakatGoldRate") > 0 || num("zakatSilverRate") > 0 || num("zakatNisab") > 0);
    }
    if (c.merit) {
      let sum = 0, rows = 0;
      for (let i = 1; i <= 3; i++) {
        if (num("meritTotal" + i) > 0 && num("meritWeight" + i) > 0) { sum += num("meritWeight" + i); rows++; }
      }
      return rows > 0 && Math.abs(sum - 100) < 0.01;
    }
    if (c.cgpa) {
      const lines = String(($(c.inputs[0]) || {}).value || "").split("\n").map((s) => s.trim()).filter(Boolean);
      return lines.length > 0 && lines.every((l) => l.split(",").length === 3);
    }
    return fields.every((f) => (f.value || "").trim() !== "");
  };
  const run = () => {
    fields.forEach((f) => { if (f.type === "text" && f.value.indexOf(",") !== -1) f.value = f.value.replace(/,/g, ""); });
    if (ready()) btn.click();
  };
  fields.forEach((f) => f.addEventListener("input", run));
  selects.forEach((s) => s.addEventListener("change", run));
});

/* ---------- Phase 3.3: copy result / share link / print under calculator outputs ---------- */
(function initCalcActions() {
  const CALC_OUTPUTS = [
    { out: "ageOutput", inputs: ["ageDob"] },
    { out: "percentOutput", inputs: ["percentX", "percentY"], selects: ["percentMode"] },
    { out: "bmiOutput", inputs: ["bmiHeight", "bmiWeight"] },
    { out: "emiOutput", inputs: ["emiPrincipal", "emiRate", "emiYears"] },
    { out: "cgpaOutput", inputs: ["cgpaInput"] },
    { out: "landOutput", inputs: ["landValue"], selects: ["landFrom"] },
    { out: "taxOutput", inputs: ["taxMonthly"], selects: ["taxYear"] },
    { out: "zakatOutput", inputs: ["zakatCash", "zakatDebts", "zakatGold", "zakatGoldRate", "zakatSilver", "zakatSilverRate", "zakatNisab"] },
    { out: "amountWordsOutput", inputs: ["amountWordsInput"] },
    { out: "urduCounterOutput", inputs: ["urduCounterInput"] },
    { out: "meritOutput", inputs: ["meritObtained1", "meritTotal1", "meritWeight1", "meritObtained2", "meritTotal2", "meritWeight2", "meritObtained3", "meritTotal3", "meritWeight3"] }
  ];
  CALC_OUTPUTS.forEach((c) => {
    const out = $(c.out); if (!out) return;
    const row = document.createElement("div");
    row.className = "calc-actions";
    const mkBtn = (label) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn-ghost"; b.textContent = label; return b; };
    const copyBtn = mkBtn("Copy result");
    copyBtn.addEventListener("click", async () => {
      const text = out.textContent || "";
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; }
      catch (e) {
        const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand("copy"); } catch (e2) {}
        ta.remove();
      }
      if (ok) { copyBtn.textContent = "Copied"; setTimeout(() => { copyBtn.textContent = "Copy result"; }, 1500); }
    });
    const shareBtn = mkBtn("Share link");
    shareBtn.addEventListener("click", async () => {
      const params = new URLSearchParams();
      (c.inputs || []).forEach((id) => { const el = $(id); if (el && (el.value || "").trim() !== "") params.set(id, el.value.trim()); });
      (c.selects || []).forEach((id) => { const el = $(id); if (el) params.set(id, el.value); });
      const url = window.location.origin + window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      try { await navigator.clipboard.writeText(url); shareBtn.textContent = "Link copied"; setTimeout(() => { shareBtn.textContent = "Share link"; }, 1500); }
      catch (e) { window.prompt("Copy this link:", url); }
    });
    const printBtn = mkBtn("Print");
    printBtn.addEventListener("click", () => window.print());
    row.appendChild(copyBtn); row.appendChild(shareBtn); row.appendChild(printBtn);
    if (["taxOutput", "zakatOutput", "emiOutput"].includes(c.out)) {
      const grpBtn = mkBtn("Grouping: " + (moneyGrouping() === "lakh" ? "lakh" : "1,23,456"));
      grpBtn.addEventListener("click", () => {
        setMoneyGrouping(moneyGrouping() === "lakh" ? "western" : "lakh");
        grpBtn.textContent = "Grouping: " + (moneyGrouping() === "lakh" ? "lakh" : "1,23,456");
        const btn = c.out === "taxOutput" ? $("taxBtn") : c.out === "zakatOutput" ? $("zakatBtn") : $("emiBtn");
        if (btn) btn.click();
      });
      row.appendChild(grpBtn);
    }
    out.parentNode.insertBefore(row, out.nextSibling);
  });
  /* Prefill from a shared link (?taxMonthly=200000&taxYear=2027) and run the calc. */
  try {
    const params = new URLSearchParams(window.location.search);
    let filled = false;
    CALC_OUTPUTS.forEach((c) => {
      (c.inputs || []).forEach((id) => { const el = $(id); if (el && params.has(id)) { el.value = params.get(id); filled = true; } });
      (c.selects || []).forEach((id) => { const el = $(id); if (el && params.has(id)) { el.value = params.get(id); filled = true; } });
    });
    if (filled) {
      setTimeout(() => {
        const btn = document.querySelector(".workspace-tool .btn-primary");
        if (btn) btn.click();
      }, 400);
    }
  } catch (e) {}
})();

/* ---------- Phase 3.2: drag-and-drop zone for every file input ---------- */
(function initDropzones() {
  document.querySelectorAll('.workspace-tool input[type="file"]').forEach((input) => {
    if (input.closest(".dropzone")) return;
    const dz = document.createElement("div");
    dz.className = "dropzone";
    dz.setAttribute("role", "button");
    dz.setAttribute("tabindex", "0");
    dz.setAttribute("aria-label", "Choose a file or drag it here");
    input.parentNode.insertBefore(dz, input);
    dz.appendChild(input);
    const hint = document.createElement("span");
    hint.className = "dropzone-hint";
    hint.textContent = input.multiple ? "Drag files here, or click to choose" : "Drag a file here, or click to choose";
    dz.appendChild(hint);
    const name = document.createElement("span");
    name.className = "dropzone-name";
    name.hidden = true;
    dz.appendChild(name);
    const showName = () => {
      const files = input.files || [];
      if (files.length) {
        name.textContent = Array.from(files).map((f) => f.name).join(", ");
        name.hidden = false;
        dz.classList.add("has-file");
      } else {
        name.hidden = true;
        dz.classList.remove("has-file");
      }
    };
    input.addEventListener("change", showName);
    dz.addEventListener("click", (e) => { if (e.target !== input) input.click(); });
    dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag-over"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag-over"); }));
    dz.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) {
        try { input.files = dt.files; } catch (err) {}
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    const ws = input.closest(".workspace-tool");
    const status = ws && ws.querySelector(".status");
    if (status && status.id) input.setAttribute("aria-describedby", status.id);
  });
})();

/* ---------- Phase 3.2: keep a file tool's main button disabled until a file is chosen ---------- */
(function initFileButtonGate() {
  document.querySelectorAll(".workspace-tool").forEach((ws) => {
    const fileInput = ws.querySelector('input[type="file"]');
    const btn = ws.querySelector(".btn-primary");
    if (!fileInput || !btn) return;
    const update = () => { btn.disabled = !(fileInput.files && fileInput.files.length); };
    fileInput.addEventListener("change", update);
    update();
  });
})();

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

/* Each wizard: pick a task, fill labelled fields, get the exact formula/code
   with a plain-language explanation and an example. No keyword guessing. */

/* ---------- v4: Formula / VBA / Regex / DAX wizards (parameterized templates, not AI) ---------- */

function wizardField(id, label, placeholder) {
  const ph = String(placeholder || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return '<label>' + label + ' <input id="' + id + '" type="text" placeholder="' + ph + '"></label>';
}
/* Quote a wizard criteria/lookup value when it is plain text: a user
   typing Lahore means the text "Lahore", not a cell reference. Numbers,
   cell references, sheet references and comparisons are left alone, and
   values already in quotes are not double-quoted. */

function quoteCriteria(v) {
  const t = String(v || "").trim();
  if (!t) return t;
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t;
  if (/^-?\d+(\.\d+)?$/.test(t)) return t;
  if (/^[A-Za-z]{1,3}\d+$/.test(t)) return t;
  if (/^[A-Za-z0-9_]+![A-Za-z]{1,3}\d+(:[A-Za-z]{1,3}\d+)?$/.test(t)) return t;
  return '"' + t.replace(/"/g, '""') + '"';
}
const FORMULA_TASKS = {
  sumif: { name: "SUMIF — add up values that meet one condition", fields: [["f_sum_range", "Range to add up", "B2:B20"], ["f_criteria_range", "Range to check", "A2:A20"], ["f_criteria", "Condition", "\"Approved\" or \">100\""]],
    build: (v) => "=SUMIF(" + v.f_criteria_range + ", " + quoteCriteria(v.f_criteria) + ", " + v.f_sum_range + ")",
    explain: (v) => "Adds up the numbers in " + v.f_sum_range + " only where " + v.f_criteria_range + " meets " + v.f_criteria + ".",
    example: "With sales in B2:B20 and region in A2:A20, =SUMIF(A2:A20, \"Lahore\", B2:B20) adds up Lahore sales only." },
  sumifs: { name: "SUMIFS — add up values that meet several conditions", fields: [["f_sum_range", "Range to add up", "C2:C20"], ["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Lahore\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\"2026\""]],
    build: (v) => "=SUMIFS(" + v.f_sum_range + ", " + v.f_criteria_range1 + ", " + quoteCriteria(v.f_criteria1) + ", " + v.f_criteria_range2 + ", " + quoteCriteria(v.f_criteria2) + ")",
    explain: (v) => "Adds up " + v.f_sum_range + " only where both conditions are true at the same time.",
    example: "Add Lahore 2026 sales: =SUMIFS(C2:C20, A2:A20, \"Lahore\", B2:B20, \"2026\")." },
  countifs: { name: "COUNTIFS — count rows that meet several conditions", fields: [["f_criteria_range1", "First range to check", "A2:A20"], ["f_criteria1", "First condition", "\"Approved\""], ["f_criteria_range2", "Second range to check", "B2:B20"], ["f_criteria2", "Second condition", "\">100\""]],
    build: (v) => "=COUNTIFS(" + v.f_criteria_range1 + ", " + quoteCriteria(v.f_criteria1) + ", " + v.f_criteria_range2 + ", " + quoteCriteria(v.f_criteria2) + ")",
    explain: (v) => "Counts the rows where both conditions are true.",
    example: "Count approved orders over 100: =COUNTIFS(A2:A20, \"Approved\", B2:B20, \">100\")." },
  vlookup: { name: "VLOOKUP — find a value in a table", fields: [["f_lookup", "Value to look up", "A2"], ["f_table", "Table to search", "Sheet2!A:B"], ["f_col", "Column number to return", "2"]],
    build: (v) => "=VLOOKUP(" + quoteCriteria(v.f_lookup) + ", " + v.f_table + ", " + v.f_col + ", FALSE)",
    explain: (v) => "Searches the first column of " + v.f_table + " for " + v.f_lookup + " and returns the value from column " + v.f_col + ". FALSE means exact match.",
    example: "Find a product price: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE)." },
  xlookup: { name: "XLOOKUP — find a value (modern replacement for VLOOKUP)", fields: [["f_lookup", "Value to look up", "A2"], ["f_lookup_array", "Range to search", "Sheet2!A:A"], ["f_return_array", "Range to return from", "Sheet2!B:B"]],
    build: (v) => "=XLOOKUP(" + quoteCriteria(v.f_lookup) + ", " + v.f_lookup_array + ", " + v.f_return_array + ", \"Not found\")",
    explain: (v) => "Searches " + v.f_lookup_array + " for " + v.f_lookup + " and returns the matching value from " + v.f_return_array + ". Shows \"Not found\" if there is no match.",
    example: "Find a price: =XLOOKUP(A2, Sheet2!A:A, Sheet2!B:B, \"Not found\"). Needs Microsoft 365 or Excel 2021." },
  indexmatch: { name: "INDEX + MATCH — look up in any direction", fields: [["f_return_range", "Range to return from", "B2:B20"], ["f_lookup", "Value to look up", "A2"], ["f_lookup_range", "Range to search", "Sheet2!A2:A20"]],
    build: (v) => "=INDEX(" + v.f_return_range + ", MATCH(" + quoteCriteria(v.f_lookup) + ", " + v.f_lookup_range + ", 0))",
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
  phonepk: { name: "Pakistan mobile number (03xx-xxxxxxx)", fields: [], build: () => "03\\d{2}[- ]?\\d{7}", explain: "Matches a Pakistan mobile number starting 03, with an optional dash or space.", example: "Finds 0300-1234567 and 03001234567." },
  date: { name: "Date (DD/MM/YYYY)", fields: [], build: () => "\\b\\d{2}/\\d{2}/\\d{4}\\b", explain: "Matches a date with two digits, slash, two digits, slash, four digits.", example: "Finds 09/11/2026." },
  url: { name: "Web link (http/https)", fields: [], build: () => "https?://[^\\s]+", explain: "Matches a link starting http:// or https:// up to the next space.", example: "Finds https://example.com/page." },
  numbers: { name: "Numbers in text", fields: [], build: () => "\\d+(\\.\\d+)?", explain: "Matches whole numbers and decimals.", example: "Finds 100, 25.5 and 2026 in text." },
  cnic: { name: "Pakistan CNIC (xxxxx-xxxxxxx-x)", fields: [], build: () => "\\d{5}-\\d{7}-\\d", explain: "Matches a CNIC in the standard 5-7-1 digit format with dashes.", example: "Finds 35202-1234567-1." }
};

/* Land converter: 1 Kanal = 20 Marla = 5,445 sq ft; 1 Acre = 8 Kanal = 43,560 sq ft; 1 Marla = 272.25 sq ft. */
const LAND_UNITS = { marla: 272.25, kanal: 5445, acre: 43560, sqft: 1, sqyd: 9, sqm: 10.7639 };

const TAX_SLABS_FALLBACK = {"years": [
  {"tax_year": "2026", "label": "Tax Year 2026 (FY 2025-26, Finance Act 2025)", "default": false, "slabs": [{"up_to": 600000, "rate": 0, "base_tax": 0}, {"up_to": 1200000, "rate": 0.01, "base_tax": 0}, {"up_to": 2200000, "rate": 0.11, "base_tax": 6000}, {"up_to": 3200000, "rate": 0.23, "base_tax": 116000}, {"up_to": 4100000, "rate": 0.30, "base_tax": 346000}, {"up_to": null, "rate": 0.35, "base_tax": 616000}], "surcharge": {"threshold": 10000000, "rate": 0.09, "note": "9% surcharge on tax payable where taxable income exceeds Rs 10,000,000 (s.4AB)."}},
  {"tax_year": "2027", "label": "Tax Year 2027 (FY 2026-27, Finance Act 2026) - current", "default": true, "slabs": [{"up_to": 600000, "rate": 0, "base_tax": 0}, {"up_to": 1200000, "rate": 0.01, "base_tax": 0}, {"up_to": 2200000, "rate": 0.11, "base_tax": 6000}, {"up_to": 3200000, "rate": 0.20, "base_tax": 116000}, {"up_to": 4100000, "rate": 0.25, "base_tax": 316000}, {"up_to": 5600000, "rate": 0.29, "base_tax": 541000}, {"up_to": 7000000, "rate": 0.32, "base_tax": 976000}, {"up_to": null, "rate": 0.35, "base_tax": 1424000}], "surcharge": {"threshold": null, "rate": 0, "note": "The 9% surcharge for salaried individuals was withdrawn by Finance Act 2026 (s.4AB). No surcharge for salaried TY2027."}}
]};
let TAX_DATA = null;

/* ---------- v4: Pakistan / Urdu tools ---------- */

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

/* ---------- v4: standalone Formula Explainer page ---------- */

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

/* ---------- Phase 4.5/4.6: analytics (tool_view, tool_start) + aria-live on status lines ---------- */

(function akAnalytics() {
  // tool_view: once per tool page load (tool pages and /ur/ pages only).
  var view = (window.location.pathname || "").match(/^\/(?:tools|ur)\/([^\/]+)/);
  if (view && window.AK && window.AK.track) window.AK.track("tool_view", { tool: view[1] });
  // tool_start: first click on a tool's main button, once per tool.
  var started = {};
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest(".workspace-tool .btn-primary") : null;
    if (!btn) return;
    var ws = btn.closest(".workspace-tool");
    var name = akToolName(ws);
    if (!name || started[name]) return;
    started[name] = true;
    if (window.AK && window.AK.track) window.AK.track("tool_start", { tool: name });
  }, true);
  // Status lines announce results to screen readers.
  document.querySelectorAll(".workspace-tool .status").forEach(function (s) {
    if (!s.hasAttribute("aria-live")) s.setAttribute("aria-live", "polite");
  });
})();
