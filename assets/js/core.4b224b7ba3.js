/* AK Premium v4 - client-side application logic.
   AK Premium runs entirely in the browser. No file is uploaded by AK Premium.
   Site settings live in /config.js (SITE_NAME, SITE_URL, CONTACT_EMAIL,
   ADSENSE_CLIENT_ID, GA_MEASUREMENT_ID). Ads and analytics stay disabled
   while their IDs are empty, and consent-gated by common.js. */
const AK_CFG = window.AK_CONFIG || {};

/* ---------- helpers ---------- */
function $(id) { return document.getElementById(id); }
function setStatus(id, message) { const el = $(id); if (el) el.textContent = message; }
/* Error status (Phase 4.4): an error message is announced assertively and
   linked to the workspace's first input, so a screen reader user finds
   both the error and the field it belongs to. */
function linkErrorToInput(el) {
  if (!el || !el.id) return;
  const ws = el.closest ? el.closest(".workspace-tool") : null;
  if (!ws) return;
  const input = ws.querySelector("input, select, textarea");
  if (!input) return;
  const cur = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  if (!cur.includes(el.id)) cur.push(el.id);
  input.setAttribute("aria-describedby", cur.join(" "));
}
function setError(id, message) {
  setStatus(id, message);
  const el = $(id);
  if (el) { el.setAttribute("role", "alert"); linkErrorToInput(el); }
}
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
  "tool-pdfimages": [["Image Compressor", "/tools/image-compressor"], ["Images to PDF", "/tools/images-to-pdf"]],
  "tool-jpgtopdf": [["PNG to PDF", "/tools/png-to-pdf"], ["Images to PDF", "/tools/images-to-pdf"], ["Compress PDF", "/tools/compress-pdf"]],
  "tool-pngtopdf": [["JPG to PDF", "/tools/jpg-to-pdf"], ["Images to PDF", "/tools/images-to-pdf"], ["Compress PDF", "/tools/compress-pdf"]],
  "tool-pdftojpg": [["PDF to PNG", "/tools/pdf-to-png"], ["PDF to Images", "/tools/pdf-to-images"], ["Image Compressor", "/tools/image-compressor"]],
  "tool-pdftopng": [["PDF to JPG", "/tools/pdf-to-jpg"], ["PDF to Images", "/tools/pdf-to-images"], ["Image Compressor", "/tools/image-compressor"]],
  "tool-htmltopdf": [["TXT / HTML to PDF", "/tools/txt-html-to-pdf"], ["Create PDF", "/tools/create-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-extractimages": [["PDF to Images", "/tools/pdf-to-images"], ["PDF to JPG", "/tools/pdf-to-jpg"], ["Image Compressor", "/tools/image-compressor"]],
  "tool-headerfooter": [["Add Watermark", "/tools/add-watermark"], ["Add Page Numbers", "/tools/add-page-numbers"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-flatten": [["Protect PDF", "/tools/protect-pdf"], ["Merge PDF", "/tools/merge-pdf"], ["Compress PDF", "/tools/compress-pdf"]],
  "tool-metadata": [["Edit PDF", "/tools/edit-pdf"], ["Protect PDF", "/tools/protect-pdf"], ["Merge PDF", "/tools/merge-pdf"]],
  "tool-resizepage": [["Compress PDF", "/tools/compress-pdf"], ["Merge PDF", "/tools/merge-pdf"], ["Organize PDF", "/tools/organize-pdf"]],
  "tool-pngtojpg": [["JPG to PNG", "/tools/jpg-to-png"], ["Image Converter", "/tools/image-converter"], ["Image Compressor", "/tools/image-compressor"]],
  "tool-jpgtopng": [["PNG to JPG", "/tools/png-to-jpg"], ["Image Converter", "/tools/image-converter"], ["Image Compressor", "/tools/image-compressor"]],
  "tool-webptojpg": [["JPG to WebP", "/tools/jpg-to-webp"], ["Image Converter", "/tools/image-converter"], ["PNG to JPG", "/tools/png-to-jpg"]],
  "tool-webptopng": [["WebP to JPG", "/tools/webp-to-jpg"], ["Image Converter", "/tools/image-converter"], ["JPG to PNG", "/tools/jpg-to-png"]],
  "tool-jpgtowebp": [["WebP to JPG", "/tools/webp-to-jpg"], ["Image Converter", "/tools/image-converter"], ["PNG to JPG", "/tools/png-to-jpg"]],
  "tool-svgtopng": [["Image Converter", "/tools/image-converter"], ["PNG to JPG", "/tools/png-to-jpg"], ["Image Resizer", "/tools/image-resizer"]],
  "tool-imgcrop": [["Image Resizer", "/tools/image-resizer"], ["Rotate and Flip Image", "/tools/rotate-flip-image"], ["Image Converter", "/tools/image-converter"]],
  "tool-imgrotateflip": [["Image Cropper", "/tools/image-cropper"], ["Image Resizer", "/tools/image-resizer"], ["Passport Photo Maker", "/tools/passport-photo-maker"]],
  "tool-passport": [["Image Cropper", "/tools/image-cropper"], ["Image Resizer", "/tools/image-resizer"], ["Rotate and Flip Image", "/tools/rotate-flip-image"]],
  "tool-charcount": [["Word Counter", "/tools/word-counter"], ["Readability Checker", "/tools/readability-checker"], ["Word Frequency Counter", "/tools/word-frequency"]],
  "tool-lorem": [["Fancy Text Generator", "/tools/fancy-text-generator"], ["Markdown Previewer", "/tools/markdown-previewer"], ["Word Counter", "/tools/word-counter"]],
  "tool-dedupe": [["Sort Lines", "/tools/sort-lines"], ["Find and Replace", "/tools/find-and-replace"], ["Text Diff Checker", "/tools/text-diff-checker"]],
  "tool-sortlines": [["Remove Duplicate Lines", "/tools/remove-duplicate-lines"], ["Find and Replace", "/tools/find-and-replace"], ["Text Diff Checker", "/tools/text-diff-checker"]],
  "tool-tts": [["Readability Checker", "/tools/readability-checker"], ["Word Counter", "/tools/word-counter"], ["Translate Helper", "/tools/translate-helper"]],
  "tool-markdown": [["Text Diff Checker", "/tools/text-diff-checker"], ["Word Counter", "/tools/word-counter"], ["Case Converter", "/tools/case-converter"]],
  "tool-fancy": [["Case Converter", "/tools/case-converter"], ["Word Counter", "/tools/word-counter"], ["QR Code Generator", "/tools/qr-code-generator"]],
  "tool-findreplace": [["Remove Duplicate Lines", "/tools/remove-duplicate-lines"], ["Sort Lines", "/tools/sort-lines"], ["Text Diff Checker", "/tools/text-diff-checker"]],
  "tool-readability": [["Word Counter", "/tools/word-counter"], ["Word Frequency Counter", "/tools/word-frequency"], ["Character Counter", "/tools/character-counter"]],
  "tool-wordfreq": [["Word Counter", "/tools/word-counter"], ["Readability Checker", "/tools/readability-checker"], ["Character Counter", "/tools/character-counter"]],
  "tool-stt": [["Text to Speech", "/tools/text-to-speech"], ["Word Counter", "/tools/word-counter"], ["Readability Checker", "/tools/readability-checker"]],
  "tool-slug": [["URL Encode Decode", "/tools/url-encode-decode"], ["Case Converter", "/tools/case-converter"], ["Word Counter", "/tools/word-counter"]],
  "tool-jsonyaml": [["YAML to JSON", "/tools/yaml-to-json"], ["JSON Formatter", "/tools/json-formatter"], ["JSON to XML", "/tools/json-to-xml"]],
  "tool-yamljson": [["JSON to YAML", "/tools/json-to-yaml"], ["JSON Formatter", "/tools/json-formatter"], ["JSON to CSV", "/tools/json-to-csv"]],
  "tool-jsonxml": [["XML to JSON", "/tools/xml-to-json"], ["JSON Formatter", "/tools/json-formatter"], ["JSON to YAML", "/tools/json-to-yaml"]],
  "tool-xmljson": [["JSON to XML", "/tools/json-to-xml"], ["JSON Formatter", "/tools/json-formatter"], ["CSV to JSON", "/tools/csv-to-json"]],
  "tool-jsoncsv": [["CSV to JSON", "/tools/csv-to-json"], ["JSON Formatter", "/tools/json-formatter"], ["CSV to Excel", "/tools/csv-to-excel"]],
  "tool-jwt": [["Base64", "/tools/base64"], ["JSON Formatter", "/tools/json-formatter"], ["Hash Generator", "/tools/hash-generator"]],
  "tool-hash": [["Password Generator", "/tools/password-generator"], ["Base64", "/tools/base64"], ["JWT Decoder", "/tools/jwt-decoder"]],
  "tool-urlenc": [["Slug Generator", "/tools/slug-generator"], ["Base64", "/tools/base64"], ["JWT Decoder", "/tools/jwt-decoder"]]
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
    // Phase 4.5: next_step_click records only the destination tool slug.
    a.addEventListener("click", () => {
      if (window.AK && window.AK.track) window.AK.track("next_step_click", { tool: href.split("/").pop() });
    });
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
    linkErrorToInput(el);
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
  if (!ok) { setError(statusId, name + " did not load. Check your connection and try again."); return false; }
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
  "qrcode": "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js",
  "jspdf": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "js-yaml": "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js",
  "md5": "https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js",
  "jsonrepair": "https://cdn.jsdelivr.net/npm/jsonrepair@3.11.0/lib/umd/jsonrepair.min.js",
  "ajv2020": "https://cdnjs.cloudflare.com/ajax/libs/ajv/8.17.1/ajv2020.min.js",
  "marked": "https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js",
  "marked-footnote": "https://cdn.jsdelivr.net/npm/marked-footnote@1.3.0/dist/index.umd.js",
  "forge": "https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js",
  "diff-match-patch": "https://cdn.jsdelivr.net/npm/diff-match-patch@1.0.5/index.js",
  "jspdf-autotable": "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.js",
  "html2canvas": "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  /* Chart.js 4.4.7 publishes chart.umd.js, NOT chart.umd.min.js: the
     .min.js URL is generated by jsDelivr and its header warns against
     SRI on generated files, so the published file is pinned instead
     (byte-identical to the npm tarball, SRI verified at build time). */
  "chartjs": "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js",
  /* PapaParse 5.5.3 (MIT) for csv-to-excel delimiter auto-detect + preview;
     fast-formula-parser 1.0.19 (MIT) for formula-generator validation.
     Both pinned files are byte-identical to their npm tarballs. */
  "papaparse": "https://cdn.jsdelivr.net/npm/papaparse@5.5.3/papaparse.min.js",
  "formula-parser": "https://cdn.jsdelivr.net/npm/fast-formula-parser@1.0.19/build/parser.min.js",
  /* UTIF.js 3.1.0 (MIT) decodes TIFF input for Image Converter; pako 2.1.0
     (MIT) inflates deflate-compressed TIFF strips, loaded only when a TIFF
     actually needs it. exifr 7.1.3 full build (MIT) reads EXIF orientation
     from JPEG/TIFF/PNG/WebP. Cropper.js 1.6.2 (MIT) powers Image Cropper.
     All four pinned files are byte-identical to their npm tarballs. */
  "utif": "https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js",
  "exifr": "https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js",
  "cropperjs": "https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.js",
  "pako": "https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js",
  /* UPNG.js 2.1.0 (MIT) encodes PNG-8 (256-colour palette) for JPG to PNG
     and WebP to PNG; it needs pako, loaded before it. color-thief 2.4.0
     (MIT) reads dominant colours from an uploaded image for Color Palette.
     jsQR 1.4.0 (Apache-2.0) decodes a generated QR code back for the scan
     test. zxcvbn 4.4.2 (MIT) scores password strength with a crack-time
     estimate. qrcode-generator 1.4.4 (MIT) replaced qrcodejs 1.0.0 for QR
     Code Generator: it exposes the QR modules, so size, error-correction
     level, colours and SVG output are all under our control. All five
     pinned files are byte-identical to their npm tarballs. */
  "upng": "https://cdn.jsdelivr.net/npm/upng-js@2.1.0/UPNG.js",
  "colorthief": "https://cdn.jsdelivr.net/npm/colorthief@2.4.0/dist/color-thief.umd.js",
  "jsqr": "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js",
  "zxcvbn": "https://cdn.jsdelivr.net/npm/zxcvbn@4.4.2/dist/zxcvbn.js"
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
  "qrcode": "sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k",
  "jspdf": "sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk",
  "js-yaml": "sha384-+pxiN6T7yvpryuJmE1gM9PX7yQit15auDb+ZwwvJOd/4be2Cie5/IuVXgQb/S9du",
  "md5": "sha384-WAahC3S+69Co45zyyuhCjvdMwo7a42Yn0mM0IgZIUlYNebG24AVkPUltj3BQnM85",
  "jsonrepair": "sha384-2I3jTKkZ/Kqabhjo6l7hVZMJ7CBTAC/T52HC0PCG9iEry5vIS5qUckwnfztzkn/I",
  "ajv2020": "sha384-vsMiC2R9fcX/SqeA9xJ+Lpbbe1fRi7RDpgHenZH7A8yXAoX+9T4m8MfuwrafZAAL",
  "marked": "sha384-948ahk4ZmxYVYOc+rxN1H2gM1EJ2Duhp7uHtZ4WSLkV4Vtx5MUqnV+l7u9B+jFv+",
  "marked-footnote": "sha384-eMG0oh50tjGAfa6zAmiAlwrgAO4MmBKb5wosyU0mpQx80qj0fUYCBt1KwO9e8qxp",
  "forge": "sha384-xE6n3RBMZWgwAhyzoIMfY7HN3oDBa/+HBwFFNyxsdY8kseup7C4Blx1yDzprEESV",
  "diff-match-patch": "sha384-tEDljuMsPeOCXxbbsrmf3+iiytDjHShxwUCWxZqsZc3/jJHz2XQMovzRM+YDuJ0L",
  "jspdf-autotable": "sha384-btaaVGtvWi0Q6xlr74cOkIWG+SCaiZ9Tfno8uuHjzoekIVV+y5K3dGPEGqqS3ZN0",
  "html2canvas": "sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H",
  "chartjs": "sha384-zYPBGXwO4633CABX/5Spf6emCKUJCfoOkhOMYyxMsatqQZPnDblmmOewfjsIVWCM",
  "papaparse": "sha384-Jd2/X5FXVKahwaY2nivvw4LfSTg9idSj8yNXWtT4qef0fHSYr6M7M8bJAfbFYoMc",
  "formula-parser": "sha384-qbZbp83iiop9pehvHB2JuzaTMs+iuThw09hlU9pq3v4stgbnqXl/FNaPGkG6+PWg",
  "utif": "sha384-RyBmXHdfZ/Uon+ud+/AqSyWpUWnKYt2tkRG/P4gWoRUGDU+qIAV3tGBPNlYTBZEF",
  "exifr": "sha384-KrOocIA+lZcNUz2MDavnT/FuX+CbTREJihUi0bp8QUSwhE2AkGTNpv2b7yMbBkx5",
  "cropperjs": "sha384-jrOgQzBlDeUNdmQn3rUt/PZD+pdcRBdWd/HWRqRo+n2OR2QtGyjSaJC0GiCeH+ir",
  "pako": "sha384-rNlaE5fs9dGIjmxWDALQh/RBAaGRYT5ChrzHo6tRfgrZ36iRFAiquP5g41Jsv+0j",
  "upng": "sha384-5zRBkJ6IHy9ezWHX/cBuwC0SnrK23Cfx6G6kIjwR5no9khaSv2md2ZHMXphI3UCB",
  "colorthief": "sha384-ZkLR4RZXZ2JWJPEflQmS8WA93TozFLyxZwFHAny12Of6jNKBDWeEx8OF7r1Hg51r",
  "jsqr": "sha384-b5Ya4Bq3qCyz39m2ISh+4DxjAIljdeFwK/BsXLuj9gugaNwAcj/ia15fxNZL9Nlx",
  "zxcvbn": "sha384-LXuP8lknSGBOLVn4fwVOl+rWR+zOEtZx6CF9ZLaN6gKBgLByU4D79VWWjV4/gefq"
};
const _libLoaded = {};
function loadLibrary(name, statusId) {
  if (name === "jspdf-autotable" && window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(true);
  if (window[name === "pdfjs" ? "pdfjsLib" : name === "jspdf" ? "jspdf" : name === "js-yaml" ? "jsyaml" : name === "jsonrepair" ? "JSONRepair" : name === "marked-footnote" ? "markedFootnote" : name === "chartjs" ? "Chart" : name === "papaparse" ? "Papa" : name === "formula-parser" ? "FormulaParser" : name === "utif" ? "UTIF" : name === "cropperjs" ? "Cropper" : name === "upng" ? "UPNG" : name === "colorthief" ? "ColorThief" : name === "jsqr" ? "jsQR" : name] || _libLoaded[name]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const sc = document.createElement("script");
    sc.src = LIB_URLS[name]; sc.async = true;
    if (LIB_SRI[name]) { sc.integrity = LIB_SRI[name]; sc.crossOrigin = "anonymous"; }
    sc.onload = () => { _libLoaded[name] = true; resolve(true); };
    sc.onerror = () => { setError(statusId, "Could not load the " + name + " library. Check your connection and try again."); resolve(false); };
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
  if (file.size > MAX_FILE_BYTES) { setError(statusId, "That file is " + (file.size / 1048576).toFixed(1) + " MB. Please use a file under 50 MB so the browser can process it."); return false; }
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
  card.addEventListener("click", (e) => {
    if (e.target.closest(".fav-btn")) return; // the star only toggles a favourite
    openWorkspace(card.dataset.target, card.dataset.excelModule);
  });
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
  let visible = 0; const sectionsWithVisible = new Set(); const seenSlugs = new Set();
  cards.forEach((card) => {
    // Search wins over the PDF tab filter: a trending chip like "VBA Macro Writer"
    // must find its tool even when a PDF tab was active before.
    const show = query ? cardMatches(card, query) : (currentGroup === "all" || card.dataset.group === currentGroup);
    card.style.display = show ? "" : "none";
    // One tool can render several cards (Popular strip, hub sections), so the
    // search count uses distinct tools, not card elements.
    if (show) { visible++; const slug = card.dataset.slug || card.dataset.target; if (slug) seenSlugs.add(slug); const sec = card.closest(".tool-section"); if (sec) sectionsWithVisible.add(sec.id); }
  });
  if (searchStatus) {
    // Search status from the UI strings (Global shell, locales/en.json).
    const tpl = (window.AK_STRINGS && window.AK_STRINGS.search && window.AK_STRINGS.search.found) || "Found {n} tool(s) matching \"{q}\".";
    searchStatus.textContent = query ? tpl.replace("{n}", String(seenSlugs.size)).replace("{q}", query) : "";
  }
  const noResults = $("noResults");
  if (noResults) {
    const showEmpty = !!query && seenSlugs.size === 0;
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
/* /?q= prefill (Global shell, design brief 2.7): a shared link like /?q=merge
   fills the search box and filters the cards on load. */
(function prefillSearchFromQuery() {
  if (!heroSearch) return;
  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { heroSearch.value = q; filterCards(); }
  } catch (e) { /* a bad query string never blocks the page */ }
})();
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
      // Opening the mega-menu closes the globe panel (v12 visual fix: the
      // two panels overlapped when both were left open).
      if (open) {
        const gp = $("globePanel"), gb = $("globeBtn");
        if (gp && !gp.hidden) { gp.hidden = true; if (gb) gb.setAttribute("aria-expanded", "false"); }
      }
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
  // (Header search is now a dropdown handled by the Global shell section;
  // the search icon no longer just focuses the hero search box.)
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
      // The card is a <div> now (Global shell), so Enter / ArrowDown focus
      // and click its inner link, not the card itself.
      if (e.key === "Enter") {
        const first = visibleCards()[0];
        const link = first && first.querySelector(".tool-card-link");
        if (link) { e.preventDefault(); link.click(); }
      } else if (e.key === "ArrowDown") {
        const first = visibleCards()[0];
        const link = first && first.querySelector(".tool-card-link");
        if (link) { e.preventDefault(); link.focus(); }
      }
    });
    // Arrow keys move between the visible card links (delegated, so cards
    // built later by the favourites / recently-used sections work too).
    document.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const link = e.target && e.target.closest ? e.target.closest(".tool-card-link") : null;
      if (!link) return;
      const list = visibleCards().map((c) => c.querySelector(".tool-card-link")).filter(Boolean);
      const i = list.indexOf(link);
      if (i === -1) return;
      if (e.key === "ArrowDown" && list[i + 1]) { e.preventDefault(); list[i + 1].focus(); }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (list[i - 1]) list[i - 1].focus();
        else heroSearch.focus();
      }
    });
    const clearBtn = $("heroSearchClear");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      heroSearch.value = ""; heroSearch.focus(); filterCards();
    });
  }
})();

/* ---------- Global shell: favourites & recently used ---------- */
/* Favourites (star) and Recently used live only in the browser
   (localStorage, try/catch). No file names or contents are ever stored.
   The two homepage sections are rendered empty and hidden; this fills them
   from /data/search-index.json, so any of the 68 tools can appear. */
const FAV_KEY = "ak-favourites";
const RECENT_KEY = "ak-recent";
function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function readStoredList(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch (e) { return []; }
}
function writeStoredList(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) { /* private mode: it just does not persist */ }
}
/* Read a dotted UI string from window.AK_STRINGS (locales/en.json). */
function str(key) {
  let cur = window.AK_STRINGS || {};
  for (const p of String(key).split(".")) { cur = cur && cur[p]; if (cur === undefined) return ""; }
  return typeof cur === "string" ? cur : "";
}
function fillTemplate(tpl, vars) {
  let out = tpl || "";
  Object.keys(vars || {}).forEach((k) => { out = out.split("{" + k + "}").join(String(vars[k])); });
  return out;
}
/* The search index, fetched once and cached. The header search and the
   favourites / recently-used sections both read it. */
let _searchIndexPromise = null;
function getSearchIndex() {
  if (!_searchIndexPromise) {
    _searchIndexPromise = (typeof fetch === "function" ? fetch("/data/search-index.json").then((r) => r.json()) : Promise.resolve({ tools: [] }))
      .catch(() => ({ tools: [] }));
  }
  return _searchIndexPromise;
}
function isFav(slug) { return readStoredList(FAV_KEY).indexOf(slug) !== -1; }
function favCardHTML(tool, fav) {
  /* Same card shape as build.py card_html(), built from a search-index entry. */
  const badge = (tool.badges && tool.badges[0]) ? '<span class="badge ' + escHtml(tool.badges[0].class) + '">' + escHtml(tool.badges[0].label) + '</span>' : "";
  const fmt = tool.format ? '<span class="format">' + escHtml(tool.format) + '</span>' : "";
  const iconCls = tool.iconClass ? " " + tool.iconClass : "";
  const label = fillTemplate(str(fav ? "favourites.remove" : "favourites.add"), { name: tool.title });
  return '<div class="tool-card' + iconCls + '" data-slug="' + escHtml(tool.slug) + '">'
    + '<a class="tool-card-link" href="/tools/' + escHtml(tool.slug) + '"><span class="icon"><svg aria-hidden="true"><use href="#' + escHtml(tool.icon) + '"/></svg></span>'
    + '<span class="tool-card-body"><span class="tool-card-head"><strong>' + escHtml(tool.title) + '</strong>' + fmt + badge + '</span>'
    + '<span class="tool-card-desc">' + escHtml(tool.short) + '</span></span></a>'
    + '<button type="button" class="fav-btn' + (fav ? " on" : "") + '" data-slug="' + escHtml(tool.slug) + '" aria-pressed="' + (fav ? "true" : "false") + '" aria-label="' + escHtml(label) + '" title="' + escHtml(label) + '">\u2605</button></div>';
}
function renderToolListSection(gridId, sectionId, slugs) {
  const grid = $(gridId), section = $(sectionId);
  if (!grid || !section) return;
  if (!slugs.length) { section.hidden = true; grid.innerHTML = ""; return; }
  getSearchIndex().then((d) => {
    const bySlug = {};
    (d.tools || []).forEach((t) => { bySlug[t.slug] = t; });
    const cards = slugs.map((s) => bySlug[s]).filter(Boolean).map((t) => favCardHTML(t, isFav(t.slug))).join("");
    grid.innerHTML = cards;
    section.hidden = cards === "";
    syncFavButtons();
  });
}
function renderFavSection() { renderToolListSection("favGrid", "section-favourites", readStoredList(FAV_KEY)); }
function renderRecentSection() { renderToolListSection("recentGrid", "section-recent", readStoredList(RECENT_KEY)); }
function syncFavButtons() {
  document.querySelectorAll(".fav-btn").forEach((b) => {
    const on = isFav(b.dataset.slug);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.classList.toggle("on", on);
    const card = b.closest(".tool-card");
    const name = (card && card.querySelector("strong") && card.querySelector("strong").textContent) || b.dataset.slug;
    const label = fillTemplate(str(on ? "favourites.remove" : "favourites.add"), { name: name });
    b.setAttribute("aria-label", label);
    b.setAttribute("title", label);
  });
}
function toggleFav(slug) {
  const list = readStoredList(FAV_KEY);
  const i = list.indexOf(slug);
  if (i === -1) list.unshift(slug); else list.splice(i, 1);
  writeStoredList(FAV_KEY, list);
  syncFavButtons();
  renderFavSection();
}
/* Delegated favourite toggle (covers cards built by JS too). */
document.addEventListener("click", (e) => {
  const btn = e.target && e.target.closest ? e.target.closest(".fav-btn") : null;
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  toggleFav(btn.dataset.slug);
});
/* Record a tool-page visit (the tool page body carries data-tool). */
(function recordToolVisit() {
  const slug = document.body && document.body.dataset ? document.body.dataset.tool : null;
  if (!slug) return;
  const list = readStoredList(RECENT_KEY).filter((s) => s !== slug);
  list.unshift(slug);
  writeStoredList(RECENT_KEY, list.slice(0, 8));
})();
/* Clear the recently-used list. */
(function initRecentClear() {
  const btn = $("recentClear");
  if (btn) btn.addEventListener("click", () => { writeStoredList(RECENT_KEY, []); renderRecentSection(); });
})();
/* Sync the stars and fill the two sections on load. */
(function initFavRecent() {
  syncFavButtons();
  renderFavSection();
  renderRecentSection();
})();

/* ---------- Global shell: language & region preferences ---------- */
/* Preferences live only in the browser (localStorage, try/catch). Defaults
   come from navigator.language and the timezone. No IP or geo lookup.
   Region, units and paper size set the defaults for calculators and PDF
   tools; only Pakistan has country tools today, so the Country tools band
   still opens on the Pakistan tab. */
const PREFS_KEY = "ak-prefs";
function readPrefs() {
  try { const v = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; }
}
function writePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {} }
function regionFromLocale() {
  try {
    const lang = (navigator.language || "").toLowerCase();
    const m = lang.match(/-(pk|in|ae|sa|gb|uk|us)$/);
    if (m) return { pk: "pk", in: "in", ae: "ae", sa: "ae", gb: "uk", uk: "uk", us: "us" }[m[1]] || "global";
    const tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || "";
    if (/Karachi|Islamabad|Lahore/.test(tz)) return "pk";
    if (/Kolkata|Calcutta|Mumbai|Delhi/.test(tz)) return "in";
    if (/Dubai|Riyadh|Jeddah/.test(tz)) return "ae";
    if (/London/.test(tz)) return "uk";
    if (/^(America|Canada)\//.test(tz)) return "us";
  } catch (e) { /* fall through to global */ }
  return "global";
}
function defaultPrefs() {
  const region = regionFromLocale();
  return {
    language: "en",
    region: region,
    units: region === "us" ? "imperial" : "metric",
    paper: region === "us" ? "letter" : "a4",
  };
}
function getPrefs() {
  const saved = readPrefs(), d = defaultPrefs();
  return {
    language: saved.language || d.language,
    region: saved.region || d.region,
    units: saved.units || d.units,
    paper: saved.paper || d.paper,
  };
}
(function initGlobePanel() {
  const btn = $("globeBtn"), panel = $("globePanel");
  if (!btn || !panel) return;
  const prefs = getPrefs();
  const langSel = $("prefLanguage"), regionSel = $("prefRegion"), unitsSel = $("prefUnits"), paperSel = $("prefPaper");
  if (langSel) langSel.value = prefs.language;
  if (regionSel) regionSel.value = prefs.region;
  if (unitsSel) unitsSel.value = prefs.units;
  if (paperSel) paperSel.value = prefs.paper;
  function save() {
    writePrefs({
      language: langSel ? langSel.value : "en",
      region: regionSel ? regionSel.value : "global",
      units: unitsSel ? unitsSel.value : "metric",
      paper: paperSel ? paperSel.value : "a4",
    });
  }
  [langSel, regionSel, unitsSel, paperSel].forEach((sel) => { if (sel) sel.addEventListener("change", save); });
  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    // Opening the globe panel closes the mega-menu (same overlap fix).
    if (open) {
      const drop = document.querySelector(".nav-drop"), db = $("toolsMenuBtn");
      if (drop) { drop.classList.remove("open"); if (db) db.setAttribute("aria-expanded", "false"); }
    }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(panel.hidden); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
})();

/* ---------- Global shell: header search ---------- */
/* The header search icon opens a dropdown that searches every tool from
   /data/search-index.json (fetched once). Enter opens the first result. */
(function headerSearch() {
  const btn = $("headerSearchBtn"), panel = $("headerSearch"), input = $("headerSearchInput"), results = $("headerSearchResults");
  if (!btn || !panel || !input || !results) return;
  function matchIndex(tool, q) {
    const qc = normCompact(q);
    const hay = normText(tool.title + " " + tool.category + " " + (tool.keywords || []).join(" ") + " " + tool.short);
    if (normCompact(hay).indexOf(qc) !== -1) return true;
    const words = normText(q).split(" ");
    return words.every((w) => hay.split(" ").some((hw) => hw.indexOf(w) === 0));
  }
  function resultHTML(tool) {
    return '<a href="/tools/' + escHtml(tool.slug) + '" role="option"><strong>' + escHtml(tool.title) + '</strong><span>' + escHtml(tool.category) + '</span></a>';
  }
  function renderMatches(q) {
    const query = String(q || "").trim();
    if (!query) {
      results.innerHTML = '<p class="header-search-hint">' + escHtml(str("headerSearch.hint")) + '</p>';
      return;
    }
    getSearchIndex().then((d) => {
      const hits = (d.tools || []).filter((t) => matchIndex(t, query)).slice(0, 8);
      results.innerHTML = hits.length
        ? hits.map(resultHTML).join("")
        : '<p class="header-search-hint">' + escHtml(str("headerSearch.empty")) + '</p>';
    });
  }
  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { input.focus(); renderMatches(input.value); }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(panel.hidden); });
  document.addEventListener("click", (e) => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) setOpen(false); });
  input.addEventListener("input", () => renderMatches(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = results.querySelector("a");
      if (first) { e.preventDefault(); first.click(); }
    } else if (e.key === "ArrowDown") {
      const first = results.querySelector("a");
      if (first) { e.preventDefault(); first.focus(); }
    } else if (e.key === "Escape") {
      setOpen(false); btn.focus();
    }
  });
  results.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(results.querySelectorAll("a"));
    const i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && links[i + 1]) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); if (links[i - 1]) links[i - 1].focus(); else input.focus(); }
  });
})();

/* ---------- Global shell: country tabs ---------- */
/* The Country tools band on the homepage: one tab per country, Pakistan
   first and fullest. Only Pakistan has tools today; the other tabs say so
   honestly and link to Contact. */
(function countryTabs() {
  const tabs = document.querySelectorAll(".country-tab");
  if (!tabs.length) return;
  function activate(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("active", on);
      const panel = document.querySelector('.country-panel[data-panel="' + t.dataset.country + '"]');
      if (panel) panel.hidden = !on;
    });
  }
  tabs.forEach((t) => t.addEventListener("click", () => activate(t)));
})();

/* ---------- Global shell: hub view toggle ---------- */
/* Category hub pages: switch the tool grid between a grid and a list. */
(function hubViewToggle() {
  const grid = $("hubGrid");
  const btns = document.querySelectorAll(".view-toggle button");
  if (!grid || !btns.length) return;
  btns.forEach((b) => b.addEventListener("click", () => {
    const list = b.dataset.view === "list";
    grid.classList.toggle("list-view", list);
    btns.forEach((x) => { const on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
  }));
})();

/* Flatten marked inline tokens into styled runs {text, bold, italic,
   code}. Used only by Create PDF (Markdown mode). */

/* ---------- PDF Studio ---------- */

function readJpegOrientation(buf) {
  try {
    const d = new DataView(buf);
    if (d.getUint16(0) !== 0xFFD8) return 1;
    let off = 2;
    while (off + 4 <= d.byteLength) {
      if (d.getUint8(off) !== 0xFF) return 1;
      const marker = d.getUint8(off + 1);
      const len = d.getUint16(off + 2);
      if (marker === 0xE1 && len > 8) {
        if (d.getUint32(off + 4) !== 0x45786966 || d.getUint16(off + 8) !== 0) return 1;
        const tiff = off + 10;
        const le = d.getUint16(tiff) === 0x4949;
        const ifd = tiff + d.getUint32(tiff + 4, le);
        const n = d.getUint16(ifd, le);
        for (let i = 0; i < n; i++) {
          const e = ifd + 2 + i * 12;
          if (d.getUint16(e, le) === 0x0112) return d.getUint16(e + 8, le) || 1;
        }
        return 1;
      }
      if (marker === 0xDA || marker === 0xD9) return 1;
      off += 2 + len;
    }
  } catch (e) { /* fall through */ }
  return 1;
}
/* Draw an image onto a fresh canvas with its EXIF orientation applied
   (rotate / mirror for values 2-8). Returns the canvas. */

function orientedImageCanvas(img, orientation) {
  const swap = orientation >= 5 && orientation <= 8;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;
  const ctx = canvas.getContext("2d");
  const w = img.width, h = img.height;
  if (orientation === 2) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  else if (orientation === 3) { ctx.translate(w, h); ctx.rotate(Math.PI); }
  else if (orientation === 4) { ctx.translate(0, h); ctx.scale(1, -1); }
  else if (orientation === 5) { ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); }
  else if (orientation === 6) { ctx.translate(canvas.width, 0); ctx.rotate(0.5 * Math.PI); }
  else if (orientation === 7) { ctx.translate(canvas.width, canvas.height); ctx.rotate(0.5 * Math.PI); ctx.scale(-1, 1); }
  else if (orientation === 8) { ctx.translate(0, canvas.height); ctx.rotate(-0.5 * Math.PI); }
  ctx.drawImage(img, 0, 0);
  return canvas;
}
/* Shared engine: images to PDF. Used by Images to PDF and by the JPG to
   PDF and PNG to PDF landing pages. Takes no element ids, so it splits to
   core.js. opts: {layout "1"|"2"|"4", pageSize "a4"|"letter", marginMm,
   fit "fit"|"fill", autoRotate, keepMeta, quality 0.5-1, dpi 72|150|300,
   grayscale, flattenBg (null or a CSS colour to paint behind transparent
   PNGs), toJpeg (PNGs are saved as JPEG instead of PNG)}.
   Defaults preserve the old behaviour (one image per A4 page, fitted).
   DPI sets the print size: an image prints at (pixels * 72 / dpi) points,
   capped by its grid cell. JPEGs are re-encoded through a canvas, which
   strips EXIF metadata; keepMeta embeds the original JPEG bytes instead
   (no rotation correction and no re-encode in that case). */

async function imagesToPdf(files, statusId, outName, opts) {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", statusId)) return;
  const o = Object.assign({ layout: "1", pageSize: "a4", marginMm: 3.5, fit: "fit", autoRotate: true, keepMeta: false, quality: 0.92, dpi: 150, grayscale: false, flattenBg: null, toJpeg: false }, opts || {});
  const perPage = o.layout === "4" ? 4 : o.layout === "2" ? 2 : 1;
  const cols = perPage === 4 ? 2 : perPage === 2 ? 2 : 1;
  const rows = perPage === 4 ? 2 : 1;
  setStatus(statusId, "Converting " + files.length + " image(s)…");
  try {
    const doc = new JsPDF({ unit: "pt", format: o.pageSize });
    const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
    const m = o.marginMm * 72 / 25.4;
    const cellW = (pageW - m * 2) / cols, cellH = (pageH - m * 2) / rows;
    let rotated = 0, stripped = 0;
    for (let i = 0; i < files.length; i++) {
      const slot = i % perPage;
      if (i > 0 && slot === 0) doc.addPage(o.pageSize);
      const col = slot % cols, row = Math.floor(slot / cols);
      const cellX = m + col * cellW, cellY = m + row * cellH;
      const isJpeg = /jpe?g/i.test(files[i].type || "") || /\.jpe?g$/i.test(files[i].name || "");
      let dataUrl = null, canvas = null, iw = 0, ih = 0;
      if (isJpeg && o.keepMeta && !o.autoRotate) {
        dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(files[i]);
        });
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
        iw = img.width; ih = img.height;
      } else {
        const buf = await readAsArrayBuffer(files[i]);
        const orientation = (isJpeg && o.autoRotate) ? readJpegOrientation(buf) : 1;
        const srcUrl = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(files[i]);
        });
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = srcUrl; });
        if (orientation !== 1) rotated++;
        canvas = orientedImageCanvas(img, orientation);
        iw = canvas.width; ih = canvas.height;
        if (isJpeg) stripped++;
      }
      // Grayscale and transparency flatten run on the oriented canvas, so
      // they apply to every image regardless of its EXIF rotation.
      if (canvas && (o.grayscale || (o.flattenBg && !isJpeg))) {
        const proc = document.createElement("canvas");
        proc.width = canvas.width; proc.height = canvas.height;
        const pctx = proc.getContext("2d");
        if (o.flattenBg) { pctx.fillStyle = o.flattenBg; pctx.fillRect(0, 0, proc.width, proc.height); }
        pctx.drawImage(canvas, 0, 0);
        if (o.grayscale) {
          try {
            const imgData = pctx.getImageData(0, 0, proc.width, proc.height);
            const dd = imgData.data;
            for (let p = 0; p < dd.length; p += 4) { const g = Math.round(0.299 * dd[p] + 0.587 * dd[p + 1] + 0.114 * dd[p + 2]); dd[p] = g; dd[p + 1] = g; dd[p + 2] = g; }
            pctx.putImageData(imgData, 0, 0);
          } catch (e) { /* grayscale is best-effort on odd canvases */ }
        }
        canvas = proc;
      }
      const outJpeg = isJpeg || !!o.toJpeg;
      // Print size at the chosen DPI, capped by the grid cell.
      let w = Math.min(cellW, iw * 72 / o.dpi), h = w * ih / iw;
      if (h > cellH) { h = cellH; w = h * iw / ih; }
      const x = cellX + (cellW - w) / 2, y = cellY + (cellH - h) / 2;
      if (o.fit === "fill") {
        // Cover-crop through a canvas to the cell aspect, then fill the cell.
        const crop = document.createElement("canvas");
        const targetRatio = cellW / cellH, srcRatio = iw / ih;
        let sw, sh, sx, sy;
        if (srcRatio > targetRatio) { sh = ih; sw = ih * targetRatio; sx = (iw - sw) / 2; sy = 0; }
        else { sw = iw; sh = iw / targetRatio; sx = 0; sy = (ih - sh) / 2; }
        crop.width = Math.round(sw); crop.height = Math.round(sh);
        if (canvas) crop.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
        else { const img2 = new Image(); await new Promise((res, rej) => { img2.onload = res; img2.onerror = rej; img2.src = dataUrl; }); crop.getContext("2d").drawImage(img2, sx, sy, sw, sh, 0, 0, crop.width, crop.height); }
        doc.addImage(crop.toDataURL("image/png"), "PNG", cellX, cellY, cellW, cellH);
      } else if (canvas) {
        doc.addImage(canvas.toDataURL(outJpeg ? "image/jpeg" : "image/png", o.quality), outJpeg ? "JPEG" : "PNG", x, y, w, h);
      } else {
        doc.addImage(dataUrl, "JPEG", x, y, w, h);
      }
    }
    doc.save(outName);
    setStatus(statusId, "Done. PDF downloaded (" + files.length + " image(s), " + perPage + " per page" + (rotated ? ", " + rotated + " rotated from EXIF" : "") + (stripped ? ", metadata stripped by re-encoding" : "") + ").");
  } catch (e) { if (!setPdfError(statusId, e)) setError(statusId, "Could not convert these images. Please try JPG or PNG files and try again."); }
}

async function loadPdfLibDoc(file, statusId) {
  if (!needLibrary(!!window.PDFLib, "pdf-lib", statusId)) return null;
  const bytes = await readAsArrayBuffer(file);
  return window.PDFLib.PDFDocument.load(bytes);
}
/* Parse "1-3, 5, 8-10" (or "all", or empty) into sorted 0-based page
   indices, validated against the real page count. Returns {pages} or
   {error}. Unlike parsePageSelection (remove-pages), keeping every page
   is allowed here. */

function parsePageList(input, count) {
  const text = String(input || "").trim().toLowerCase();
  if (!text || text === "all") {
    const pages = [];
    for (let i = 0; i < count; i++) pages.push(i);
    return { pages };
  }
  const keep = new Set();
  const tokens = text.split(",").map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return { error: "Please enter page ranges, for example 1-3, 5, 8-10." };
  for (const token of tokens) {
    if (token.includes("-")) {
      const parts = token.split("-").map((x) => x.trim());
      if (parts.length !== 2) return { error: "Invalid range: " + token + ". Use a range like 4-5." };
      const a = parseInt(parts[0], 10), b = parseInt(parts[1], 10);
      if (!a || !b || b < a || a < 1 || b > count) return { error: "Range " + token + " is outside 1 to " + count + "." };
      for (let i = a; i <= b; i++) keep.add(i - 1);
    } else {
      const n = parseInt(token, 10);
      if (!n || String(n) !== token || n < 1 || n > count) return { error: "Page " + token + " is outside 1 to " + count + "." };
      keep.add(n - 1);
    }
  }
  return { pages: [...keep].sort((a, b) => a - b) };
}
/* PDF outline (bookmarks) via pdf-lib's low-level API. pdf-lib has no
   high-level outline API, so this reads the catalog /Outlines tree
   directly. Returns [{title, pageIndex, children}] with 0-based page
   indices; pageIndex is -1 when the destination could not be resolved
   (for example a named destination outside the Names tree). */

function pdfOutlineTitleText(titleObj) {
  if (!titleObj) return "";
  try { if (typeof titleObj.decodeText === "function") return titleObj.decodeText(); } catch (e) {}
  try { return String(titleObj.asString ? titleObj.asString() : titleObj); } catch (e) { return ""; }
}

function pdfFindNamedDest(doc, node, name) {
  if (!node || typeof node.get !== "function") return null;
  const PL = window.PDFLib;
  const names = node.get(PL.PDFName.of("Names"));
  if (names instanceof PL.PDFArray) {
    for (let i = 0; i + 1 < names.size(); i += 2) {
      const n = names.get(i);
      const nm = n && typeof n.asString === "function" ? n.asString() : String(n);
      if (nm === name) return names.get(i + 1);
    }
  }
  const kids = node.get(PL.PDFName.of("Kids"));
  if (kids instanceof PL.PDFArray) {
    for (let i = 0; i < kids.size(); i++) {
      const found = pdfFindNamedDest(doc, doc.context.lookup(kids.get(i)), name);
      if (found) return found;
    }
  }
  return null;
}

function pdfDestPageRef(doc, dest) {
  if (!dest) return null;
  const PL = window.PDFLib;
  if (dest instanceof PL.PDFArray) {
    const first = dest.get(0);
    return first instanceof PL.PDFRef ? first : null;
  }
  if (dest instanceof PL.PDFName) {
    const names = doc.catalog.get(PL.PDFName.of("Names"));
    if (!names) return null;
    const namesDict = doc.context.lookup(names);
    if (!namesDict || typeof namesDict.get !== "function") return null;
    const dests = namesDict.get(PL.PDFName.of("Dests"));
    if (!dests) return null;
    const found = pdfFindNamedDest(doc, doc.context.lookup(dests), dest.asString());
    if (!found) return null;
    return pdfDestPageRef(doc, found);
  }
  return null;
}

function readPdfOutline(doc) {
  const out = [];
  try {
    const PL = window.PDFLib;
    const outlinesRef = doc.catalog.get(PL.PDFName.of("Outlines"));
    if (!outlinesRef) return out;
    const outlines = doc.context.lookup(outlinesRef);
    if (!outlines || typeof outlines.get !== "function") return out;
    const pageRefs = doc.getPages().map((p) => p.ref.toString());
    const walk = (itemRef, depth) => {
      if (depth > 10) return null;
      const item = doc.context.lookup(itemRef);
      if (!item || typeof item.get !== "function") return null;
      const title = pdfOutlineTitleText(item.get(PL.PDFName.of("Title")));
      let dest = item.get(PL.PDFName.of("Dest"));
      if (!dest) {
        const action = item.get(PL.PDFName.of("A"));
        if (action) {
          const aDict = action instanceof PL.PDFDict ? action : doc.context.lookup(action);
          if (aDict && typeof aDict.get === "function") dest = aDict.get(PL.PDFName.of("D"));
        }
      }
      const pageRef = pdfDestPageRef(doc, dest);
      const pageIndex = pageRef ? pageRefs.indexOf(pageRef.toString()) : -1;
      const node = { title, pageIndex, children: [] };
      const first = item.get(PL.PDFName.of("First"));
      if (first) {
        let cur = first;
        for (let guard = 0; guard < 500 && cur; guard++) {
          const child = walk(cur, depth + 1);
          if (child) node.children.push(child);
          const curDict = doc.context.lookup(cur);
          cur = curDict && typeof curDict.get === "function" ? curDict.get(PL.PDFName.of("Next")) : null;
        }
      }
      return node;
    };
    const first = outlines.get(PL.PDFName.of("First"));
    let cur = first;
    for (let guard = 0; guard < 500 && cur; guard++) {
      const node = walk(cur, 0);
      if (node) out.push(node);
      const curDict = doc.context.lookup(cur);
      cur = curDict && typeof curDict.get === "function" ? curDict.get(PL.PDFName.of("Next")) : null;
    }
  } catch (e) { /* an unreadable outline is not a fatal error; callers skip it */ }
  return out;
}

function pdfTitleHex(text) {
  let hex = "FEFF";
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, "0");
  return window.PDFLib.PDFHexString.of(hex);
}
/* Build a bookmark outline in doc from [{title, pageRef, children}].
   pageRef must be a page reference in this document. Returns false when
   the tree is empty. Titles are stored as UTF-16BE so Urdu and other
   non-Latin titles survive. */

function buildPdfOutline(doc, tree) {
  const PL = window.PDFLib;
  const ctx = doc.context;
  const buildItems = (nodes, parentRef) => {
    let firstRef = null, prevRef = null, count = 0;
    for (const node of nodes) {
      const dict = PL.PDFDict.withContext(ctx);
      dict.set(PL.PDFName.of("Title"), pdfTitleHex(node.title || "Untitled"));
      dict.set(PL.PDFName.of("Parent"), parentRef);
      dict.set(PL.PDFName.of("Dest"), ctx.obj([node.pageRef, PL.PDFName.of("Fit")]));
      const ref = ctx.register(dict);
      if (!firstRef) firstRef = ref;
      if (prevRef) {
        const prevDict = ctx.lookup(prevRef);
        prevDict.set(PL.PDFName.of("Next"), ref);
        dict.set(PL.PDFName.of("Prev"), prevRef);
      }
      prevRef = ref;
      count++;
      if (node.children && node.children.length) {
        const sub = buildItems(node.children, ref);
        dict.set(PL.PDFName.of("First"), sub.firstRef);
        dict.set(PL.PDFName.of("Last"), sub.lastRef);
        dict.set(PL.PDFName.of("Count"), PL.PDFNumber.of(sub.count));
        count += sub.count;
      }
    }
    return { firstRef, lastRef: prevRef, count };
  };
  const root = PL.PDFDict.withContext(ctx);
  const rootRef = ctx.register(root);
  const top = buildItems(tree, rootRef);
  if (!top.firstRef) return false;
  root.set(PL.PDFName.of("Type"), PL.PDFName.of("Outlines"));
  root.set(PL.PDFName.of("First"), top.firstRef);
  root.set(PL.PDFName.of("Last"), top.lastRef);
  root.set(PL.PDFName.of("Count"), PL.PDFNumber.of(top.count));
  doc.catalog.set(PL.PDFName.of("Outlines"), rootRef);
  doc.catalog.set(PL.PDFName.of("PageMode"), PL.PDFName.of("UseOutlines"));
  return true;
}
/* Merge entries keep per-file choices: {file, ranges, rotate}. Ranges are
   typed in the thumbnail (empty = all pages); rotate is 0/90/180/270. */
let mergeOrder = [];

function splitPartName(title, i) {
  const slug = String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return String(i + 1).padStart(2, "0") + "-" + (slug || ("part-" + (i + 1))) + ".pdf";
}

let rotAngles = []; /* per-page angle (0/90/180/270), filled when the picker renders */
let rotPdf = null; /* pdf.js document for the picked file */
/* Score a candidate deskew angle: rotate the dark pixels by the angle and
   measure how strongly they line up into horizontal rows (sum of squared
   row counts). Pure, unit-testable. */

/* ---------- Rotate PDF: per-page picker, OSD auto-rotate, deskew ---------- */

function deskewBestAngle(dark, w, h) {
  if (!dark || !dark.length || w < 4 || h < 4) return 0;
  const cx = w / 2, cy = h / 2;
  let bestAngle = 0, bestScore = -1;
  for (let deg = -6; deg <= 6; deg += 0.5) {
    const rad = deg * Math.PI / 180, sin = Math.sin(rad), cos = Math.cos(rad);
    const rows = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!dark[y * w + x]) continue;
        const ry = Math.round((x - cx) * sin + (y - cy) * cos + cy);
        if (ry >= 0 && ry < h) rows[ry]++;
      }
    }
    let score = 0;
    for (let i = 0; i < h; i++) score += rows[i] * rows[i];
    if (score > bestScore) { bestScore = score; bestAngle = deg; }
  }
  return bestAngle;
}
/* Extra rotate controls, built once and placed before the Rotate button. */
const rotExtraWrap = document.createElement("div");
rotExtraWrap.innerHTML = '<div id="rotPicker" class="thumb-list" aria-label="Pages, pick an angle for each"></div>'
  + '<button id="rotAutoBtn" type="button" class="btn-secondary">Auto-rotate by text direction</button> '
  + '<button id="rotDeskewBtn" type="button" class="btn-secondary">Straighten a tilted scan</button>';

function romanNumeral(n) {
  if (!n || n < 1 || n > 3999) return String(n);
  const table = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let out = "";
  for (const [v, s] of table) { while (n >= v) { out += s; n -= v; } }
  return out;
}

function sizeChangeNote(oldSize, newSize) {
  const pct = Math.round((1 - newSize / oldSize) * 100);
  if (pct >= 0) return pct + "% smaller";
  return (-pct) + "% larger — this file was already small, so there was little left to save";
}

function jpegBytesToCanvas(bytes) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function downscaleCanvas(canvas, maxPx) {
  if (canvas.width <= maxPx) return canvas;
  const scale = maxPx / canvas.width;
  const c = document.createElement("canvas");
  c.width = maxPx; c.height = Math.max(1, Math.round(canvas.height * scale));
  c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
  return c;
}

function inflateBytes(bytes) {
  return new Promise((resolve) => {
    try {
      const ds = new DecompressionStream("deflate");
      const src = new Blob([bytes]).stream().pipeThrough(ds);
      new Response(src).arrayBuffer().then((b) => resolve(new Uint8Array(b))).catch(() => resolve(null));
    } catch (e) { resolve(null); }
  });
}

async function reencodePdfPhoto(bytes, filterName, dict, iw, ih, maxPx, quality) {
  const L = window.PDFLib;
  let canvas = null;
  if (filterName === "DCTDecode") {
    canvas = await jpegBytesToCanvas(bytes);
  } else {
    /* FlateDecode: only plain 8-bit samples with no PNG predictor. */
    const bpcObj = dict.get(L.PDFName.of("BitsPerComponent"));
    if (!bpcObj || bpcObj.asNumber() !== 8) return null;
    const csObj = dict.get(L.PDFName.of("ColorSpace"));
    const cs = csObj && csObj.decodeText ? csObj.decodeText() : "";
    if (cs !== "DeviceRGB" && cs !== "DeviceGray") return null;
    const parms = dict.get(L.PDFName.of("DecodeParms"));
    const pred = parms && parms.get ? parms.get(L.PDFName.of("Predictor")) : null;
    if (pred && pred.asNumber() !== 1) return null;
    const raw = await inflateBytes(bytes);
    if (!raw) return null;
    const channels = cs === "DeviceRGB" ? 3 : 1;
    if (raw.length < iw * ih * channels) return null;
    canvas = document.createElement("canvas");
    canvas.width = iw; canvas.height = ih;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(iw, ih);
    for (let p = 0; p < iw * ih; p++) {
      if (channels === 3) { img.data[p * 4] = raw[p * 3]; img.data[p * 4 + 1] = raw[p * 3 + 1]; img.data[p * 4 + 2] = raw[p * 3 + 2]; }
      else { img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = raw[p]; }
      img.data[p * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  if (!canvas) return null;
  canvas = downscaleCanvas(canvas, maxPx);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

async function downsamplePdfImages(doc, targetDpi, quality, statusId) {
  const L = window.PDFLib;
  const stats = { images: 0, downsampled: 0, skipped: 0 };
  const pages = doc.getPages();
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    setStatus(statusId, "Checking images on page " + (pi + 1) + " of " + pages.length + "...");
    let xobj = null;
    try {
      const res = page.node.Resources();
      if (res) xobj = res.lookup(L.PDFName.of("XObject"));
    } catch (e) { continue; }
    if (!xobj || !xobj.keys) continue;
    /* Target width in pixels: target DPI times the page width in inches.
       An image drawn smaller than the full page is kept larger than it
       needs to be, which is safe — it is never over-compressed. */
    const maxPx = Math.max(200, Math.round(targetDpi * (page.getWidth() / 72)));
    for (const key of xobj.keys()) {
      let ref = null, dict = null;
      try {
        ref = xobj.get(key);
        if (!(ref instanceof L.PDFRef)) continue;
        dict = doc.context.lookup(ref);
      } catch (e) { continue; }
      if (!dict || !dict.get) continue;
      if (dict.get(L.PDFName.of("Subtype")) !== L.PDFName.of("Image")) continue;
      stats.images++;
      try {
        const wObj = dict.get(L.PDFName.of("Width"));
        const hObj = dict.get(L.PDFName.of("Height"));
        const iw = wObj ? wObj.asNumber() : 0;
        const ih = hObj ? hObj.asNumber() : 0;
        if (!iw || !ih || iw <= maxPx) continue;
        /* A photo with a transparency mask is left alone: re-encoding it
           as plain JPEG would drop the mask and change how it looks. */
        if (dict.get(L.PDFName.of("SMask")) || dict.get(L.PDFName.of("Mask"))) { stats.skipped++; continue; }
        const filterObj = dict.get(L.PDFName.of("Filter"));
        const filterName = filterObj && filterObj.decodeText ? filterObj.decodeText() : "";
        if (filterName !== "DCTDecode" && filterName !== "FlateDecode") { stats.skipped++; continue; }
        const stream = doc.context.lookup(ref);
        const bytes = stream && stream.getContents ? stream.getContents() : null;
        if (!bytes || !bytes.length) { stats.skipped++; continue; }
        const newJpeg = await reencodePdfPhoto(bytes, filterName, dict, iw, ih, maxPx, quality);
        if (!newJpeg) { stats.skipped++; continue; }
        const newW = maxPx, newH = Math.max(1, Math.round(ih * (maxPx / iw)));
        const nd = L.PDFDict.withContext(doc.context);
        nd.set(L.PDFName.of("Type"), L.PDFName.of("XObject"));
        nd.set(L.PDFName.of("Subtype"), L.PDFName.of("Image"));
        nd.set(L.PDFName.of("Width"), L.PDFNumber.of(newW));
        nd.set(L.PDFName.of("Height"), L.PDFNumber.of(newH));
        nd.set(L.PDFName.of("BitsPerComponent"), L.PDFNumber.of(8));
        nd.set(L.PDFName.of("ColorSpace"), L.PDFName.of("DeviceRGB"));
        nd.set(L.PDFName.of("Filter"), L.PDFName.of("DCTDecode"));
        doc.context.assign(ref, L.PDFRawStream.of(nd, newJpeg));
        stats.downsampled++;
      } catch (e) { stats.skipped++; }
    }
  }
  return stats;
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

/* Compact [1,2,3,5] to "1-3, 5" for the page list box. */

/* ---------- Remove Pages: visual picker, blank-page and text search ---------- */

function countInkPixels(imageData) {
  const d = imageData.data || [];
  let ink = 0;
  for (let i = 0; i + 3 < d.length; i += 4) {
    if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) ink++;
  }
  return ink;
}
let removePagesPdf = null; /* pdf.js document, kept while the picker is shown */
let removePagesSelected = new Set(); /* 1-based page numbers */

async function extractPdfLayout(file, statusId) {
  if (!(await ensurePdfJs(statusId))) return null;
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => (it.str || "").trim()).map((it) => ({
      str: it.str, x: it.transform[4], y: it.transform[5],
      w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 12, transform: it.transform,
      font: it.fontName || ""
    }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      let line = lines.find((l) => Math.abs(l.y - it.y) < 3);
      if (!line) { line = { y: it.y, items: [] }; lines.push(line); }
      line.items.push(it);
    }
    lines.forEach((l) => { l.items.sort((a, b) => a.x - b.x); l.text = l.items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim(); });
    const kept = lines.filter((l) => l.text);
    /* Heading flag: a short line set in a clearly larger size than the
       page's usual text. */
    const heights = items.map((it) => it.h).sort((a, b) => a - b);
    const medH = heights.length ? heights[Math.floor(heights.length / 2)] : 12;
    kept.forEach((l) => {
      const maxH = Math.max.apply(null, l.items.map((it) => it.h));
      l.heading = maxH >= medH * 1.3 && l.text.length <= 120;
    });
    /* Column break: a vertical gap wider than 40pt that appears at nearly
       the same x on at least half of the multi-item lines. */
    let splitX = null;
    const breaks = [];
    kept.forEach((l) => {
      for (let k = 1; k < l.items.length; k++) {
        const gap = l.items[k].x - (l.items[k - 1].x + l.items[k - 1].w);
        if (gap > 40) breaks.push((l.items[k - 1].x + l.items[k - 1].w + l.items[k].x) / 2);
      }
    });
    if (breaks.length) {
      breaks.sort((a, b) => a - b);
      let best = null, bestCount = 0, run = [breaks[0]];
      for (let k = 1; k <= breaks.length; k++) {
        if (k < breaks.length && breaks[k] - breaks[k - 1] <= 10) { run.push(breaks[k]); continue; }
        if (run.length > bestCount) { bestCount = run.length; best = run; }
        run = k < breaks.length ? [breaks[k]] : [];
      }
      const multiLines = kept.filter((l) => l.items.length > 1).length;
      if (best && bestCount >= Math.max(2, Math.ceil(multiLines / 2))) splitX = best.reduce((s, v) => s + v, 0) / best.length;
    }
    /* Split a line that straddles the column gutter at a wide gap, so the
       left-column words and the right-column words read as separate lines.
       A heading or a line with no wide gap across the gutter stays whole. */
    if (splitX !== null) {
      const split = [];
      kept.forEach((l) => {
        let cut = -1;
        if (!l.heading) {
          for (let k = 1; k < l.items.length; k++) {
            const gap = l.items[k].x - (l.items[k - 1].x + l.items[k - 1].w);
            if (gap > 40 && l.items[k - 1].x + l.items[k - 1].w <= splitX && l.items[k].x >= splitX) { cut = k; break; }
          }
        }
        if (cut === -1) { split.push(l); return; }
        const mk = (items) => ({ y: l.y, items, text: items.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim(), heading: false });
        split.push(mk(l.items.slice(0, cut)), mk(l.items.slice(cut)));
      });
      kept.length = 0;
      kept.push.apply(kept, split);
    }
    kept.forEach((l) => { l.col = splitX === null ? 0 : (l.items[0].x < splitX ? 0 : 1); });
    kept.sort((a, b) => (a.col - b.col) || (b.y - a.y));
    pages.push({ page: i, lines: kept, columns: splitX === null ? 1 : 2 });
  }
  return pages;
}
/* Group pdf.js text items into lines by y-coordinate (within 3pt) and sort
   each line by x, so paragraphs and simple tables keep their shape instead
   of collapsing into one long string. Returns [{page, lines:[{y, text, items}]}].
   Lines come back in layout order: on a two-column page the left column
   reads first, then the right column. */

async function extractPdfLines(file, statusId) {
  const layout = await extractPdfLayout(file, statusId);
  if (!layout) return null;
  return layout.map((pg) => ({ page: pg.page, lines: pg.lines.map((l) => ({ y: l.y, text: l.text, items: l.items })) }));
}
/* Quote one cell for CSV output: wrap in quotes when it holds a comma, a
   quote or a line break, and double any quotes inside. */

function csvCell(s) {
  const t = String(s == null ? "" : s);
  return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
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

async function renderPdfPagesToImages(file, format, statusId, outputEl, opts) {
  const o = Object.assign({ dpi: 108, format: null, grayscale: false, transparent: false, pages: "all", quality: 0.92, maxWidth: 0, namePattern: "" }, opts || {});
  const fmt = String(o.format || format || "png").toLowerCase();
  const ext = fmt === "jpg" || fmt === "jpeg" ? "jpg" : fmt === "webp" ? "webp" : "png";
  const mime = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  const label = ext.toUpperCase();
  // File name for one page: the pattern may contain {nn} (zero-padded
  // page number, 01, 02), {n} (plain number, 1, 2) or {page} (older
  // spelling, same as {nn}). Without a placeholder the number is
  // appended; without a pattern the old ak-premium-page-N name is used.
  const pageName = (pageNum, total) => {
    const pad = String(Math.max(total, 10)).length;
    const num = String(pageNum).padStart(pad, "0");
    const pat = String(o.namePattern || "").trim();
    if (!pat) return "ak-premium-page-" + pageNum + "." + ext;
    // {nn} first: "{n}" is a substring of "{nn}" and would mangle it.
    const named = pat.split("{nn}").join(num).split("{n}").join(String(pageNum)).split("{page}").join(num);
    if (named !== pat) return named.replace(/[^A-Za-z0-9._-]+/g, "-");
    const dot = pat.lastIndexOf(".");
    const base = dot > 0 ? pat.slice(0, dot) : pat;
    return (base + "-" + num + "." + ext).replace(/[^A-Za-z0-9._-]+/g, "-");
  };
  if (!(await ensurePdfJs(statusId))) return;
  try {
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    let pages;
    if (!o.pages || String(o.pages).trim().toLowerCase() === "all" || !String(o.pages).trim()) pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    else {
      const parsed = parsePageList(String(o.pages), pdf.numPages);
      if (parsed.error) { setError(statusId, parsed.error); return; }
      pages = parsed.pages.map((p) => p + 1);
    }
    outputEl.innerHTML = "";
    const blobs = [];
    const scale = Math.min(300, Math.max(72, o.dpi || 108)) / 72;
    for (const i of pages) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
      const renderOpts = { canvasContext: canvas.getContext("2d"), viewport };
      if (o.transparent && ext === "png") renderOpts.background = "rgba(0,0,0,0)";
      await page.render(renderOpts).promise;
      if (o.grayscale) {
        try {
          const ctx = canvas.getContext("2d");
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = img.data;
          for (let p = 0; p < d.length; p += 4) { const g = Math.round(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]); d[p] = g; d[p + 1] = g; d[p + 2] = g; }
          ctx.putImageData(img, 0, 0);
        } catch (e) { /* grayscale is best-effort on odd canvases; the colour image still downloads */ }
      }
      let outCanvas = canvas;
      if (o.maxWidth && canvas.width > o.maxWidth) {
        // Resize-to-width preset for web use: scale the rendered page down,
        // keeping its shape. Never upscales a smaller page.
        const small = document.createElement("canvas");
        small.width = o.maxWidth; small.height = Math.max(1, Math.round(canvas.height * o.maxWidth / canvas.width));
        small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
        outCanvas = small;
      }
      const blob = await new Promise((res) => outCanvas.toBlob(res, mime, (ext === "jpg" || ext === "webp") ? (o.quality || 0.92) : undefined));
      if (!blob) continue;
      blobs.push({ name: pageName(i, pages.length), blob });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = pageName(i, pages.length); a.textContent = "Download page " + i + " " + label;
      outputEl.appendChild(a); outputEl.appendChild(document.createElement("br"));
    }
    if (blobs.length === 1) {
      setStatus(statusId, "Done. One " + label + " image link is above (single page, no ZIP needed)" + (o.grayscale ? ", grayscale applied" : "") + (o.transparent && ext === "png" ? ", transparent background" : "") + ".");
    } else if (window.JSZip && blobs.length) {
      const zip = new window.JSZip();
      blobs.forEach((b) => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "ak-premium-pages.zip");
      setStatus(statusId, "Done. " + blobs.length + " " + label + " links are above (" + (o.dpi || 108) + " DPI" + (o.grayscale ? ", grayscale" : "") + (o.transparent && ext === "png" ? ", transparent background" : "") + "); ZIP download also started.");
    } else {
      setStatus(statusId, "Done. " + label + " links are above. ZIP needs JSZip, which did not load.");
    }
  } catch (e) { if (!setPdfError(statusId, e)) setError(statusId, "Could not render this PDF to images. Please check the file."); }
}

/* ---------- e-Sign canvas ---------- */

async function digitallySignPdf(file, p12File, password, statusId) {
  const forge = window.forge;
  if (!forge) {
    setError(statusId, "The signing library did not load. Check your connection and try again.");
    return null;
  }
  let key, cert;
  try {
    const buf = forge.util.createBuffer(new Uint8Array(await p12File.arrayBuffer()));
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(buf), password || "");
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (!keyBags.length || !keyBags[0].key) throw new Error("No private key was found in this .p12 file.");
    if (!certBags.length || !certBags[0].cert) throw new Error("No certificate was found in this .p12 file.");
    key = keyBags[0].key; cert = certBags[0].cert;
  } catch (e) {
    if (e.message && /key|certificate/.test(e.message)) throw e;
    throw new Error("Could not read this .p12 file. Check the password and that the file is a PKCS#12 certificate.");
  }
  const doc = await loadPdfLibDoc(file, statusId);
  if (!doc) return null;
  const L = window.PDFLib;
  const numArray = (nums) => { const arr = L.PDFArray.withContext(doc.context); nums.forEach((n) => arr.push(L.PDFNumber.of(n))); return arr; };
  const refArray = (refs) => { const arr = L.PDFArray.withContext(doc.context); refs.forEach((r) => arr.push(r)); return arr; };
  const sigDict = L.PDFDict.withContext(doc.context);
  sigDict.set(L.PDFName.of("Type"), L.PDFName.of("Sig"));
  sigDict.set(L.PDFName.of("Filter"), L.PDFName.of("Adobe.PPKLite"));
  sigDict.set(L.PDFName.of("SubFilter"), L.PDFName.of("adbe.pkcs7.detached"));
  sigDict.set(L.PDFName.of("ByteRange"), numArray([0, 0, 0, 0]));
  sigDict.set(L.PDFName.of("Contents"), L.PDFHexString.of("A".repeat(ESIGN_SIG_PLACEHOLDER_HEX)));
  const sigRef = doc.context.register(sigDict);
  const widgetDict = L.PDFDict.withContext(doc.context);
  widgetDict.set(L.PDFName.of("Type"), L.PDFName.of("Annot"));
  widgetDict.set(L.PDFName.of("Subtype"), L.PDFName.of("Widget"));
  widgetDict.set(L.PDFName.of("FT"), L.PDFName.of("Sig"));
  widgetDict.set(L.PDFName.of("T"), L.PDFString.of("Signature1"));
  widgetDict.set(L.PDFName.of("Rect"), numArray([0, 0, 0, 0]));
  widgetDict.set(L.PDFName.of("V"), sigRef);
  widgetDict.set(L.PDFName.of("F"), L.PDFNumber.of(4));
  const widgetRef = doc.context.register(widgetDict);
  const acroForm = L.PDFDict.withContext(doc.context);
  acroForm.set(L.PDFName.of("Fields"), refArray([widgetRef]));
  acroForm.set(L.PDFName.of("SigFlags"), L.PDFNumber.of(3));
  doc.catalog.set(L.PDFName.of("AcroForm"), doc.context.register(acroForm));
  const pages = doc.getPages();
  if (!pages.length) throw new Error("This PDF has no pages.");
  const existingAnnots = pages[0].node.Annots();
  if (existingAnnots) existingAnnots.push(widgetRef);
  else pages[0].node.set(L.PDFName.of("Annots"), refArray([widgetRef]));
  let bytes = new Uint8Array(await doc.save({ useObjectStreams: false }));
  const toStr = (b) => { let s = ""; const chunk = 8192; for (let i = 0; i < b.length; i += chunk) s += String.fromCharCode.apply(null, b.subarray(i, i + chunk)); return s; };
  const fromStr = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; return b; };
  let s = toStr(bytes);
  const brShort = "/ByteRange [ 0 0 0 0 ]";
  const brWide = "/ByteRange [ 0 0000000000 0000000000 0000000000 ]";
  const brIdx = s.indexOf(brShort);
  if (brIdx === -1) throw new Error("Could not prepare the signature field. Please try a different PDF.");
  s = s.slice(0, brIdx) + brWide + s.slice(brIdx + brShort.length);
  bytes = fromStr(s);
  s = toStr(bytes);
  const hexRun = "A".repeat(ESIGN_SIG_PLACEHOLDER_HEX);
  const cIdx = s.indexOf("<" + hexRun + ">");
  if (cIdx === -1) throw new Error("Could not prepare the signature field. Please try a different PDF.");
  const contentsStart = cIdx;
  const contentsEnd = cIdx + hexRun.length + 2;
  const brFinal = "/ByteRange [ 0 " + String(contentsStart).padStart(10, "0") + " " + String(contentsEnd).padStart(10, "0") + " " + String(bytes.length - contentsEnd).padStart(10, "0") + " ]";
  const brWideRe = /\/ByteRange \[ 0 0000000000 0000000000 0000000000 \]/;
  if (!brWideRe.test(s)) throw new Error("Could not prepare the signature field. Please try a different PDF.");
  s = s.replace(brWideRe, brFinal);
  bytes = fromStr(s);
  const signed = new Uint8Array(contentsStart + (bytes.length - contentsEnd));
  signed.set(bytes.subarray(0, contentsStart), 0);
  signed.set(bytes.subarray(contentsEnd), contentsStart);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(signed);
  p7.addCertificate(cert);
  p7.addSigner({ key, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: new Date() }] });
  p7.sign({ detached: true });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  if (der.length * 2 > ESIGN_SIG_PLACEHOLDER_HEX) throw new Error("This certificate's signature is too large for the signature field. Try a certificate with a shorter chain.");
  const derHex = forge.util.bytesToHex(der).toUpperCase();
  const padded = (derHex + "0".repeat(ESIGN_SIG_PLACEHOLDER_HEX)).slice(0, ESIGN_SIG_PLACEHOLDER_HEX);
  s = toStr(bytes);
  const cIdx2 = s.indexOf("<" + hexRun + ">");
  if (cIdx2 === -1) throw new Error("Could not finish the signature. Please try again.");
  s = s.slice(0, cIdx2 + 1) + padded + s.slice(cIdx2 + 1 + hexRun.length);
  return fromStr(s);
}

/* Stamp the drawn or typed signature onto chosen pages of a PDF, at a
   chosen spot, with pdf-lib. This is a picture of the signature, not a
   certificate-based digital signature. */

/* PDF to Excel (advanced): real tables from the pdf.js x/y grid, not word
   gaps. Rows are clustered by baseline, columns by shared left edges, and
   a cell that spans several columns becomes a merged cell in Excel.
   Numbers, dates and currency are stored as real Excel types. A page
   with several tables becomes one sheet per table, and the user picks
   which tables to download. Scanned PDFs use an OCR fallback (Tesseract
   word boxes run through the same grid logic). */

/* ---------- Converters ---------- */

function extractPdfTableItems(file, statusId) {
  return (async () => {
    if (!(await ensurePdfJs(statusId))) return null;
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.filter((it) => (it.str || "").trim()).map((it) => ({
        str: it.str, x: it.transform[4], y: it.transform[5],
        w: it.width || 0, h: it.height || Math.abs(it.transform[3]) || 12
      }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      pages.push({ page: i, width: vp.width, height: vp.height, items });
    }
    return pages;
  })();
}

async function ocrPdfWords(file, statusId, onProgress) {
  /* OCR fallback: same item shape as extractPdfTableItems, from Tesseract
     word boxes (image pixels at scale 2, converted to PDF points). */
  if (!(await ensurePdfJs(statusId))) return null;
  if (!window.Tesseract) { const ok = await loadLibrary("tesseract", statusId); if (!ok) return null; }
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const res = await window.Tesseract.recognize(canvas, "eng", { logger: (m) => { if (onProgress && m.status === "recognizing text") onProgress((i - 1 + (m.progress || 0)) / pdf.numPages); } });
    const items = (res.data.words || []).filter((w) => (w.text || "").trim()).map((w) => ({
      str: w.text, x: w.bbox.x0 / 2, y: vp.height - w.bbox.y1 / 2,
      w: (w.bbox.x1 - w.bbox.x0) / 2, h: (w.bbox.y1 - w.bbox.y0) / 2
    }));
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    pages.push({ page: i, width: vp.width, height: vp.height, items });
    if (onProgress) onProgress(i / pdf.numPages);
  }
  return pages;
}

function clusterPdfRows(items) {
  const rows = [];
  for (const it of items) {
    let row = rows.find((r) => Math.abs(r.y - it.y) < 3);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  rows.forEach((r) => { r.items.sort((a, b) => a.x - b.x); r.y = r.items.reduce((s, i) => s + i.y, 0) / r.items.length; });
  rows.sort((a, b) => b.y - a.y);
  return rows;
}

function detectPdfTables(pages) {
  const tables = [];
  for (const pg of pages) {
    if (!pg.items.length) continue;
    const rows = clusterPdfRows(pg.items);
    /* Column edges: cluster every item's left edge (within 4pt). */
    const starts = [];
    rows.forEach((r) => r.items.forEach((it) => starts.push(it.x)));
    starts.sort((a, b) => a - b);
    const edges = [];
    for (const x of starts) {
      if (!edges.length || x - edges[edges.length - 1] > 4) edges.push(x);
      else edges[edges.length - 1] = (edges[edges.length - 1] + x) / 2;
    }
    /* Split rows into blocks where the vertical gap is large. */
    const heights = rows.map((r) => Math.max.apply(null, r.items.map((i) => i.h)));
    const medH = heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)] || 12;
    const blocks = [[]];
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && (rows[i - 1].y - rows[i].y) > Math.max(24, 3 * medH)) blocks.push([]);
      blocks[blocks.length - 1].push(rows[i]);
    }
    for (const block of blocks) {
      if (block.length < 2) continue;
      const grid = [], merges = [];
      let maxCols = 0;
      for (const row of block) {
        const cells = new Array(edges.length).fill(null);
        let colsUsed = 0;
        for (const it of row.items) {
          let ci = 0;
          for (let e = 0; e < edges.length; e++) { if (it.x + 2 >= edges[e]) ci = e; }
          let span = 1;
          while (ci + span < edges.length && it.x + it.w > edges[ci + span] + 4) span++;
          const text = (cells[ci] ? cells[ci].text + " " : "") + it.str;
          if (cells[ci]) { cells[ci].text = text; }
          else { cells[ci] = { text, span }; colsUsed += span; }
          if (span > 1) merges.push({ row: grid.length, col: ci, span });
        }
        const trimmed = cells.slice(0, Math.max.apply(null, cells.map((c, i) => c ? i + 1 : 0)));
        grid.push(trimmed);
        maxCols = Math.max(maxCols, trimmed.length);
      }
      if (maxCols < 2) continue;
      tables.push({ page: pg.page, rows: grid, merges, cols: maxCols, rowYs: block.map((r) => r.y) });
    }
  }
  return tables;
}

function excelCellValue(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  /* Dates: 12/03/2026, 12-03-2026, 12 Mar 2026 (day first, as in Pakistan). */
  let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = parseInt(m[3], 10) + (m[3].length === 2 ? 2000 : 0);
    const d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (!isNaN(d.getTime()) && d.getDate() === parseInt(m[1], 10)) return { t: "d", v: d, z: "dd/mm/yyyy" };
  }
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  m = t.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m && months[m[2].slice(0, 3).toLowerCase()] !== undefined) {
    const d = new Date(parseInt(m[3], 10), months[m[2].slice(0, 3).toLowerCase()], parseInt(m[1], 10));
    if (!isNaN(d.getTime())) return { t: "d", v: d, z: "dd/mm/yyyy" };
  }
  /* Numbers: strip currency words/symbols, commas; (1,234) is negative;
     12.5% becomes 0.125 with a percent format. */
  let num = t.replace(/^(rs\.?|pkr|usd|\$|€|£)\s*/i, "").replace(/,/g, "").trim();
  let pct = false;
  if (/%$/.test(num)) { pct = true; num = num.slice(0, -1); }
  let neg = false;
  if (/^\(.*\)$/.test(num)) { neg = true; num = num.slice(1, -1); }
  if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(num)) {
    let v = parseFloat(num);
    if (neg) v = -v;
    if (pct) return { t: "n", v: v / 100, z: "0.00%" };
    return { t: "n", v, z: Math.abs(v % 1) > 0 ? "#,##0.00" : "#,##0" };
  }
  return t;
}
let pdfExcelDetected = null;

function median() {
  const vals = Array.prototype.slice.call(arguments).sort((a, b) => a - b);
  if (!vals.length) return 0;
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}
/* One layout line → heading level (0 = body) plus styled runs, from the
   pdf.js font data (size for the level, font name for bold/italic). */

function textToPdf(raw, statusId, outName) {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", statusId)) return;
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const doc = new JsPDF();
  doc.setFontSize(12);
  addWrappedTextPaginated(doc, clean);
  doc.save(outName);
  setStatus(statusId, "Done. PDF downloaded.");
}

/* Header + footer for the CURRENT page of a txt-html-to-pdf document
   (header at the top, footer with page number at the bottom). */

function drawRichTextRuns(doc, runs, opts) {
  const o = Object.assign({ x: 15, y: 20, maxWidth: 170, size: 12, lineHeight: 7, pageH: 297, bottomMargin: 20, topMargin: 20, align: "left", onPage: null }, opts || {});
  let y = o.y;
  const hexRgb = (hex) => {
    const h = String(hex || "").replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const setRunFont = (r) => {
    doc.setFont("helvetica", ((r.bold ? "bold" : "") + (r.italic ? "italic" : "")) || "normal");
    doc.setFontSize(r.size || o.size);
    const rgb = r.color ? hexRgb(r.color) : null;
    doc.setTextColor.apply(doc, rgb || [0, 0, 0]);
  };
  const words = [];
  (runs || []).forEach((r) => {
    String(r.text || "").split(/(\s+)/).forEach((part) => {
      if (part) words.push({ text: part, bold: !!r.bold, italic: !!r.italic, size: r.size || o.size, color: r.color || null, space: /^\s+$/.test(part) });
    });
  });
  let line = [], lineW = 0;
  const drawLine = () => {
    if (y > o.pageH - o.bottomMargin) { doc.addPage(); y = o.topMargin; if (o.onPage) o.onPage(doc); }
    let x = o.x;
    if (o.align === "center") x = o.x + (o.maxWidth - lineW) / 2;
    else if (o.align === "right") x = o.x + (o.maxWidth - lineW);
    line.forEach((w) => { setRunFont(w); doc.text(w.text, x, y); x += doc.getTextWidth(w.text); });
    line = []; lineW = 0;
    y += o.lineHeight;
  };
  for (const w of words) {
    if (w.space && !line.length) continue;
    setRunFont(w);
    let text = w.text;
    if (!w.space && doc.getTextWidth(text) > o.maxWidth) {
      // one very long word: split it into chunks that fit the line
      while (text.length) {
        let n = text.length;
        while (n > 1 && doc.getTextWidth(text.slice(0, n)) > o.maxWidth) n--;
        const chunk = text.slice(0, n);
        if (lineW + doc.getTextWidth(chunk) > o.maxWidth && line.length) drawLine();
        line.push({ text: chunk, bold: w.bold, italic: w.italic, size: w.size, color: w.color }); lineW += doc.getTextWidth(chunk);
        text = text.slice(n);
      }
      continue;
    }
    if (lineW + doc.getTextWidth(text) > o.maxWidth && line.length) drawLine();
    line.push(w); lineW += doc.getTextWidth(text);
  }
  if (line.length) drawLine();
  doc.setTextColor(0, 0, 0);
  return y;
}

/* mammoth HTML → layout blocks: {type: "h1"|"h2"|"h3"|"p"|"ul"|"ol"|
   "table"|"img"|"hr", runs|items|rows|src}. Inline bold/italic come from
   the HTML tags, so headings, lists, tables and emphasis survive. */

/* Convert one pdf.js image object (from page.objs) to a PNG blob.
   Handles the three pdf.js image kinds and ImageBitmap objects.
   Returns null when the image format cannot be handled. Takes no
   element ids, so it splits to core.js. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

async function pdfImageToBlob(img) {
  if (!img || !img.width || !img.height) return null;
  const w = img.width, h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
  } else if (img.kind === 3 && img.data) { /* RGBA_32BPP: 4 bytes per pixel */
    const buf = new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, w * h * 4);
    ctx.putImageData(new ImageData(buf, w, h), 0, 0);
  } else if (img.kind === 2 && img.data) { /* RGB_24BPP: 3 bytes per pixel */
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = img.data[i * 3];
      rgba[i * 4 + 1] = img.data[i * 3 + 1];
      rgba[i * 4 + 2] = img.data[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
    ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
  } else if (img.kind === 1 && img.data) { /* GRAYSCALE_1BPP: 1 bit per pixel, bit 1 is white */
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const byte = img.data[i >> 3];
      const bit = (byte >> (7 - (i & 7))) & 1;
      const v = bit ? 255 : 0;
      rgba[i * 4] = v; rgba[i * 4 + 1] = v; rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255;
    }
    ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
  } else {
    return null;
  }
  return new Promise((res) => canvas.toBlob(res, "image/png"));
}

/* Fetch one embedded image object from a page, with a timeout so a
   missing object cannot hang the extraction. */

function getPdfImageObj(page, name) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 10000);
    try {
      page.objs.get(name, (img) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(img || null);
      });
    } catch (e) {
      if (!done) { done = true; clearTimeout(timer); resolve(null); }
    }
  });
}

/* Read embedded images straight from the PDF's image objects, keeping
   their original bytes: a DCT (JPEG) image is saved as a .jpg, a JPEG
   2000 image as a .jp2, a JBIG2 image as a .jb2. Flate and other filters
   are left for the pdf.js path below, which decodes them to PNG. Returns
   [{page, name, blob, format, width, height, note}] or null when the
   file cannot be read as a PDF at all (for example, it is encrypted).
   A picture with a transparency mask (SMask) keeps its JPEG bytes but
   the mask is not kept, so the JPEG may show a dark background where
   the original was transparent. */

function toIsoWithOffset(d) {
  const p = (n) => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const a = Math.abs(off);
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds()) + sign + p(Math.floor(a / 60)) + ":" + p(a % 60);
}

/* Build a small, well-formed XMP metadata packet from the same values
   the Info dictionary holds. Dates are ISO strings (with Z). Values are
   XML-escaped. Used because the app that saves a PDF always writes its
   own name as Producer and the save time as Modification Date in the
   Info dictionary, so the user's Producer and Modification Date are
   kept here, in the XMP packet, where a reader can still see them. */

/* Convert one loaded image file to another format on a canvas. JPEG output
   is flattened onto white (JPG has no transparency). Returns the blob, or
   null when this browser cannot encode the format. Takes no element ids,
   so it splits to core.js. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

async function convertImageFile(file, mime, quality) {
  const img = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0);
  return canvasToBlob(canvas, mime, quality);
}

/* Load an image file onto a canvas with its EXIF orientation applied, so a
   phone photo never comes out sideways. JPEG, PNG and WebP orientation is
   read with exifr when it loaded, otherwise with the built-in JPEG parser.
   Returns {canvas, orientation}. Takes no element ids, so it splits to
   core.js. */

async function orientedCanvasFromFile(file) {
  const img = await loadImageFromFile(file);
  const orientation = await exifOrientationOfFile(file);
  if (orientation > 1) {
    return { canvas: orientedImageCanvas(img, orientation), orientation: orientation };
  }
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return { canvas: canvas, orientation: orientation };
}

/* Encode a canvas as a 256-colour PNG-8 with UPNG.js (MIT). UPNG needs
   pako, which the tool page loads before UPNG (registry libs order).
   Returns a PNG Blob. Shared by JPG to PNG and WebP to PNG, so it lives
   in core.js (see split-app.py CORE_NAMES). */
/* PNG-8 via UPNG.js. Returns { blob, png8 }: png8 is true when the file
   really is a 256-colour palette PNG. Two UPNG.js limits are handled here:
   (1) its median-cut quantizer collapses a perfectly symmetric colour set
   (for example red + green + blue on white) to one grey, so images with
   256 or fewer distinct colours use the exact-palette path instead;
   (2) it sizes its output buffer from the raw image size, so a very small
   image with a large palette comes back truncated (no IEND chunk) — that
   case falls back to a full-colour PNG rather than saving a broken file. */

async function encodePng8FromCanvas(canvas) {
  if (!window.UPNG || !window.UPNG.encode) throw new Error("The PNG-8 library (UPNG.js) did not load. Check your connection and try again.");
  if (!window.pako) throw new Error("The PNG-8 helper (pako) did not load. Check your connection and try again.");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not read the image. Please try again.");
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let unique = 0;
  const seen = new Set();
  const d32 = new Uint32Array(img.data.buffer, img.data.byteOffset, img.data.length / 4);
  for (let i = 0; i < d32.length; i++) {
    if (!seen.has(d32[i])) { seen.add(d32[i]); if (++unique > 256) break; }
  }
  const ab = window.UPNG.encode([img.data.buffer], canvas.width, canvas.height, unique <= 256 ? 0 : 256);
  const bytes = new Uint8Array(ab);
  const iend = [0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
  const complete = bytes.length >= 12 && iend.every((b, i) => bytes[bytes.length - 12 + i] === b);
  if (!complete) {
    const plain = await canvasToBlob(canvas, "image/png");
    if (!plain) throw new Error("This browser could not encode PNG. Please try again.");
    return { blob: plain, png8: false };
  }
  return { blob: new Blob([ab], { type: "image/png" }), png8: true };
}

/* Flatten a canvas onto one colour (JPEG has no transparency, so the
   see-through parts need a background). Returns a new canvas. Shared by
   the two JPG converters, so it lives in core.js (see split-app.py
   CORE_NAMES). */

function flattenCanvasOnColour(canvas, colour) {
  const out = document.createElement("canvas");
  out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext("2d");
  ctx.fillStyle = colour || "#ffffff"; ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out;
}

/* Render an image at an arbitrary angle (degrees, clockwise) with flips
   onto a fresh canvas sized to the rotated bounding box. Takes no element
   ids; shared by Rotate and Flip Image and by Image to Text (deskew), so
   it lives in core.js (see split-app.py CORE_NAMES). */

function renderArbitraryRotatedImage(img, angleDeg, flipH, flipV) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const rad = (angleDeg * Math.PI) / 180, cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * cos + h * sin));
  canvas.height = Math.max(1, Math.round(w * sin + h * cos));
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return canvas;
}

/* Render an image with a rotation (0-3 quarter turns clockwise) and flips
   onto a fresh canvas. Takes no element ids, so it splits to core.js. */

function renderRotatedImage(img, rot, flipH, flipV, jpeg) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const swap = rot % 2 === 1;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w; canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d");
  if (jpeg) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 2);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return canvas;
}

/* Encode a canvas as a 24-bit BMP blob (BITMAPINFOHEADER, bottom-up rows).
   Browsers cannot save BMP from a canvas, so the bytes are written by hand.
   Pure: takes a canvas, touches no element ids. Routed to the
   image-converter bundle (split-app.py TOOL_NAMES), not core. */

async function exifOrientationOfFile(file) {
  try {
    if (window.exifr && window.exifr.orientation) {
      const o = await window.exifr.orientation(file);
      if (o >= 1 && o <= 8) return o;
    }
  } catch (e) { /* fall through to the JPEG parser */ }
  try {
    const buf = await file.arrayBuffer();
    return readJpegOrientation(buf);
  } catch (e) { return 1; }
}

/* Decode a TIFF ArrayBuffer into a canvas with UTIF.js. Handles 8-bit and
   16-bit RGB, greyscale and palette images; throws a plain Error with a
   human message for anything else. Deflate-compressed TIFFs need pako,
   which the caller loads first (see imageFileToCanvas). Pure apart from
   window.UTIF / window.pako. Routed to image-converter (TOOL_NAMES). */

// Unit tables: each type maps unit keys to their factor in the base unit.
// Temperature is special (offsets, not factors) and is handled in convertUnit.
const UNIT_DEFS = {
  length: [["mm", "millimetres"], ["cm", "centimetres"], ["m", "metres"], ["km", "kilometres"], ["in", "inches"], ["ft", "feet"], ["yd", "yards"], ["mi", "miles"]],
  weight: [["g", "grams"], ["kg", "kilograms"], ["t", "tonnes"], ["oz", "ounces"], ["lb", "pounds"], ["st", "stone"]],
  temperature: [["c", "Celsius"], ["f", "Fahrenheit"], ["k", "Kelvin"]],
  area: [["sqm", "square metres"], ["sqkm", "square kilometres"], ["sqft", "square feet"], ["sqyd", "square yards"], ["acre", "acres"], ["ha", "hectares"]],
  volume: [["ml", "millilitres"], ["l", "litres"], ["cum", "cubic metres"], ["cup", "US cups"], ["gal", "US gallons"], ["floz", "fluid ounces"]],
  speed: [["mps", "metres per second"], ["kph", "kilometres per hour"], ["mph", "miles per hour"], ["kn", "knots"]],
  data: [["b", "bytes"], ["kb", "kilobytes"], ["mb", "megabytes"], ["gb", "gigabytes"], ["tb", "terabytes"]],
  time: [["s", "seconds"], ["min", "minutes"], ["h", "hours"], ["day", "days"], ["week", "weeks"]],
  energy: [["j", "joules"], ["kj", "kilojoules"], ["cal", "calories"], ["kcal", "kilocalories"], ["kwh", "kilowatt-hours"]],
  pressure: [["pa", "pascals"], ["kpa", "kilopascals"], ["bar", "bar"], ["psi", "pounds per square inch"], ["atm", "atmospheres"], ["mmhg", "millimetres of mercury"]],
  power: [["w", "watts"], ["kw", "kilowatts"], ["hp", "horsepower"], ["mw", "megawatts"]],
  fuel: [["l100km", "litres per 100 km"], ["kml", "kilometres per litre"], ["mpgus", "miles per gallon (US)"], ["mpguk", "miles per gallon (UK)"]],
  cooking: [["tsp", "teaspoons"], ["tbsp", "tablespoons"], ["ml", "millilitres"], ["cup", "US cups"], ["l", "litres"]]
};
const UNIT_FACTORS = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
  weight: { g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
  area: { sqm: 1, sqkm: 1000000, sqft: 0.09290304, sqyd: 0.83612736, acre: 4046.8564224, ha: 10000 },
  volume: { ml: 0.001, l: 1, cum: 1000, cup: 0.2365882365, gal: 3.785411784, floz: 0.0295735295625 },
  speed: { mps: 1, kph: 0.2777777777777778, mph: 0.44704, kn: 0.5144444444444445 },
  data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
  time: { s: 1, min: 60, h: 3600, day: 86400, week: 604800 },
  energy: { j: 1, kj: 1000, cal: 4.184, kcal: 4184, kwh: 3600000 },
  pressure: { pa: 1, kpa: 1000, bar: 100000, psi: 6894.757293168, atm: 101325, mmhg: 133.322387415 },
  power: { w: 1, kw: 1000, hp: 745.699872, mw: 1000000 },
  cooking: { tsp: 4.92892159375, tbsp: 14.78676478125, ml: 1, cup: 236.5882365, l: 1000 }
};
const UNIT_SHORT = { mm: "mm", cm: "cm", m: "m", km: "km", in: "in", ft: "ft", yd: "yd", mi: "mi", g: "g", kg: "kg", t: "t", oz: "oz", lb: "lb", st: "st", c: "°C", f: "°F", k: "K", sqm: "m²", sqkm: "km²", sqft: "ft²", sqyd: "yd²", acre: "acre", ha: "ha", ml: "ml", l: "l", cum: "m³", cup: "cup", gal: "gal", floz: "fl oz", mps: "m/s", kph: "km/h", mph: "mph", kn: "kn", b: "B", kb: "KB", mb: "MB", gb: "GB", tb: "TB", s: "s", min: "min", h: "h", day: "day", week: "week", j: "J", kj: "kJ", cal: "cal", kcal: "kcal", kwh: "kWh", pa: "Pa", kpa: "kPa", bar: "bar", psi: "psi", atm: "atm", mmhg: "mmHg", w: "W", kw: "kW", hp: "hp", mw: "MW", l100km: "L/100 km", kml: "km/L", mpgus: "mpg (US)", mpguk: "mpg (UK)", tsp: "tsp", tbsp: "tbsp" };
/* Grams per US cup, used by the cooking estimator. These are typical values,
   not exact: density varies by brand, grind and how firmly a cup is packed,
   so every cooking result is labelled an estimate. */
const COOK_DENSITY = { water: 236, milk: 245, flour: 120, sugar: 200, butter: 227, rice: 185, oats: 90, honey: 340, oil: 218, cocoa: 100 };
const TZ_LABELS = { "UTC": "UTC", "Asia/Karachi": "Lahore", "Asia/Dubai": "Dubai", "Asia/Kolkata": "Kolkata", "Asia/Dhaka": "Dhaka", "Asia/Singapore": "Singapore", "Asia/Tokyo": "Tokyo", "Australia/Sydney": "Sydney", "Europe/London": "London", "Europe/Paris": "Paris", "Europe/Berlin": "Berlin", "America/New_York": "New York", "America/Chicago": "Chicago", "America/Denver": "Denver", "America/Los_Angeles": "Los Angeles", "America/Toronto": "Toronto", "Pacific/Auckland": "Auckland" };
// Round to dp decimals and drop trailing zeros ("5000", not "5000.0000").

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

function fmtCalc(n, dp) {
  const d = dp === undefined ? 4 : dp;
  if (!isFinite(n)) return "0";
  return String(Math.round(n * Math.pow(10, d)) / Math.pow(10, d));
}
// Round to 2 decimals and drop trailing zeros ("200", "55,054.31" stays grouped by fmtMoney).

function fmtTrim(n) {
  if (!isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}
// Scientific result: 10 decimals, then trim; very large/small use exponent form.

function fmtSci(v) {
  if (v === 0) return "0";
  const r = Math.round(v * 1e10) / 1e10;
  if (Math.abs(r) >= 1e12 || (Math.abs(r) < 1e-9 && r !== 0)) return r.toExponential(6).replace(/\.?0+e/, "e");
  return String(r);
}

function gcdCalc(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}

function convertUnit(type, value, from, to) {
  if (isNaN(value)) return { error: "Please enter a number to convert." };
  const def = UNIT_DEFS[type];
  if (!def) return { error: "Please choose a unit type." };
  let out;
  if (type === "fuel") {
    /* Fuel economy is reciprocal: litres per 100 km is the base, and
       km/L or mpg convert by dividing into a constant. */
    if (!(value > 0)) return { error: "Please enter a number more than 0 for fuel economy." };
    const toBase = { l100km: (v) => v, kml: (v) => 100 / v, mpgus: (v) => 235.2145833 / v, mpguk: (v) => 282.4809363 / v };
    const fromBase = { l100km: (v) => v, kml: (v) => 100 / v, mpgus: (v) => 235.2145833 / v, mpguk: (v) => 282.4809363 / v };
    if (!toBase[from] || !fromBase[to]) return { error: "Please choose the units to convert between." };
    out = fromBase[to](toBase[from](value));
  } else if (type === "temperature") {
    let c;
    if (from === "c") c = value;
    else if (from === "f") c = (value - 32) * 5 / 9;
    else if (from === "k") c = value - 273.15;
    else return { error: "Please choose a temperature unit." };
    if (to === "c") out = c;
    else if (to === "f") out = c * 9 / 5 + 32;
    else if (to === "k") out = c + 273.15;
    else return { error: "Please choose a temperature unit." };
  } else {
    const f = UNIT_FACTORS[type];
    if (!f || !f[from] || !f[to]) return { error: "Please choose the units to convert between." };
    out = value * f[from] / f[to];
  }
  return { result: out, text: fmtCalc(value) + " " + (UNIT_SHORT[from] || from) + " = " + fmtCalc(out) + " " + (UNIT_SHORT[to] || to) };
}
// The unit-type dropdown options, for the page script (which cannot read
// the core const tables directly when scripts are eval'd separately).

function unitOptions(type) {
  return UNIT_DEFS[type] || [];
}
/* Every unit of one type at once: type 5 km and see metres, miles and feet
   together. Returns formatted lines like "5000 m". */

function unitAllRows(type, value, from) {
  const rows = [];
  const def = UNIT_DEFS[type] || [];
  def.forEach(([key]) => {
    if (key === from) return;
    const r = convertUnit(type, value, from, key);
    if (!r.error) rows.push(fmtCalc(r.result) + " " + (UNIT_SHORT[key] || key));
  });
  return rows;
}
/* Cooking estimator: grams of one ingredient into US cups, from the density
   table above. Returns null for an unknown ingredient or a bad amount. */

function cookCups(ingredient, grams) {
  const g = COOK_DENSITY[ingredient];
  if (!g || !(grams > 0)) return null;
  return grams / g;
}
const UNIT_RECENT_KEY = "ak-unit-recent";

function unitRecents() {
  try { return JSON.parse(localStorage.getItem(UNIT_RECENT_KEY) || "[]"); } catch (e) { return []; }
}

function unitSaveRecent(entry) {
  try {
    const list = unitRecents().filter((r) => !(r.type === entry.type && r.value === entry.value && r.from === entry.from && r.to === entry.to));
    list.unshift(entry);
    localStorage.setItem(UNIT_RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch (e) { /* private mode: recents stay off */ }
}

function zoneOffsetMs(zone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const parts = {};
  dtf.formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
  const asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
  return asUTC - date.getTime();
}

function tzConvert(dateStr, timeStr, fromZone, toZone) {
  if (!dateStr || !timeStr) return { error: "Please pick a date and a time." };
  if (!fromZone || !toZone) return { error: "Please choose both time zones." };
  const m = String(timeStr).match(/^(\d{2}):(\d{2})$/);
  if (!m) return { error: "Please pick a valid time." };
  const d = String(dateStr).split("-").map(Number);
  if (d.length !== 3 || d.some(isNaN)) return { error: "Please pick a valid date." };
  const wallAsUTC = Date.UTC(d[0], d[1] - 1, d[2], Number(m[1]), Number(m[2]));
  // Wall time in fromZone -> UTC instant (two passes for DST edges).
  let utc = wallAsUTC - zoneOffsetMs(fromZone, new Date(wallAsUTC));
  utc = wallAsUTC - zoneOffsetMs(fromZone, new Date(utc));
  const toDate = new Date(utc);
  const fromLabel = TZ_LABELS[fromZone] || fromZone;
  const toLabel = TZ_LABELS[toZone] || toZone;
  const toTimeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: toZone, hour: "2-digit", minute: "2-digit", hour12: false });
  const toDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: toZone, day: "numeric", month: "short", year: "numeric" });
  const fromDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: fromZone, day: "numeric", month: "short", year: "numeric" });
  // The from wall time is exactly what the user typed; format it directly.
  const typedTime = m[1] + ":" + m[2];
  const typedDate = fromDateFmt.format(new Date(Date.UTC(d[0], d[1] - 1, d[2])));
  return { text: typedTime + " on " + typedDate + " in " + fromLabel + " is " + toTimeFmt.format(toDate) + " on " + toDateFmt.format(toDate) + " in " + toLabel };
}

function dateDiffCalc(fromStr, toStr) {
  const a = new Date(fromStr + "T00:00:00");
  const b = new Date(toStr + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return { error: "Please pick two valid dates." };
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  const days = Math.round((end - start) / 86400000);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  const weeks = Math.floor(days / 7);
  const remDays = days % 7;
  return { days, weeks, remDays, months };
}

function tdeeCalc(age, sex, heightCm, weightKg, factor) {
  if (!age || age <= 0 || age > 120) return { error: "Please enter an age between 1 and 120." };
  if (!heightCm || heightCm <= 0) return { error: "Please enter a height more than 0." };
  if (!weightKg || weightKg <= 0) return { error: "Please enter a weight more than 0." };
  if (!factor || factor <= 0) return { error: "Please choose an activity level." };
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "female" ? -161 : 5);
  const bmrRound = Math.round(bmr);
  return { bmr: bmrRound, tdee: Math.round(bmrRound * factor) };
}
// Safe expression evaluator (shunting-yard to RPN). Trig uses degrees.
// No eval(): only numbers, brackets, operators and the named functions.

function evaluateScientific(expr, angleMode) {
  const s = String(expr || "").replace(/\s+/g, "");
  if (!s) return { error: "Please build a sum first." };
  const rad = angleMode === "rad";
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const num = s.slice(i, j);
      if ((num.match(/\./g) || []).length > 1 || num === ".") return { error: "Invalid number: " + num };
      tokens.push({ t: "num", v: parseFloat(num) });
      i = j;
    } else if (/[a-z]/.test(ch)) {
      let j = i;
      // Letters AND digits: "pow10" is one function name, not "pow" + 10.
      while (j < s.length && /[a-z0-9]/.test(s[j])) j++;
      const name = s.slice(i, j);
      if (name === "pi") tokens.push({ t: "num", v: Math.PI });
      else if (name === "e") tokens.push({ t: "num", v: Math.E });
      else if (["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "log", "ln", "sqrt", "exp", "pow10", "cbrt", "inv"].includes(name)) tokens.push({ t: "fn", v: name });
      else return { error: "Unknown word: " + name };
      i = j;
    } else if ("+-*/^%!()".includes(ch)) {
      tokens.push({ t: "op", v: ch });
      i++;
    } else {
      return { error: "Invalid character: " + ch };
    }
  }
  const prec = { "+": 2, "-": 2, "*": 3, "/": 3, "^": 4, "!": 5, "%": 5, "neg": 4 };
  const rightAssoc = { "^": true };
  const out = [];
  const stack = [];
  let prev = null;
  for (const tok of tokens) {
    if (tok.t === "num") { out.push(tok); prev = tok; continue; }
    if (tok.t === "fn") { stack.push(tok); prev = tok; continue; }
    const op = tok.v;
    if (op === "(") { stack.push(tok); prev = tok; continue; }
    if (op === ")") {
      let found = false;
      while (stack.length) {
        const top = stack.pop();
        if (top.t === "op" && top.v === "(") { found = true; break; }
        out.push(top);
      }
      if (!found) return { error: "Mismatched brackets." };
      if (stack.length && stack[stack.length - 1].t === "fn") out.push(stack.pop());
      prev = tok; continue;
    }
    if (op === "!" || op === "%") { out.push(tok); prev = tok; continue; }
    if (op === "-" && (!prev || (prev.t === "op" && prev.v !== ")" && prev.v !== "!" && prev.v !== "%") || (prev.t === "fn"))) {
      stack.push({ t: "op", v: "neg" });
      prev = tok; continue;
    }
    if (op === "+" && (!prev || (prev.t === "op" && prev.v !== ")" && prev.v !== "!" && prev.v !== "%") || (prev.t === "fn"))) {
      prev = tok; continue;
    }
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.t === "fn") { out.push(stack.pop()); continue; }
      if (top.t === "op" && top.v !== "(") {
        const p1 = prec[op], p2 = prec[top.v];
        if (p2 > p1 || (p2 === p1 && !rightAssoc[op])) { out.push(stack.pop()); continue; }
      }
      break;
    }
    stack.push(tok);
    prev = tok;
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.t === "op" && top.v === "(") return { error: "Mismatched brackets." };
    out.push(top);
  }
  const st = [];
  for (const tok of out) {
    if (tok.t === "num") { st.push(tok.v); continue; }
    if (tok.t === "fn") {
      if (!st.length) return { error: "Missing number for " + tok.v + "." };
      const x = st.pop();
      let r;
      // Trig follows the angle mode: degrees by default, radians when asked.
      const toRad = (d) => rad ? d : d * Math.PI / 180;
      const fromRad = (a) => rad ? a : a * 180 / Math.PI;
      if (tok.v === "sin") r = Math.sin(toRad(x));
      else if (tok.v === "cos") r = Math.cos(toRad(x));
      else if (tok.v === "tan") r = Math.tan(toRad(x));
      else if (tok.v === "asin") { if (x < -1 || x > 1) return { error: "Arcsin needs a number from -1 to 1." }; r = fromRad(Math.asin(x)); }
      else if (tok.v === "acos") { if (x < -1 || x > 1) return { error: "Arccos needs a number from -1 to 1." }; r = fromRad(Math.acos(x)); }
      else if (tok.v === "atan") r = fromRad(Math.atan(x));
      else if (tok.v === "sinh") r = Math.sinh(x);
      else if (tok.v === "cosh") r = Math.cosh(x);
      else if (tok.v === "tanh") r = Math.tanh(x);
      else if (tok.v === "exp") r = Math.exp(x);
      else if (tok.v === "pow10") r = Math.pow(10, x);
      else if (tok.v === "cbrt") r = Math.cbrt(x);
      else if (tok.v === "inv") { if (x === 0) return { error: "Cannot divide by zero." }; r = 1 / x; }
      else if (tok.v === "log") { if (x <= 0) return { error: "Log needs a number more than 0." }; r = Math.log10(x); }
      else if (tok.v === "ln") { if (x <= 0) return { error: "Ln needs a number more than 0." }; r = Math.log(x); }
      else if (tok.v === "sqrt") { if (x < 0) return { error: "Square root needs a number of 0 or more." }; r = Math.sqrt(x); }
      st.push(r); continue;
    }
    const op = tok.v;
    if (op === "neg") { if (!st.length) return { error: "Missing number." }; st.push(-st.pop()); continue; }
    if (op === "!") {
      if (!st.length) return { error: "Missing number for factorial." };
      const x = st.pop();
      if (x < 0 || Math.floor(x) !== x || x > 170) return { error: "Factorial only works for whole numbers from 0 to 170." };
      let r = 1;
      for (let k = 2; k <= x; k++) r *= k;
      st.push(r); continue;
    }
    if (op === "%") { if (!st.length) return { error: "Missing number for percent." }; st.push(st.pop() / 100); continue; }
    if (st.length < 2) return { error: "Incomplete sum." };
    const b = st.pop(), a = st.pop();
    if (op === "+") st.push(a + b);
    else if (op === "-") st.push(a - b);
    else if (op === "*") st.push(a * b);
    else if (op === "/") { if (b === 0) return { error: "Cannot divide by zero." }; st.push(a / b); }
    else if (op === "^") st.push(Math.pow(a, b));
  }
  if (st.length !== 1) return { error: "Incomplete sum." };
  const v = st[0];
  if (!isFinite(v)) return { error: "The answer is too large to show." };
  return { value: v };
}

// Time-zone label for zones outside the built-in TZ_LABELS table.

// Lorem ipsum sentence pool (classic placeholder text, public domain).
const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Curabitur pretium tincidunt lacus nulla gravida orci a odio.",
  "Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
  "Integer in mauris eu nibh euismod gravida.",
  "Duis ac tellus et risus vulputate vehicula.",
  "Donec lobortis risus a elit efficitur, at feugiat nibh tincidunt.",
  "Phasellus auctor, lorem et aliquet facilisis, justo sapien cursus mi, vitae facilisis sapien magna in metus.",
  "Vivamus luctus eros aliquet convallis ultricies.",
  "Mauris augue massa, ultrices non ligula nec, egestas finibus erat.",
  "Sed porttitor lectus nibh, at sagittis libero tincidunt at.",
  "Nulla porttitor accumsan tincidunt.",
  "Quisque velit nisi, pretium ut lacinia in, elementum id enim.",
  "Donec sollicitudin molestie malesuada.",
  "Proin eget tortor risus.",
  "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.",
  "Pellentesque in ipsum id orci porta dapibus."
];
// Common English words ignored by the word-frequency tool when asked.
const STOPWORDS = new Set("the a an and or but of to in on for with is are was were be been it its this that these those i you he she we they at by from as not no so if then than too very can will would should could have has had do does did my your his her our their am".split(" "));
// Small capital letters (Unicode has no small capital for x, so x stays x).
const SMALL_CAPS = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ꞯ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
// Build a Unicode letter map from contiguous mathematical alphanumeric
// blocks; exceptions override the slots that hold other characters
// (italic h is U+210E, script B/E/F/H/I/L/M/R, double-struck C/H/N/P/Q/R/Z).

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

function buildFancyMap(capBase, smallBase, digitBase, capEx, smallEx) {
  const m = {};
  for (let i = 0; i < 26; i++) {
    m[String.fromCharCode(65 + i)] = String.fromCodePoint(capBase + i);
    m[String.fromCharCode(97 + i)] = String.fromCodePoint(smallBase + i);
  }
  if (digitBase) for (let i = 0; i < 10; i++) m[String(i)] = String.fromCodePoint(digitBase + i);
  if (capEx) for (const k in capEx) m[k] = capEx[k];
  if (smallEx) for (const k in smallEx) m[k] = smallEx[k];
  return m;
}
const FANCY_MAPS = {
  bold: buildFancyMap(0x1D400, 0x1D41A, 0x1D7CE),
  italic: buildFancyMap(0x1D434, 0x1D44E, null, null, { h: "ℎ" }),
  boldItalic: buildFancyMap(0x1D468, 0x1D482, null),
  monospace: buildFancyMap(0x1D670, 0x1D68A, 0x1D7F6),
  script: buildFancyMap(0x1D49C, 0x1D4B6, null, { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" }, { e: "ℯ", g: "ℊ" }),
  doubleStruck: buildFancyMap(0x1D538, 0x1D552, null, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" }),
  circled: buildFancyMap(0x24B6, 0x24D0, null),
  smallCaps: Object.assign({}, SMALL_CAPS, Object.fromEntries(Object.keys(SMALL_CAPS).map((k) => [k.toUpperCase(), SMALL_CAPS[k]])))
};
// Circled digits: 1-9 are U+2460-U+2468, 0 is U+24EA.
for (let d = 1; d <= 9; d++) FANCY_MAPS.circled[String(d)] = String.fromCodePoint(0x245F + d);
FANCY_MAPS.circled["0"] = "⓪";

function loremIpsum(unit, count) {
  count = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
  if (unit === "sentences") {
    const out = [];
    for (let i = 0; i < count; i++) out.push(LOREM_SENTENCES[i % LOREM_SENTENCES.length]);
    return { text: out.join(" ") };
  }
  if (unit === "words") {
    const words = LOREM_SENTENCES.join(" ").split(/\s+/);
    const out = [];
    for (let i = 0; i < count; i++) out.push(words[i % words.length]);
    return { text: out.join(" ") };
  }
  const paras = [];
  for (let p = 0; p < count; p++) {
    const s = [];
    for (let i = 0; i < 5; i++) s.push(LOREM_SENTENCES[(p * 5 + i) % LOREM_SENTENCES.length]);
    paras.push(s.join(" "));
  }
  return { text: paras.join("\n\n") };
}

function dedupeLines(text, caseSensitive) {
  const lines = String(text || "").split("\n");
  const seen = new Set();
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const key = caseSensitive ? t : t.toLowerCase();
    if (seen.has(key)) { removed++; continue; }
    seen.add(key);
    kept.push(t);
  }
  return { lines: kept, removed };
}

function sortLinesFn(text, order, ignoreEmpty) {
  const lines = String(text || "").split("\n").map((s) => s.trim());
  const kept = ignoreEmpty ? lines.filter(Boolean) : lines;
  const sorted = kept.slice();
  if (order === "za") sorted.sort((a, b) => b.localeCompare(a));
  else if (order === "num") sorted.sort((a, b) => {
    const na = parseFloat(a), nb = parseFloat(b);
    if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });
  else if (order === "len-desc") sorted.sort((a, b) => b.length - a.length);
  else if (order === "len-asc") sorted.sort((a, b) => a.length - b.length);
  else sorted.sort((a, b) => a.localeCompare(b));
  return { lines: sorted };
}

function findReplace(text, find, replace, matchCase) {
  if (!find) return { error: "Please enter the text to find." };
  const src = String(text || "");
  const rep = replace === undefined || replace === null ? "" : String(replace);
  let count = 0;
  let result = "";
  if (matchCase) {
    count = src.split(find).length - 1;
    result = src.split(find).join(rep);
  } else {
    const low = src.toLowerCase(), fl = find.toLowerCase();
    let i = 0, at;
    while ((at = low.indexOf(fl, i)) !== -1) { count++; result += src.slice(i, at) + rep; i = at + fl.length; }
    result += src.slice(i);
  }
  return { result, count };
}
// Syllables by vowel-group rule (not a dictionary): count vowel groups,
// take one away for a silent e, add one back for a sounded -le, min 1.

function countSyllables(word) {
  const w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let n = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith("e")) n -= 1;
  if (w.endsWith("le") && w.length > 2 && !/[aeiouy]/.test(w.charAt(w.length - 3))) n += 1;
  return Math.max(1, n);
}

function readabilityScore(text) {
  const s = String(text || "").trim();
  if (!s) return { error: "Please enter some text to check." };
  const words = s.split(/\s+/).filter(Boolean);
  const sentences = (s.match(/[^.!?]+[.!?]+/g) || [s]).length;
  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);
  const wps = words.length / sentences;
  const spw = syllables / words.length;
  const ease = 206.835 - 1.015 * wps - 84.6 * spw;
  const grade = 0.39 * wps + 11.8 * spw - 15.59;
  let level = "Very difficult";
  if (ease >= 90) level = "Very easy";
  else if (ease >= 80) level = "Easy";
  else if (ease >= 70) level = "Fairly easy";
  else if (ease >= 60) level = "Standard";
  else if (ease >= 50) level = "Fairly difficult";
  else if (ease >= 30) level = "Difficult";
  return { words: words.length, sentences, syllables, ease: Math.round(ease * 10) / 10, grade: Math.round(grade * 10) / 10, level };
}

function wordFrequency(text, ignoreStopwords, topN) {
  const words = String(text || "").toLowerCase().match(/[a-z']+/g) || [];
  const counts = {};
  for (const w of words) {
    const clean = w.replace(/^'+|'+$/g, "");
    if (!clean) continue;
    if (ignoreStopwords && STOPWORDS.has(clean)) continue;
    counts[clean] = (counts[clean] || 0) + 1;
  }
  const rows = Object.keys(counts).map((w) => [w, counts[w]]);
  rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const n = topN === "all" ? rows.length : (parseInt(topN, 10) || 10);
  return { rows: rows.slice(0, n), total: rows.length };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mdInline(s) {
  let out = s;
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/_([^_]+)_/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>");
  return out;
}
// Safe Markdown subset: HTML is escaped first, so pasted tags show as text,
// never run. Supports headings, bold, italic, code, lists, links, quotes,
// rules and code blocks. No tables, footnotes or raw HTML.
/* Full CommonMark rendering via marked (MIT) with the marked-footnote
   extension for footnotes. Raw HTML is escaped first, so a pasted tag is
   shown as text and never runs — the same safe rule the old hand-rolled
   renderer used. GFM tables and task lists come with marked itself. Falls
   back to the hand-rolled subset when the library did not load. */
let _markedFootnoteOn = false;

function renderMarkdown(text) {
  if (window.marked) {
    if (!_markedFootnoteOn && window.markedFootnote) {
      try { window.marked.use(window.markedFootnote()); } catch (e) { /* footnotes stay off */ }
      _markedFootnoteOn = true;
    }
    const safe = String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    try { return window.marked.parse(safe); } catch (e) { return renderMarkdownFallback(text); }
  }
  return renderMarkdownFallback(text);
}

function renderMarkdownFallback(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      blocks.push("<h" + m[1].length + ">" + mdInline(escapeHtml(m[2])) + "</h" + m[1].length + ">");
      i++;
    } else if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      blocks.push("<pre><code>" + escapeHtml(buf.join("\n")) + "</code></pre>");
    } else if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      i++;
    } else if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push("<blockquote>" + mdInline(escapeHtml(buf.join(" "))) + "</blockquote>");
    } else if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push("<li>" + mdInline(escapeHtml(lines[i].replace(/^[-*]\s+/, ""))) + "</li>"); i++; }
      blocks.push("<ul>" + items.join("") + "</ul>");
    } else if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push("<li>" + mdInline(escapeHtml(lines[i].replace(/^\d+\.\s+/, ""))) + "</li>"); i++; }
      blocks.push("<ol>" + items.join("") + "</ol>");
    } else {
      const buf = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|---+\s*$|>\s?|[-*]\s+|\d+\.\s+)/.test(lines[i])) { buf.push(lines[i]); i++; }
      blocks.push("<p>" + mdInline(escapeHtml(buf.join(" "))) + "</p>");
    }
  }
  return blocks.join("\n");
}

function fancyStyles(text) {
  const s = String(text || "");
  const out = {};
  for (const name in FANCY_MAPS) {
    const map = FANCY_MAPS[name];
    out[name] = [...s].map((ch) => map[ch] || ch).join("");
  }
  return out;
}
// Labelled style rows for the page script (which cannot read the core
// const tables directly when scripts are eval'd separately).

function fancyRows(text) {
  const styles = fancyStyles(text);
  return [["Bold", styles.bold], ["Italic", styles.italic], ["Bold Italic", styles.boldItalic], ["Monospace", styles.monospace], ["Script", styles.script], ["Double-struck", styles.doubleStruck], ["Circled", styles.circled], ["Small Caps", styles.smallCaps]];
}
// The voices on this device, for the page script (same eval reason as above).

function ttsVoiceList() {
  if (!("speechSynthesis" in window) || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices() || [];
}

/* Pure functions are function declarations, so the splitter puts them in
   core.js automatically. Handlers read core helpers only through functions,
   never through core const tables (jsdom cannot see const across evals). */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

function slugifyText(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function jsonToYamlText(text) {
  if (typeof window.jsyaml === "undefined") throw new Error("The YAML library did not load.");
  return window.jsyaml.dump(JSON.parse(text));
}

function yamlToJsonText(text) {
  if (typeof window.jsyaml === "undefined") throw new Error("The YAML library did not load.");
  return JSON.stringify(window.jsyaml.load(text), null, 2);
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xmlTagName(key) {
  const safe = String(key).replace(/[^a-zA-Z0-9_.-]/g, "_");
  return /^[a-zA-Z_]/.test(safe) ? safe : "field_" + safe;
}

function jsonToXmlValue(value, tag) {
  if (value === null || value === undefined) return "<" + tag + " />";
  if (Array.isArray(value)) return value.map((item) => jsonToXmlValue(item, "item")).join("");
  if (typeof value === "object") {
    let out = "";
    for (const key of Object.keys(value)) out += jsonToXmlValue(value[key], xmlTagName(key));
    return "<" + tag + ">" + out + "</" + tag + ">";
  }
  return "<" + tag + ">" + escapeXml(String(value)) + "</" + tag + ">";
}

function jsonToXmlText(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return "<root>" + jsonToXmlValue(data, "items") + "</root>";
  return jsonToXmlValue(data, "root");
}

function xmlNodeToJson(node) {
  const out = {};
  for (let i = 0; i < (node.attributes || []).length; i++) {
    const attr = node.attributes[i];
    out["@" + attr.name] = attr.value;
  }
  const kids = [];
  for (let i = 0; i < node.childNodes.length; i++) kids.push(node.childNodes[i]);
  const elements = kids.filter((c) => c.nodeType === 1);
  const text = kids.filter((c) => c.nodeType === 3).map((c) => c.nodeValue).join("").trim();
  for (const el of elements) {
    const value = xmlNodeToJson(el);
    if (out[el.tagName] === undefined) out[el.tagName] = value;
    else if (Array.isArray(out[el.tagName])) out[el.tagName].push(value);
    else out[el.tagName] = [out[el.tagName], value];
  }
  if (Object.keys(out).length === 0) return text;
  if (text) out["#text"] = text;
  return out;
}

function xmlToJsonText(text) {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("That XML could not be read. Check that every tag is closed and there is one top tag.");
  const root = doc.documentElement;
  const result = {};
  result[root.tagName] = xmlNodeToJson(root);
  return JSON.stringify(result, null, 2);
}

function flattenJsonRow(obj, prefix, out) {
  for (const key of Object.keys(obj)) {
    const full = prefix ? prefix + "." + key : key;
    const value = obj[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) flattenJsonRow(value, full, out);
    else if (Array.isArray(value)) out[full] = JSON.stringify(value);
    else out[full] = value === null || value === undefined ? "" : value;
  }
  return out;
}

function jsonToCsvText(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("Please paste a JSON list, for example [{\"name\": \"Ali\"}].");
  if (!data.length) throw new Error("The list is empty, so there is nothing to convert.");
  const rows = data.map((item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) throw new Error("Each item in the list must be an object with named fields.");
    return flattenJsonRow(item, "", {});
  });
  const cols = [];
  for (const row of rows) for (const key of Object.keys(row)) if (cols.indexOf(key) === -1) cols.push(key);
  const cell = (v) => {
    const s = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(cell).join(",")];
  for (const row of rows) lines.push(cols.map((c) => cell(row[c])).join(","));
  return lines.join("\n");
}

function base64UrlDecode(segment) {
  let s = String(segment).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function base64UrlEncode(bytes) {
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeJwt(token) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 3) throw new Error("A JWT has three parts joined by two dots. Check that you pasted the whole token.");
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  let expired = null;
  let expiryDate = null;
  if (payload && typeof payload.exp === "number") {
    expiryDate = new Date(payload.exp * 1000);
    expired = expiryDate.getTime() < Date.now();
  }
  return { header: header, payload: payload, signature: parts[2], expired: expired, expiryDate: expiryDate };
}
/* Recompute an HMAC signature with the pasted secret (WebCrypto) and compare
   it with the token's own signature. The secret is used only inside this
   browser tab and is never sent anywhere. */

async function verifyJwtHmac(token, secret, alg) {
  const parts = String(token || "").trim().split(".");
  if (parts.length !== 3) throw new Error("A JWT has three parts joined by two dots. Check that you pasted the whole token.");
  const hash = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" }[alg];
  if (!hash) throw new Error("This tool checks HMAC signatures (HS256, HS384, HS512) only.");
  if (!window.crypto || !window.crypto.subtle) throw new Error("This browser does not offer WebCrypto, so the signature cannot be checked here.");
  const key = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash }, false, ["sign"]);
  const sig = await window.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts[0] + "." + parts[1]));
  const expected = base64UrlEncode(new Uint8Array(sig));
  if (expected.length !== parts[2].length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
  return diff === 0;
}
/* Plain-words expiry note: "expires in 3 hours" or "expired 2 days ago". */

function jwtExpiryNote(d) {
  if (!d.expiryDate) return "";
  const diff = d.expiryDate.getTime() - Date.now();
  const mins = Math.round(Math.abs(diff) / 60000);
  let span;
  if (mins < 60) span = mins + " minute" + (mins === 1 ? "" : "s");
  else if (mins < 1440) { const h = Math.round(mins / 60); span = h + " hour" + (h === 1 ? "" : "s"); }
  else { const dys = Math.round(mins / 1440); span = dys + " day" + (dys === 1 ? "" : "s"); }
  return diff < 0 ? " (expired " + span + " ago)" : " (expires in " + span + ")";
}

function bytesToHex(buf) {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function hashData(algo, data) {
  if (algo === "MD5") {
    /* SparkMD5 hashes strings and ArrayBuffers correctly. blueimp-md5 only
       takes strings: passed a Uint8Array it hashes the text "104,101,108,
       108,111", so text goes in as a string and files as an ArrayBuffer. */
    if (typeof window.SparkMD5 === "undefined") throw new Error("The MD5 library did not load.");
    if (typeof data === "string") return window.SparkMD5.hash(data);
    const buf = data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return window.SparkMD5.ArrayBuffer.hash(buf);
  }
  if (!window.crypto || !window.crypto.subtle) throw new Error("SHA hashes need a secure page. Open this site over HTTPS and try again.");
  const buf = await window.crypto.subtle.digest(algo, data);
  return bytesToHex(buf);
}

function urlEncodeText(text, mode) { return mode === "full" ? encodeURI(text) : encodeURIComponent(text); }

function urlDecodeText(text) { return decodeURIComponent(text); }

function sttRecognitionCtor() {
  if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) return window.SpeechRecognition || window.webkitSpeechRecognition;
  return null;
}

/* Excel to CSV: sheet picker, delimiter choice, UTF-8 BOM, display
   formats, visible-rows-only and skip-empty. All sheets go in one ZIP. */

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
  if (t.includes("averageif")) return head + "=AVERAGEIF(range, criteria, [average_range])\n\nHow to use it: range is where the condition is checked, criteria is the condition, and average_range is optional — leave it out to average the checked range itself. Example: =AVERAGEIF(A2:A20, \">100\") averages only the values over 100.";
  if (t.includes("eomonth")) return head + "=EOMONTH(start_date, months)\n\nHow to use it: start_date is a date cell, months is how many months to move (0 = same month). The result is the last day of that month. Example: =EOMONTH(A2, 1) is the last day of next month.";
  if (t.includes("rank")) return head + "=RANK(number, ref, [order])\n\nHow to use it: number is the value to rank, ref is the range with all the numbers, order is 0 for largest-is-1 or 1 for smallest-is-1. Example: =RANK(A2, A2:A20, 0).";
  if (t.includes("large")) return head + "=LARGE(array, k)\n\nHow to use it: array is the range with the numbers, k is which largest value you want (1 = largest, 2 = second largest). Example: =LARGE(A2:A20, 1) is the top sale.";
  if (t.includes("small")) return head + "=SMALL(array, k)\n\nHow to use it: array is the range with the numbers, k is which smallest value you want (1 = smallest, 2 = second smallest). Example: =SMALL(A2:A20, 1) is the lowest sale.";
  if (t.includes("round")) return head + "=ROUND(number, num_digits)\n\nHow to use it: number is the value to round, num_digits is how many decimal places (0 = whole number, 2 = two places). Example: =ROUND(A2, 2).";
  if (/\blet\b/.test(t)) return head + "=LET(name, value, calculation)\n\nHow to use it: LET works out value once, gives it the name, then uses that name in calculation. It keeps long formulas short. Example: =LET(total, SUM(B2:B20), total*1.1). Needs Microsoft 365 or Excel 2021.";
  if (t.includes("vlookup") && t.includes("iferror")) return head + "=IFERROR(VLOOKUP(lookup_value, table_array, col_index_num, FALSE), \"\")\n\nHow to use it: VLOOKUP finds the value, and IFERROR shows a blank cell instead of #N/A when there is no match. Change \"\" to your own message if you like.";
  if (t.includes("xlookup") && (t.includes("multiple") || t.includes("criteria") || t.includes("multi") || t.includes("two"))) return head + "=XLOOKUP(1, (lookup_array1=lookup_value1)*(lookup_array2=lookup_value2), return_array, \"Not found\")\n\nHow to use it: XLOOKUP matches a row where both conditions are true at the same time, then returns the value from return_array. Needs Microsoft 365 or Excel 2021.";
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
  return head + "No exact keyword rule matched.\n\nTry keywords such as: sum, average, averageif, countif, sumif, vlookup, xlookup, index match, iferror, eomonth, rank, large, small, round, let, textjoin, date, left, right, mid, trim, unique, filter, or pivot.\n\nTemplate to adapt:\n=IF(condition, value_if_true, value_if_false)\n\nReplace condition, value_if_true and value_if_false with your own test and results. AK Premium does not guess your cell addresses.";
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
  if (t.includes("attachment") || (t.includes("outlook") && t.includes("mail"))) return head + `' AK Premium — Send an Outlook email with an attachment (Outlook must be installed)
Sub EmailWithAttachment()
    Dim ol As Object, mail As Object
    Set ol = CreateObject("Outlook.Application")
    Set mail = ol.CreateItem(0)
    With mail
        .To = "manager@example.com"
        .Subject = "Monthly report"
        .Body = "Please find the report attached."
        .Attachments.Add "C:\\Reports\\report.xlsx"
        .Display
    End With
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
  if (t.includes("import") && t.includes("csv")) return head + `' AK Premium — Import a CSV file into the Data sheet
Sub ImportCsv()
    Dim ws As Worksheet, qt As QueryTable
    Set ws = ThisWorkbook.Worksheets("Data")
    ws.Cells.Clear
    Set qt = ws.QueryTables.Add(Connection:="TEXT;C:\\Reports\\sales.csv", Destination:=ws.Range("A1"))
    With qt
        .TextFileParseType = xlDelimited
        .TextFileCommaDelimiter = True
        .Refresh BackgroundQuery:=False
    End With
    MsgBox "CSV imported.", vbInformation
End Sub`;
  if (t.includes("pivot")) return head + `' AK Premium — Create a PivotTable from Data A1:D100
Sub MakePivotTable()
    Dim src As Range, dest As Range, pc As PivotCache, pt As PivotTable
    Set src = ThisWorkbook.Worksheets("Data").Range("A1:D100")
    Set dest = ThisWorkbook.Worksheets("Pivot").Range("A3")
    Set pc = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=src)
    Set pt = pc.CreatePivotTable(TableDestination:=dest, TableName:="AKPivot")
    With pt
        .PivotFields("A").Orientation = xlRowField
        .AddDataField .PivotFields("C"), "Sum of C", xlSum
    End With
    MsgBox "PivotTable created.", vbInformation
End Sub`;
  if (t.includes("unprotect")) return head + `' AK Premium — Unprotect sheets with a password
Sub UnprotectSheets()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Unprotect Password:="ChangeMe123"
    Next ws
    MsgBox "Sheets unprotected.", vbInformation
End Sub`;
  if (t.includes("protect")) return head + `' AK Premium — Protect all sheets with a password
Sub ProtectSheets()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Protect Password:="ChangeMe123", UserInterfaceOnly:=True
    Next ws
    MsgBox "Sheets protected.", vbInformation
End Sub`;
  if (t.includes("validation") || t.includes("dropdown")) return head + `' AK Premium — Add a dropdown list to B2:B100
Sub AddDropdown()
    With ThisWorkbook.Worksheets("Data").Range("B2:B100").Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, Formula1:="Lahore, Karachi, Islamabad"
        .IgnoreBlank = True
        .InCellDropdown = True
    End With
    MsgBox "Dropdown added.", vbInformation
End Sub`;
  if (t.includes("find") && t.includes("replace")) return head + `' AK Premium — Find and replace across the whole workbook
Sub FindReplaceWorkbook()
    Dim ws As Worksheet, found As Long
    For Each ws In ThisWorkbook.Worksheets
        found = found + ws.Cells.Replace(What:="Old Name", Replacement:="New Name", LookAt:=xlPart, MatchCase:=False)
    Next ws
    MsgBox "Replaced " & found & " occurrence(s).", vbInformation
End Sub`;
  if (t.includes("split") && t.includes("sheet")) return head + `' AK Premium — Split the workbook: one file per sheet
Sub SplitWorkbookBySheet()
    Dim ws As Worksheet, path As String
    path = "C:\\Reports\\Split\\"
    For Each ws In ThisWorkbook.Worksheets
        ws.Copy
        ActiveWorkbook.SaveAs Filename:=path & ws.Name & ".xlsx", FileFormat:=xlOpenXMLWorkbook
        ActiveWorkbook.Close SaveChanges:=False
    Next ws
    MsgBox "Each sheet was saved as its own file.", vbInformation
End Sub`;
  if (t.includes("merge") && (t.includes("workbook") || t.includes("file"))) return head + `' AK Premium — Merge workbooks: combine every .xlsx in a folder
Sub MergeWorkbooks()
    Dim folder As String, fname As String, wb As Workbook, dst As Worksheet
    folder = "C:\\Reports\\Monthly\\"
    Set dst = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
    dst.Name = "Merged"
    fname = Dir(folder & "*.xlsx")
    Do While fname <> ""
        If fname <> ThisWorkbook.Name Then
            Set wb = Workbooks.Open(folder & fname, ReadOnly:=True)
            wb.Worksheets("Data").UsedRange.Copy dst.Cells(dst.Cells(dst.Rows.Count, 1).End(xlUp).Row + 1, 1)
            wb.Close SaveChanges:=False
        End If
        fname = Dir()
    Loop
    MsgBox "Merged files into the Merged sheet.", vbInformation
End Sub`;
  if ((t.includes("copy") && t.includes("filter")) || (t.includes("copy") && t.includes("condition"))) return head + `' AK Premium — Copy rows that meet a condition to another sheet
Sub CopyFilteredRows()
    Dim src As Worksheet, dst As Worksheet, i As Long, lastRow As Long, outRow As Long
    Set src = ThisWorkbook.Worksheets("Data")
    Set dst = ThisWorkbook.Worksheets("Filtered")
    lastRow = src.Cells(src.Rows.Count, "A").End(xlUp).Row
    outRow = 2
    For i = 2 To lastRow
        If src.Cells(i, "A").Value = "Lahore" Then
            src.Rows(i).Copy dst.Rows(outRow)
            outRow = outRow + 1
        End If
    Next i
    MsgBox "Copied " & (outRow - 2) & " matching rows.", vbInformation
End Sub`;
  return head + "No exact VBA intent matched.\n\nTry: userform entry form password automation, sort data, remove duplicates, format report, email report, email with attachment, import CSV, PivotTable, protect or unprotect sheets, dropdown validation, find and replace, split workbook by sheet, merge workbooks, or copy filtered rows.\n\nAK Premium does not run VBA in the browser — paste the generated code into Excel (Alt + F11) and test it on a copy of your workbook first.";
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
  if (t.includes("mom") || t.includes("month on month") || (t.includes("month") && t.includes("growth"))) return head + "MoM Growth % = DIVIDE([Total Sales] - CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date])), CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date])))\n\nExplanation: PREVIOUSMONTH gives last month's value, so the measure shows the percentage change from last month. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("yoy") || t.includes("year on year") || (t.includes("year") && t.includes("growth"))) return head + "YoY Growth % = DIVIDE([Total Sales] - CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Calendar'[Date])), CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Calendar'[Date])))\n\nExplanation: SAMEPERIODLASTYEAR gives the same period last year, so the measure shows the percentage change year on year. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("running") || t.includes("cumulative")) return head + "Running Total = CALCULATE([Total Sales], FILTER(ALL('Calendar'[Date]), 'Calendar'[Date] <= MAX('Calendar'[Date])))\n\nExplanation: FILTER keeps every date up to the current one, so CALCULATE adds the measure from the start to today. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("moving") && t.includes("average")) return head + "3-Month Moving Average = AVERAGEX(DATESINPERIOD('Calendar'[Date], MAX('Calendar'[Date]), -3, MONTH), [Total Sales])\n\nExplanation: DATESINPERIOD gives the last 3 months, and AVERAGEX averages the measure over them. Change -3 to another number of months if you like.";
  if (t.includes("previous") && t.includes("month")) return head + "Previous Month Sales = CALCULATE([Total Sales], PREVIOUSMONTH('Calendar'[Date]))\n\nExplanation: PREVIOUSMONTH shifts the filter to last month. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("mtd") || (t.includes("month") && t.includes("date"))) return head + "MTD Sales = TOTALMTD([Total Sales], 'Calendar'[Date])\n\nExplanation: TOTALMTD adds the measure from the 1st of the current month to the latest date. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("qtd") || (t.includes("quarter") && t.includes("date"))) return head + "QTD Sales = TOTALQTD([Total Sales], 'Calendar'[Date])\n\nExplanation: TOTALQTD adds the measure from the first day of the current quarter to the latest date. Replace Total Sales and 'Calendar'[Date] with your own measure and date column.";
  if (t.includes("rank")) return head + "Sales Rank = RANKX(ALL(Products[Product]), [Total Sales], , DESC, Dense)\n\nExplanation: RANKX ranks each product by Total Sales, largest first. Dense means the next rank after a tie is the next number, with no gap. Replace Products[Product] and Total Sales with your own table, column and measure.";
  if (t.includes("top")) return head + "Top 5 Total = SUMX(TOPN(5, ALL(Products[Product]), [Total Sales]), [Total Sales])\n\nExplanation: TOPN picks the 5 products with the highest Total Sales, and SUMX adds their sales up. Change 5 to another number if you like.";
  if (t.includes("switch")) return head + "Dynamic Measure = SWITCH(SELECTEDVALUE('Measure Picker'[Measure]), \"Sales\", [Total Sales], \"Orders\", [Order Count], BLANK())\n\nExplanation: SWITCH reads the selected label from a Measure Picker table and returns the matching measure, so one visual can switch between Sales and Orders. Replace the labels and measures with your own.";
  if (t.includes("date") && t.includes("table")) return head + "Calendar = CALENDAR(DATE(2024, 1, 1), DATE(2026, 12, 31))\n\nThen add these calculated columns to the Calendar table:\nYear = YEAR('Calendar'[Date])\nMonth Number = MONTH('Calendar'[Date])\nMonth Name = FORMAT('Calendar'[Date], \"MMMM\")\nQuarter = \"Q\" & FORMAT('Calendar'[Date], \"Q\")\n\nExplanation: a date table is needed for the time measures (YTD, MTD, PREVIOUSMONTH). Mark it as the date table in Power BI after creating it.";
  if (t.includes("year") && (t.includes("date") || t.includes("ytd"))) return head + "YTD Sales = TOTALYTD(SUM(Sales[Amount]), 'Date'[Date])\n\nExplanation: TOTALYTD adds Sales Amount from the start of the year to the latest date in the Date table. Replace Sales[Amount] and 'Date'[Date] with your own table and column names.";
  if (t.includes("distinct")) return head + "Distinct Customers = DISTINCTCOUNT(Sales[CustomerID])\n\nExplanation: DISTINCTCOUNT counts each customer once, even if they appear on many rows. Replace Sales[CustomerID] with your own table and column.";
  if (t.includes("average")) return head + "Average Sales = AVERAGE(Sales[Amount])\n\nExplanation: AVERAGE returns the mean of Sales Amount in the current filter context. Replace Sales[Amount] with your own table and column.";
  if (t.includes("count")) return head + "Count Orders = COUNTROWS(Sales)\n\nExplanation: COUNTROWS counts rows in the Sales table in the current filter context. Replace Sales with your own table name.";
  if (t.includes("total") || t.includes("sales")) return head + "Total Sales = SUM(Sales[Amount])\n\nExplanation: SUM adds the Amount column. This is a measure, not a calculated column — use it in a visual or card, and it will respond to slicers and filters. Replace Sales[Amount] with your own table and column.";
  return head + "No exact DAX intent matched.\n\nTry: total sales, average, count, year to date, month on month growth, year on year growth, running total, moving average, previous month, month to date, quarter to date, rank, top 5, switch measure, date table, or distinct count.\n\nTemplate:\nTotal Sales = SUM(Sales[Amount])\n\nReplace Sales and Amount with your own table and column names. AK Premium does not connect to your Power BI model.";
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
  if (!text || text.startsWith("Your generated")) { setError("excelStatus", "Generate an output first, then use Copy."); return; }
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
let _lastQpdfError = null;

function getLastQpdfError() { return _lastQpdfError; }
/* extra: extra message fields for the worker (for example {opts: {...}}
   for Protect). silent: do not show the error in the status line; the
   caller reads getLastQpdfError() instead (batch Unlock). For op "info"
   the promise resolves with the inspection object, not bytes. */

function runQpdf(op, bytes, password, statusId, extra, silent) {
  return new Promise((resolve) => {
    _lastQpdfError = null;
    const fail = (code, message) => { _lastQpdfError = code; if (!silent) setError(statusId, message); resolve(null); };
    let worker;
    try { worker = new Worker("/assets/js/qpdf-worker.js?v=9", { type: "module" }); }
    catch (e) { fail("WORKER_ERROR", "PDF encryption could not start in this browser. Please try Chrome, Edge or Firefox."); return; }
    const timer = setTimeout(() => { try { worker.terminate(); } catch (e) {} fail("TIMEOUT", "PDF encryption is taking too long. Please try a smaller file."); }, 120000);
    worker.onmessage = (e) => {
      clearTimeout(timer); worker.terminate();
      if (e.data && e.data.ok) {
        if (op === "info") resolve(e.data.info || null);
        else resolve(new Uint8Array(e.data.bytes));
      } else {
        const code = e.data && e.data.error;
        if (code === "WRONG_PASSWORD") fail(code, "Wrong password. Please check the password and try again.");
        else if (code === "NOT_ENCRYPTED") fail(code, "This PDF is not password-protected.");
        else if (op === "optimize") fail(code, "Could not compress this PDF (" + code + "). Please check the file.");
        else fail(code, "Could not process this PDF (" + code + "). Please check the file and password.");
      }
    };
    worker.onerror = () => { clearTimeout(timer); fail("WORKER_ERROR", "PDF encryption could not load. Check your connection and try again."); };
    const msg = { op, bytes, password };
    if (extra) Object.assign(msg, extra);
    worker.postMessage(msg, [bytes.buffer]);
  });
}

async function runQpdfInfo(bytes, password, statusId) {
  return runQpdf("info", bytes, password || "", statusId);
}
/* Human-readable permission lists from a qpdf --json capabilities object.
   Missing keys are left out (older files may not report them). */

function formatPdfPermissions(caps) {
  const labels = [
    ["printhigh", "high-quality printing"],
    ["printlow", "low-quality printing"],
    ["extract", "copying text and images"],
    ["modify", "changing the document"],
    ["modifyannotations", "adding comments"],
    ["modifyforms", "filling in forms"],
    ["modifyassembly", "assembling pages"],
    ["modifyother", "other changes"],
    ["accessibility", "screen-reader access"]
  ];
  const allowed = [], locked = [];
  for (const [key, label] of labels) {
    if (caps[key] === true) allowed.push(label);
    else if (caps[key] === false) locked.push(label);
  }
  return { allowed, locked };
}

function pdfEncryptionSummary(p) {
  const bits = p && p.bits ? p.bits : null;
  const r = p && p.R ? p.R : null;
  const method = p && p.method ? p.method : "";
  if (bits && r) return "AES-" + bits + ", revision " + r + (method ? " (" + method + ")" : "");
  if (r) return "Standard PDF encryption, revision " + r;
  return "Standard PDF encryption";
}
/* Last protection check, keyed by file + password, so Unlock can report
   which password opened the file without a second worker round-trip. */
let unlockLastInfo = null;

function inkBBoxFromImageData(imageData) {
  const d = imageData.data || [];
  const w = imageData.width || 0, h = imageData.height || 0;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1 };
}
/* Centred crop box for a target width/height ratio. Pure, unit-testable. */

const REDACT_PATTERNS = {
  email: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
  phone: "(?:\\+92[\\s-]?3\\d{2}[\\s-]?\\d{7}|03\\d{2}[\\s-]?\\d{7}|(?:\\+\\d{1,3}[\\s-]?)?\\(?\\d{2,4}\\)?[\\s-]?\\d{3,4}[\\s-]?\\d{4})",
  cnic: "\\d{5}-\\d{7}-\\d",
  iban: "[A-Z]{2}\\d{2}[A-Z0-9]{11,30}",
  date: "(?:\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})",
};

/* Fonts used in a pdf-lib document: [{name, embedded, standard}]. Embedded
   means the font dictionary has a FontDescriptor with a FontFile, FontFile2
   or FontFile3 stream. The standard 14 fonts are never embedded and are
   reported as standard, not as a failure. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

async function extractPdfImages(file, statusId) {
  if (!(await ensurePdfJs(statusId))) return null;
  const bytes = await readAsArrayBuffer(file);
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  const OPS = window.pdfjsLib.OPS;
  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const opList = await page.getOperatorList();
    const seen = new Set();
    let n = 0;
    for (let i = 0; i < opList.fnArray.length; i++) {
      if (opList.fnArray[i] !== OPS.paintImageXObject) continue;
      const name = opList.argsArray[i][0];
      if (!name || seen.has(name)) continue;
      seen.add(name);
      n++;
      /* Placement: pdf.js splits an image's CTM into separate transform
         ops (translate, scale, identity) between the save and the paint,
         so the nearest transform alone is usually an identity. Compose
         every transform since the last save, in op order, to get the
         image box (e, f, a, d) in PDF points. Kept for Word/PPT
         placement; the older callers (extract-images, markdown) ignore
         it. No save boundary means the transforms cannot be trusted, so
         the place stays null and the image is still extracted. */
      const mulCTM = (m1, m2) => [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
      ];
      let place = null;
      {
        let ctm = [1, 0, 0, 1, 0, 0];
        let found = false, sawSave = false;
        for (let j = i - 1; j >= 0 && j > i - 60; j--) {
          if (opList.fnArray[j] === OPS.save) { sawSave = true; break; }
          if (opList.fnArray[j] === OPS.restore) break;
          if (opList.fnArray[j] === OPS.transform) {
            const t = opList.argsArray[j];
            if (t && t.length >= 6) { ctm = mulCTM(t, ctm); found = true; }
          }
        }
        if (found && sawSave) place = { x: ctm[4], y: ctm[5], w: Math.abs(ctm[0]), h: Math.abs(ctm[3]) };
      }
      const img = await getPdfImageObj(page, name);
      if (!img) continue;
      const blob = await pdfImageToBlob(img);
      if (!blob) continue;
      out.push({ page: p, name: "image-" + p + "-" + n + ".png", blob, place, pageW: vp.width, pageH: vp.height });
    }
  }
  return out;
}
/* Width and height of a PNG or JPEG blob, read from the image header
   bytes (no Image element needed, so it works in jsdom too). Returns
   null when the format is not recognised. */

function imageBlobDimensions(blob) {
  return blob.arrayBuffer().then((buf) => {
    const b = new Uint8Array(buf);
    if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) {
      const w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
      const h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
      return { width: w, height: h };
    }
    if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xFF) { i++; continue; }
        const marker = b[i + 1];
        if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
        const len = (b[i + 2] << 8) | b[i + 3];
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          return { width: (b[i + 7] << 8) | b[i + 8], height: (b[i + 5] << 8) | b[i + 6] };
        }
        i += 2 + len;
      }
    }
    return null;
  }).catch(() => null);
}
/* Blob -> data: URL (for jsPDF addImage). */

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error("Could not read image."));
    fr.readAsDataURL(blob);
  });
}
/* Decode a data URL (image/jpeg or image/png) to raw bytes. */

function dataUrlToBytes(dataUrl) {
  const b64 = (dataUrl.split(",")[1] || "").replace(/\s/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
/* Render one pdf.js page to a canvas at the given scale. Used by Compare
   PDF's visual overlay diff. */

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

function defaultRandInt(n) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n;
  }
  throw new Error("Secure random numbers are not available in this browser.");
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

let organizePages = []; /* [{index (0-based), rotation, blank, split}] */
let organizeSelected = new Set(); /* positions in organizePages, for "Download selected pages" */
let organizeFileKey = ""; /* rebuild the page list only when a new file is picked */
let organizePendingStatus = ""; /* a Done message the re-render applies after it finishes, so it is not overwritten by the "loaded" message */

/* resizeOriginal is shared state for the image-resizer handlers below.
   It lives here in the section preamble (which splits to core.js) rather
   than next to the resizer code: the resizer chunk on its own page would
   otherwise have no declaration and the assignment would silently create
   an implicit global. */
let resizeOriginal = null;

/* ---------- Phase 1 handlers: Image ---------- */

function imgCompressFormatNote(format) {
  if (format === "jpeg") return "JPEG output flattens transparency.";
  if (format === "png") return "PNG keeps transparency but may stay large.";
  if (format === "avif") return "AVIF is the smallest at good quality, but some older browsers and apps cannot open it.";
  return "WebP keeps good quality at small sizes.";
}

function canvasSupportsAvif() {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/avif").indexOf("data:image/avif") === 0;
  } catch (e) { return false; }
}

/* Build the exact text a QR code must hold for its type. Wi-Fi follows
   the WIFI:T:S:P:H format, vCard is a 3.0 card, email is a mailto link,
   SMS is SMSTO:number:message, phone is tel:, location is geo:lat,lng,
   and payment takes the link or detail exactly as typed, because payment
   QR formats differ by app. Returns {payload} or {error}. */

/* ---------- Phase 1 handlers: Developer ---------- */

function findDuplicateKeys(text) {
  /* Lenient scan of raw JSON text for the same key twice in one object.
     Returns [{key, path, line}]. Works even when the JSON is broken. */
  const dups = [];
  let i = 0, line = 1;
  const n = text.length;
  function skipWs() { while (i < n && /\s/.test(text[i])) { if (text[i] === "\n") line++; i++; } }
  function parseString() {
    let out = "";
    i++;
    while (i < n) {
      const c = text[i];
      if (c === "\\") { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === '"') { i++; return out; }
      if (c === "\n") line++;
      out += c; i++;
    }
    return out;
  }
  function parseValue(path) {
    skipWs();
    if (i >= n) return;
    const c = text[i];
    if (c === "{") { i++; parseObject(path); }
    else if (c === "[") { i++; parseArray(path); }
    else if (c === '"') { parseString(); }
    else { while (i < n && !/[,\]}]/.test(text[i])) { if (text[i] === "\n") line++; i++; } }
  }
  function parseObject(path) {
    const seen = {};
    skipWs();
    if (text[i] === "}") { i++; return; }
    while (i < n) {
      skipWs();
      if (text[i] === "}") { i++; return; }
      if (text[i] !== '"') { i++; continue; }
      const keyLine = line;
      const key = parseString();
      skipWs();
      if (text[i] === ":") i++;
      if (seen[key]) dups.push({ key, path: path ? path + "." + key : key, line: keyLine });
      else seen[key] = true;
      parseValue(path ? path + "." + key : key);
      skipWs();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "}") { i++; return; }
      if (i >= n) return;
    }
  }
  function parseArray(path) {
    let idx = 0;
    skipWs();
    if (text[i] === "]") { i++; return; }
    while (i < n) {
      parseValue(path + "[" + idx + "]");
      idx++;
      skipWs();
      if (text[i] === ",") { i++; continue; }
      if (text[i] === "]") { i++; return; }
      if (i >= n) return;
    }
  }
  parseValue("");
  return dups;
}

function sortJsonKeys(value) {
  if (Array.isArray(value)) return value.map(sortJsonKeys);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).sort().forEach((k) => { out[k] = sortJsonKeys(value[k]); });
    return out;
  }
  return value;
}

function jsonTreeHtml(value, depth) {
  depth = depth || 0;
  if (depth > 50) return "<span>…</span>";
  if (value === null) return "<span>null</span>";
  if (typeof value === "object") {
    const isArr = Array.isArray(value);
    const entries = isArr ? value.map((v, i) => [i, v]) : Object.keys(value).map((k) => [k, value[k]]);
    if (!entries.length) return escapeHtml(isArr ? "[]" : "{}");
    const inner = entries.map(([k, v]) => {
      const label = isArr ? escapeHtml(String(k)) : escapeHtml(JSON.stringify(k));
      return "<li><strong>" + label + "</strong>: " + jsonTreeHtml(v, depth + 1) + "</li>";
    }).join("");
    const head = isArr ? "Array (" + entries.length + ")" : "Object (" + entries.length + ")";
    return "<details open><summary>" + escapeHtml(head) + "</summary><ul>" + inner + "</ul></details>";
  }
  if (typeof value === "string") return "<span>\"" + escapeHtml(value) + "\"</span>";
  if (typeof value === "number") return "<span>" + value + "</span>";
  if (typeof value === "boolean") return "<span>" + value + "</span>";
  return escapeHtml(String(value));
}

function jsonDupNote(text) {
  const dups = findDuplicateKeys(text);
  if (!dups.length) return "";
  return " Warning: duplicate keys found — " + dups.slice(0, 5).map((d) => d.path + " (line " + d.line + ")").join(", ") + (dups.length > 5 ? " and " + (dups.length - 5) + " more" : "") + ". The last value wins when this is parsed.";
}

/* ---------- Phase 2 tools: pure logic (testable) ---------- */

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
/* Amortisation schedule shared by the loan/EMI and mortgage calculators.
   extraMonthly is added to the principal part every month; lumpSum is paid
   in month 1. The base EMI is the same emiCalc() value the old handlers
   used, so results match the previous calculator. Returns {error} on bad
   input, otherwise {emi, months, yearly, totalInterest, totalPaid,
   monthsCount, interestSaved, monthsCut, payoffMonth}. */

function buildAmortisation(principal, annualRatePct, years, extraMonthly, lumpSum) {
  const base = emiCalc(principal, annualRatePct, years);
  if (base.error) return { error: base.error };
  const n = base.months;
  const r = annualRatePct / 1200;
  const emi = base.emi;
  const extra = Math.max(0, extraMonthly || 0);
  const lump = Math.max(0, lumpSum || 0);
  let balance = principal;
  const months = [];
  let totalInterest = 0, m = 0;
  while (balance > 0.005 && m < n * 2 + 60) {
    m++;
    const interest = Math.round(balance * r * 100) / 100;
    let principalPart = emi - interest + extra;
    if (m === 1) principalPart += lump;
    let paid = emi + extra + (m === 1 ? lump : 0);
    if (principalPart >= balance) {
      principalPart = balance;
      paid = Math.round((balance + interest) * 100) / 100;
    }
    if (principalPart <= 0) return { error: "This loan would never be repaid at that rate and payment. Try a higher amount or lower rate." };
    balance = Math.round((balance - principalPart) * 100) / 100;
    totalInterest = Math.round((totalInterest + interest) * 100) / 100;
    months.push({ m, emi: Math.round(paid * 100) / 100, principal: Math.round(principalPart * 100) / 100, interest, balance: Math.max(0, balance) });
    if (balance <= 0.005) break;
  }
  const totalPaid = Math.round(months.reduce((s, x) => s + x.emi, 0) * 100) / 100;
  const yearly = [];
  months.forEach((x) => {
    const y = Math.ceil(x.m / 12);
    if (!yearly[y - 1]) yearly[y - 1] = { year: y, principal: 0, interest: 0, balance: 0 };
    yearly[y - 1].principal = Math.round((yearly[y - 1].principal + x.principal) * 100) / 100;
    yearly[y - 1].interest = Math.round((yearly[y - 1].interest + x.interest) * 100) / 100;
    yearly[y - 1].balance = x.balance;
  });
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + months.length);
  return {
    emi, months, yearly, totalInterest, totalPaid, monthsCount: months.length,
    interestSaved: Math.round((base.interest - totalInterest) * 100) / 100,
    monthsCut: n - months.length,
    payoffMonth: payoff.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  };
}

function amortisationCsv(sched) {
  const lines = ["Month,Payment,Principal,Interest,Balance"];
  sched.months.forEach((x) => lines.push([x.m, x.emi.toFixed(2), x.principal.toFixed(2), x.interest.toFixed(2), x.balance.toFixed(2)].join(",")));
  return lines.join("\n");
}

function amortisationMonthTable(sched) {
  const rows = sched.months.map((x) => "<tr><td>" + x.m + "</td><td>" + fmtMoney(x.emi, 2) + "</td><td>" + fmtMoney(x.principal, 2) + "</td><td>" + fmtMoney(x.interest, 2) + "</td><td>" + fmtMoney(x.balance, 2) + "</td></tr>").join("");
  return "<table><thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

function amortisationYearlyTable(sched) {
  const rows = sched.yearly.map((y) => "<tr><td>Year " + y.year + "</td><td>" + fmtMoney(y.principal, 2) + "</td><td>" + fmtMoney(y.interest, 2) + "</td><td>" + fmtMoney(y.balance, 2) + "</td></tr>").join("");
  return "<table><thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr></thead><tbody>" + rows + "</tbody></table>";
}

function amortisationChart(sched) {
  /* Plain CSS stacked bars, one per year: indigo = principal, amber = interest. */
  const rows = sched.yearly.map((y) => {
    const tot = y.principal + y.interest;
    const pp = tot > 0 ? Math.round(y.principal / tot * 100) : 0;
    return "<div style=\"margin:6px 0\"><div>Year " + y.year + " — principal " + fmtMoney(y.principal, 2) + ", interest " + fmtMoney(y.interest, 2) + "</div>"
      + "<div style=\"display:flex;height:18px;border-radius:4px;overflow:hidden\" role=\"img\" aria-label=\"Year " + y.year + ": " + pp + "% principal, " + (100 - pp) + "% interest\">"
      + "<div style=\"width:" + pp + "%;background:#4f46e5\"></div>"
      + "<div style=\"width:" + (100 - pp) + "%;background:#f59e0b\"></div></div></div>";
  }).join("");
  return "<p>Interest vs principal per year (indigo = principal, amber = interest).</p>" + rows;
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

let paletteLast = null;

/* ---------- Phase 3.3: calculators recalculate live while typing ---------- */
const LIVE_CALCS = [
  { btn: "ageBtn", inputs: ["ageDob"] },
  { btn: "percentBtn", inputs: ["percentX", "percentY"], selects: ["percentMode"] },
  { btn: "bmiBtn", inputs: ["bmiHeight", "bmiWeight", "bmiFeet", "bmiInches", "bmiLb", "bmiWaist", "bmiAge"], selects: ["bmiMode", "bmiUnit", "bmiSex"], bmi: true },
  { btn: "emiBtn", inputs: ["emiPrincipal", "emiRate", "emiYears"] },
  { btn: "cgpaBtn", inputs: ["cgpaInput"], cgpa: true },
  { btn: "landBtn", inputs: ["landValue", "landLength", "landWidth", "landRate", "landCustomMarla"], selects: ["landFrom", "landMarla"] },
  { btn: "taxBtn", inputs: ["taxMonthly"], selects: ["taxYear"] },
  { btn: "zakatBtn", inputs: ["zakatCash", "zakatDebts", "zakatGold", "zakatGoldRate", "zakatSilver", "zakatSilverRate", "zakatNisab", "zakatTrade", "zakatShares", "zakatForex", "zakatForexRate", "zakatLoans", "zakatFxRate"], zakat: true },
  { btn: "amountWordsBtn", inputs: ["amountWordsInput"] },
  { btn: "urduCounterBtn", inputs: ["urduCounterInput"] },
  { btn: "meritBtn", inputs: ["meritObtained1", "meritTotal1", "meritWeight1", "meritObtained2", "meritTotal2", "meritWeight2", "meritObtained3", "meritTotal3", "meritWeight3", "meritObtained4", "meritTotal4", "meritWeight4", "meritObtained5", "meritTotal5", "meritWeight5"], merit: true },
  { btn: "unitBtn", inputs: ["unitValue"], selects: ["unitFrom", "unitTo"] },
  { btn: "discBtn", inputs: ["discPrice", "discPct"] },
  { btn: "ciBtn", inputs: ["ciPrincipal", "ciRate", "ciYears"], selects: ["ciFreq"] },
  { btn: "mortBtn", inputs: ["mortPrincipal", "mortRate", "mortYears"] },
  { btn: "tipBtn", inputs: ["tipBill", "tipPct", "tipPeople"] },
  { btn: "tzBtn", inputs: ["tzDate", "tzTime"], selects: ["tzFrom", "tzTo"] },
  { btn: "ddBtn", inputs: ["ddFrom", "ddTo"] },
  { btn: "tdeeBtn", inputs: ["tdeeAge", "tdeeHeight", "tdeeWeight", "tdeeFeet", "tdeeInches", "tdeeLb", "tdeeBodyFat"], selects: ["tdeeSex", "tdeeActivity", "tdeeUnit", "tdeeGoal", "tdeeMacro"] },
  { btn: "frBtn", inputs: ["frNum1", "frDen1", "frNum2", "frDen2"], selects: ["frOp"] },
  { btn: "loremBtn", inputs: [], selects: ["loremUnit", "loremCount"] },
  { btn: "dedupeBtn", inputs: ["dedupeInput"] },
  { btn: "sortBtn", inputs: ["sortInput"], selects: ["sortOrder"] },
  { btn: "readBtn", inputs: ["readInput"] },
  { btn: "wfBtn", inputs: ["wfInput"], selects: ["wfTop"] }
];
LIVE_CALCS.forEach((c) => {
  const btn = $(c.btn); if (!btn) return;
  const fields = c.inputs.map((id) => $(id)).filter(Boolean);
  const selects = (c.selects || []).map((id) => $(id)).filter(Boolean);
  const num = (id) => parseFloat(($(id) || {}).value || "") || 0;
  const ready = () => {
    if (c.zakat) {
      const fx = (($("zakatCurrency") || {}).value || "pkr") === "usd" ? (num("zakatFxRate") || 0) : 1;
      const wealth = (num("zakatCash") + num("zakatTrade") + num("zakatShares") + num("zakatForex") * num("zakatForexRate") + num("zakatLoans")) * fx + num("zakatGold") * num("zakatGoldRate") + num("zakatSilver") * num("zakatSilverRate");
      return wealth > 0 && (num("zakatGoldRate") > 0 || num("zakatSilverRate") > 0 || num("zakatNisab") > 0);
    }
    if (c.merit) {
      let sum = 0, rows = 0;
      for (let i = 1; i <= 5; i++) {
        if (num("meritTotal" + i) > 0 && num("meritWeight" + i) > 0) { sum += num("meritWeight" + i); rows++; }
      }
      return rows > 0 && Math.abs(sum - 100) < 0.01;
    }
    if (c.cgpa) {
      const lines = String(($(c.inputs[0]) || {}).value || "").split("\n").map((s) => s.trim()).filter(Boolean);
      return lines.length > 0 && lines.every((l) => l.split(",").length === 3 || l.split(",").length === 4);
    }
    if (c.bmi) {
      const mode = ($("bmiMode") || {}).value || "adult";
      const unit = ($("bmiUnit") || {}).value || "metric";
      const metricOk = num("bmiHeight") > 0 && num("bmiWeight") > 0;
      const imperialOk = num("bmiLb") > 0 && (num("bmiFeet") > 0 || num("bmiInches") > 0);
      const sizeOk = unit === "imperial" ? imperialOk : metricOk;
      if (mode === "child") return sizeOk && num("bmiAge") >= 5 && num("bmiAge") <= 19;
      return sizeOk;
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
    { out: "ageOutput", inputs: ["ageDob", "ageOnDate"] },
    { out: "percentOutput", inputs: ["percentX", "percentY"], selects: ["percentMode"] },
    { out: "bmiOutput", inputs: ["bmiHeight", "bmiWeight", "bmiFeet", "bmiInches", "bmiLb", "bmiWaist", "bmiAge"], selects: ["bmiMode", "bmiUnit", "bmiSex"] },
    { out: "emiOutput", inputs: ["emiPrincipal", "emiRate", "emiYears"] },
    { out: "cgpaOutput", inputs: ["cgpaInput", "cgpaTarget", "cgpaRemaining"], selects: ["cgpaScale"] },
    { out: "landOutput", inputs: ["landValue", "landLength", "landWidth", "landRate", "landCustomMarla"], selects: ["landFrom", "landMarla"] },
    { out: "taxOutput", inputs: ["taxMonthly"], selects: ["taxYear"] },
    { out: "zakatOutput", inputs: ["zakatCash", "zakatDebts", "zakatGold", "zakatGoldRate", "zakatSilver", "zakatSilverRate", "zakatNisab", "zakatTrade", "zakatShares", "zakatForex", "zakatForexRate", "zakatLoans", "zakatFxRate", "zakatHawlDate"], selects: ["zakatCurrency", "zakatNisabMode"] },
    { out: "amountWordsOutput", inputs: ["amountWordsInput"] },
    { out: "urduCounterOutput", inputs: ["urduCounterInput"] },
    { out: "meritOutput", inputs: ["meritObtained1", "meritTotal1", "meritWeight1", "meritObtained2", "meritTotal2", "meritWeight2", "meritObtained3", "meritTotal3", "meritWeight3", "meritObtained4", "meritTotal4", "meritWeight4", "meritObtained5", "meritTotal5", "meritWeight5"] },
    { out: "unitOutput", inputs: ["unitValue"], selects: ["unitType", "unitFrom", "unitTo"] },
    { out: "discOutput", inputs: ["discPrice", "discPct", "discPct2", "discTaxRate", "discDelivery", "discSalePrice"], selects: ["discMode"] },
    { out: "ciOutput", inputs: ["ciPrincipal", "ciRate", "ciYears", "ciDeposit", "ciInflation", "ciRate2"], selects: ["ciFreq"] },
    { out: "mortOutput", inputs: ["mortPrincipal", "mortRate", "mortYears"] },
    { out: "tipOutput", inputs: ["tipBill", "tipPct", "tipPeople", "tipTax", "tipService", "tipItems"], selects: ["tipRound"] },
    { out: "tzOutput", inputs: ["tzDate", "tzTime"], selects: ["tzFrom", "tzTo"] },
    { out: "ddOutput", inputs: ["ddFrom", "ddTo"] },
    { out: "tdeeOutput", inputs: ["tdeeAge", "tdeeHeight", "tdeeWeight", "tdeeFeet", "tdeeInches", "tdeeLb", "tdeeBodyFat"], selects: ["tdeeSex", "tdeeActivity", "tdeeUnit", "tdeeGoal", "tdeeMacro"] },
    { out: "sciOutput", inputs: ["sciDisplay"] },
    { out: "frOutput", inputs: ["frNum1", "frDen1", "frNum2", "frDen2", "frWhole1", "frWhole2", "frNum3", "frDen3", "frWhole3"], selects: ["frOp"] }
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
      (c.selects || []).forEach((id) => { const el = $(id); if (el && params.has(id)) { el.value = params.get(id); filled = true; el.dispatchEvent(new Event("change")); } });
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
    // Merge PDF keeps its own list (mergeOrder) and clears the file input
    // after each pick, so input.files is empty even when files are listed.
    // The gate would disable the Merge button after every pick and reorder
    // (it runs before the merge handler, because core.js loads first); the
    // merge handler manages the button from mergeOrder instead, and the
    // merge click handler already guards "at least two files".
    if (btn.id === "mergePdfBtn") return;
    // Create PDF's image input is optional and PDF Forms' file input belongs
    // to the *fill* section, not to the builder: gating their primary buttons
    // on a file would block the no-file flows (create with text only, build
    // a blank form). Both handlers guard their own missing input instead.
    // HTML to PDF is the same: pasting HTML needs no file, so its button
    // must not be gated on the optional file input either. CSV to Excel is
    // the same again: pasted CSV text needs no file, so its button must not
    // be gated either (the handler guards "no file and no pasted text").
    // QR Code Generator's logo input and Color Palette's image input are
    // optional too: the code is made from typed text, and a palette from a
    // picked colour, so their buttons must not wait for a file either.
    // Invoice Generator's logo input and JSON load file are optional too:
    // the invoice is built from typed fields, so its PDF button must not
    // wait for a file either. Resume Builder's JSON load file is the same:
    // the resume is built from typed fields, so its PDF button must not
    // wait for a file either. Both handlers guard their own required
    // fields instead.
    if (btn.id === "createPdfBtn" || btn.id === "formsPdfBtn" || btn.id === "htmlToPdfBtn" || btn.id === "csvExcelBtn" || btn.id === "qrBtn" || btn.id === "paletteBtn" || btn.id === "invoicePdfBtn" || btn.id === "resumeBtn") return;
    const update = () => { btn.disabled = !(fileInput.files && fileInput.files.length); };
    fileInput.addEventListener("change", update);
    update();
  });
})();

/* The tool's main action (first .btn-primary in each workspace) sticks to
   the bottom of the screen on phones, above the safe area (see styles.css).
   Only one button per workspace gets the class, so two-button tools never
   stack. */

/* ---------- Phase 3.2: sticky primary button on mobile ---------- */

(function initStickyPrimary() {
  document.querySelectorAll(".workspace-tool").forEach((ws) => {
    const btn = ws.querySelector(".btn-primary");
    if (btn) btn.classList.add("sticky-primary");
  });
})();

/* Runs for every file input on the page. For a PDF it renders page 1 with pdf.js,
   plus name, size and page count, so the user can confirm it is the right document
   before pressing Convert. For an image it shows a thumbnail. Files stay in the
   browser; nothing is uploaded. If a PDF cannot be rendered (for example it is
   password-protected), the name and size are still shown instead of failing. */

/* ---------- File preview: show the chosen file before converting ---------- */

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

function initWizard(prefix, tasks, outId, statusId, opts) {
  const taskSel = $(prefix + "Task"), fieldsEl = $(prefix + "Fields"), btn = $(prefix + "Btn");
  if (!taskSel || !fieldsEl || !btn) return;
  function renderFields() {
    const t = tasks[taskSel.value]; if (!t) return;
    fieldsEl.innerHTML = t.fields.map((f) => wizardField("w_" + prefix + "_" + f[0], f[1], f[2])).join("");
  }
  taskSel.addEventListener("change", renderFields); renderFields();
  btn.addEventListener("click", async () => {
    const t = tasks[taskSel.value]; if (!t) return;
    const v = {};
    for (const f of t.fields) { const el = $("w_" + prefix + "_" + f[0]); v[f[0]] = el ? el.value.trim() : ""; if (!v[f[0]] && !f[3]) { setError(statusId, "Please fill in: " + f[1] + "."); return; } }
    const formula = t.build(v);
    let validation = "";
    if (opts && typeof opts.validate === "function") {
      try { validation = "\n\nValidation: " + await opts.validate(formula, statusId); } catch (e) { validation = "\n\nValidation: could not be checked (" + (e && e.message ? e.message : "unknown error") + ")."; }
    }
    const out = $(outId);
    /* Formula/DAX explains are functions of the values; VBA explains are
       plain strings. Support both, or the VBA/DAX Generate button throws. */
    const explainText = typeof t.explain === "function" ? t.explain(v) : t.explain;
    if (out) out.textContent = "AK Premium - " + t.name + "\n\n" + formula + "\n\nWhat it does: " + explainText + "\n\nExample: " + t.example + validation + "\n\nTest it on a copy of your data first.";
    setStatus(statusId, "Done. Your formula is ready above.");
  });
}
/* Formula validation (formula-generator): brackets balance + known
   functions, checked with fast-formula-parser when it loads. The parser
   does not implement every Excel function (LET, XLOOKUP and RANK are
   examples), so a "not implemented" error is NOT treated as a bad
   formula: the function names are then checked against the known list
   below instead. Without the library, only brackets and function names
   are checked, and the result says so honestly. */
const KNOWN_EXCEL_FUNCTIONS = new Set(("ABS ACCRINT ACOS ACOSH ACOT ACOTH ADDRESS AGGREGATE AMORDEGRC AMORLINC AND ARABIC AREAS ASC ASIN ASINH ATAN ATAN2 ATANH AVEDEV AVERAGE AVERAGEA AVERAGEIF AVERAGEIFS BAHTTEXT BASE BESSELI BESSELJ BESSELK BESSELY BETA.DIST BETA.INV BINOM.DIST BINOM.DIST.RANGE BINOM.INV BITAND BITLSHIFT BITOR BITRSHIFT BITXOR CALL CEILING CEILING.MATH CEILING.PRECISE CELL CHAR CHISQ.DIST CHISQ.DIST.RT CHISQ.INV CHISQ.INV.RT CHISQ.TEST CHOOSE CLEAN CODE COLUMN COLUMNS COMBIN COMBINA COMPLEX CONCAT CONCATENATE CONFIDENCE.NORM CONFIDENCE.T CONVERT CORREL COS COSH COT COTH COUNT COUNTA COUNTBLANK COUNTIF COUNTIFS COUPON COUPONDAYBS COUPONDAYS COUPONDAYSNC COUPONNCD COUPONNUM COUPONPCD COVAR COVAR.P COVAR.S CRITBINOM CUBEKPIMEMBER CUBEMEMBER CUBEVALUE CUBESET CUBESETCOUNT CUBERANKEDMEMBER CUMIPMT CUMPRINC DATE DATEDIF DATEVALUE DAVERAGE DAY DAYS DAYS360 DB DBCS DCOUNT DCOUNTA DDB DECIMAL DEGREES DELTA DEVSQ DGET DMAX DMIN DOLLAR DOLLARDE DOLLARFR DPRODUCT DSTDEV DSTDEVP DSUM DURATION DVAR DVARP EDATE EFFECT ENCODEURL EOMONTH ERF ERF.PRECISE ERFC ERFC.PRECISE ERROR.TYPE EUROCONVERT EVEN EXACT EXP EXPON.DIST F.DIST F.DIST.RT F.INV F.INV.RT F.TEST FACT FACTDOUBLE FALSE FDIST FILTER FILTERXML FIND FINDB FISHER FISHERINV FIXED FLOOR FLOOR.MATH FLOOR.PRECISE FORECAST FORECAST.ETS FORECAST.LINEAR FORMULATEXT FREQUENCY FTEST FV FVSCHEDULE GAMMA GAMMA.DIST GAMMA.INV GAMMALN GAMMALN.PRECISE GCD GEOMEAN GESTEP GETPIVOTDATA GROWTH HARMEAN HEX2BIN HEX2DEC HEX2OCT HLOOKUP HOUR HYPERLINK HYPGEOM.DIST IF IFERROR IFNA IFS IMABS IMAGINARY IMARGUMENT IMCONJUGATE IMCOS IMCOSH IMCOT IMDIV IMEXP IMLN IMLOG10 IMLOG2 IMPOWER IMPRODUCT IMREAL IMSEC IMSECH IMSIN IMSINH IMSQRT IMSUB IMSUM IMTAN INDEX INDIRECT INFO INT INTERCEPT INTRATE IPMT IRR ISBLANK ISERR ISERROR ISEVEN ISFORMULA ISLOGICAL ISNA ISNONTEXT ISNUMBER ISODD ISOWEEKNUM ISPMT ISREF ISTEXT ISTHAIDIGIT JIS KURT LARGE LCM LEFT LEN LET LINEST LN LOG LOG10 LOGEST LOGNORM.DIST LOGNORM.INV LOOKUP LOWER MDETERM MDURATION MEDIAN MID MIDB MIN MINA MINIFS MINUTE MIRR MODE MODE.MULT MODE.SNGL MONTH MROUND MULTINOMIAL MUNIT N NA NEGBINOM.DIST NETWORKDAYS NETWORKDAYS.INTL NOMINAL NORM.DIST NORM.INV NORM.S.DIST NORM.S.INV NOT NOW NPER NPV NUMBERVALUE OCT2BIN OCT2DEC OCT2HEX ODD ODDFPRICE ODDLYIELD OFFSET OR PDURATION PEARSON PERCENTILE PERCENTILE.EXC PERCENTILE.INC PERCENTRANK PERCENTRANK.EXC PERCENTRANK.INC PERMUT PERMUTATIONA PHONETIC PI PMT POISSON.DIST POWER PPMT PRICE PRICEDISC PRICEMAT PROB PRODUCT PROPER PV QUARTILE QUARTILE.EXC QUARTILE.INC QUOTIENT RADIANS RAND RANDBETWEEN RANK RANK.AVG RANK.EQ RATE RECEIVED REPLACE REPLACEB REPT RIGHT RIGHTB ROMAN ROUND ROUNDDOWN ROUNDUP ROW ROWS RRI RSQ RTD SEARCH SEARCHB SECOND SEQUENCE SERIESSUM SHEET SHEETS SIGN SIN SINH SKEW SKEW.P SLN SLOPE SMALL SORT SORTBY SQRT SQRTPI STANDARDIZE STDEV STDEV.P STDEV.S STDEVA STDEVPA STEYX SUBSTITUTE SUBTOTAL SUM SUMIF SUMIFS SUMPRODUCT SUMSQ SUMX2MY2 SUMX2PY2 SUMXMY2 SWITCH SYD T TAN TANH TBILLEQ TBILLPRICE TBILLYIELD TEXT TEXTJOIN TIME TIMEVALUE TODAY TRANSPOSE TREND TRIM TRIMMEAN TRUE TRUNC TYPE UNICHAR UNICODE UNIQUE UPPER VALUE VAR VAR.P VAR.S VARA VARPA VDB VLOOKUP WEBSERVICE WEEKDAY WEEKNUM WORKDAY WORKDAY.INTL XIRR XLOOKUP XMATCH XNPV XOR YEAR YEARFRAC YIELD YIELDDISC YIELDMAT Z.TEST").split(" "));

/* Land converter: 1 Kanal = 20 Marla = 5,445 sq ft; 1 Acre = 8 Kanal = 43,560 sq ft; 1 Marla = 272.25 sq ft (revenue marla). */
const LAND_UNITS = { marla: 272.25, kanal: 5445, acre: 43560, sqft: 1, sqyd: 9, sqm: 10.7639 };
// Which marla size the user picked: the revenue marla (272.25 sq ft, used in
// land records and most of Khyber Pakhtunkhwa), the housing-society marla
// (225 sq ft, used by DHA, Bahria and most schemes), 250 sq ft in some
// schemes, or a size the user types. There is no single provincial marla:
// Sindh mostly sells land in square yards, not marla.

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
  const scales = [[100000000000, "kharab"], [1000000000, "arab"], [1000000, "million"], [1000, "thousand"], [100, "hundred"]];
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
  const scales = [[100000000000, "کھرب"], [1000000000, "ارب"], [10000000, "کروڑ"], [100000, "لاکھ"], [1000, "ہزار"], [100, "سو"]];
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
  // Anonymous error counter (Phase 4.5): how often any page throws, so a
  // broken tool is noticed. Only a count is stored, never a message, file
  // name or user data.
  window.addEventListener("error", function () {
    try {
      var n = parseInt(localStorage.getItem("ak-error-count") || "0", 10) || 0;
      localStorage.setItem("ak-error-count", String(n + 1));
    } catch (e) {}
  });
  // Status lines announce results to screen readers.
  document.querySelectorAll(".workspace-tool .status").forEach(function (s) {
    if (!s.hasAttribute("aria-live")) s.setAttribute("aria-live", "polite");
  });
})();
