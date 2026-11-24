/* AK Premium v12 — image-to-text (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Image ---------- */

function ocrDarkPixels(imageData, threshold) {
  const d = imageData.data, n = imageData.width * imageData.height, out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    out[i] = l < threshold ? 1 : 0;
  }
  return out;
}

/* Map a Tesseract OSD script name to a language code. Tesseract's detect
   returns script names such as "Latin" or "Arabic"; the OCR languages this
   tool offers are English, Urdu and Arabic. Pure, no ids. */

function osdScriptToLang(script) {
  if (!script) return "eng";
  const s = String(script).toLowerCase();
  if (s.indexOf("arabic") >= 0) return "ara";
  if (s.indexOf("devanagari") >= 0) return "hin";
  if (s.indexOf("cyrillic") >= 0) return "rus";
  if (s.indexOf("han") >= 0 || s.indexOf("hiragana") >= 0 || s.indexOf("katakana") >= 0) return "chi_sim";
  if (s.indexOf("hangul") >= 0) return "kor";
  return "eng";
}

/* Preprocess an image for OCR: auto-rotate from EXIF, deskew from the
   dark-pixel angle, greyscale + contrast, and upscale small images so
   Tesseract sees larger glyphs. Returns {canvas}. Deskew is best effort. */

async function ocrPreprocessCanvas(img, file, opts) {
  const o = Object.assign({ autoRotate: true, deskew: true }, opts || {});
  let canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
  canvas.getContext("2d").drawImage(img, 0, 0);
  if (o.autoRotate && file) {
    const orientation = await exifOrientationOfFile(file);
    if (orientation > 1) canvas = orientedImageCanvas(canvas, orientation);
  }
  if (o.deskew) {
    try {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
      const angle = deskewBestAngle(ocrDarkPixels(data, 160), canvas.width, canvas.height);
      if (angle && Math.abs(angle) >= 0.5) canvas = renderArbitraryRotatedImage(canvas, -angle, false, false);
    } catch (e) { /* deskew is a best effort; continue with the unrotated image */ }
  }
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const grey = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, Math.round((grey - 128) * 1.4 + 128)));
    d[i] = v; d[i + 1] = v; d[i + 2] = v;
  }
  ctx.putImageData(data, 0, 0);
  if (canvas.width < 1200) {
    const scale = Math.min(2, 1200 / canvas.width);
    const up = document.createElement("canvas");
    up.width = Math.round(canvas.width * scale); up.height = Math.round(canvas.height * scale);
    up.getContext("2d").drawImage(canvas, 0, 0, up.width, up.height);
    canvas = up;
  }
  return { canvas: canvas };
}

/* Render Tesseract word results into a container: each word is a span with
   its confidence; low-confidence words (below 60) get a highlight class. */

function renderOcrWords(words, container) {
  container.innerHTML = "";
  (words || []).forEach((wd) => {
    const s = document.createElement("span");
    s.className = "ocr-word" + ((typeof wd.confidence === "number" && wd.confidence < 60) ? " ocr-word-low" : "");
    s.textContent = wd.text;
    s.title = "Confidence " + Math.round(wd.confidence || 0) + "%";
    container.appendChild(s);
    container.appendChild(document.createTextNode(" "));
  });
}

/* Plain text from Tesseract word results. With line breaks, words are
   grouped into lines by their bounding boxes. */

function ocrWordsToText(words, withBreaks) {
  const ws = (words || []).slice();
  if (!withBreaks) return ws.map((w) => w.text).join(" ");
  ws.sort((a, b) => {
    const ay = a.bbox ? a.bbox.y0 : 0, by = b.bbox ? b.bbox.y0 : 0;
    if (Math.abs(ay - by) > 5) return ay - by;
    return (a.bbox ? a.bbox.x0 : 0) - (b.bbox ? b.bbox.x0 : 0);
  });
  const lines = [];
  let cur = null, curBottom = -1;
  for (const w of ws) {
    const y0 = w.bbox ? w.bbox.y0 : 0, y1 = w.bbox ? w.bbox.y1 : 0;
    if (!cur || y0 > curBottom) { cur = []; lines.push(cur); curBottom = y1; }
    else if (y1 > curBottom) curBottom = y1;
    cur.push(w.text);
  }
  return lines.map((l) => l.join(" ")).join("\n");
}

const ocrBtn = $("ocrBtn");
let ocrLastWords = [];
if (ocrBtn) ocrBtn.addEventListener("click", async () => {
  const file = ($("ocrInput").files || [])[0];
  if (!file) { setError("ocrStatus", "Please select an image first."); return; }
  if (!checkFileSize(file, "ocrStatus")) return;
  if (!window.Tesseract) { setError("ocrStatus", "OCR library (Tesseract.js) did not load. Check your connection and try again."); return; }
  setStatus("ocrStatus", "Preparing the image...");
  try {
    const img = await loadImageFromFile(file);
    const prep = await ocrPreprocessCanvas(img, file, { autoRotate: true, deskew: true });
    let lang = $("ocrLang") ? $("ocrLang").value : "eng";
    if (lang === "auto") {
      try {
        const det = await window.Tesseract.detect(prep.canvas);
        const script = det && det.data && (det.data.script || (det.data.osd && det.data.osd.script));
        lang = osdScriptToLang(script);
        setStatus("ocrStatus", "Detected " + (script || "Latin") + " text. Reading...");
      } catch (e) { lang = "eng"; }
    }
    setStatus("ocrStatus", "Working... first run downloads language data and may take time.");
    const result = await window.Tesseract.recognize(prep.canvas, lang, {
      logger: (m) => { if (m && m.status === "recognizing text" && typeof m.progress === "number") { setStatus("ocrStatus", "Working... " + Math.round(m.progress * 100) + "%."); setProgress("ocrProgress", Math.round(m.progress * 100)); } }
    });
    setProgress("ocrProgress", 100);
    const data = (result && result.data) || {};
    const words = data.words || [];
    const text = (data.text || "").trim();
    ocrLastWords = words;
    if ($("ocrWords")) renderOcrWords(words, $("ocrWords"));
    if ($("ocrOutput")) $("ocrOutput").textContent = text || "(No text recognized in this image.)";
    const low = words.filter((w) => typeof w.confidence === "number" && w.confidence < 60).length;
    setStatus("ocrStatus", text ? "Done. " + words.length + " word(s) read" + (low ? ", " + low + " low-confidence (highlighted)" : "") + "." : "Done. No text recognized in this image.");
  } catch (e) { setError("ocrStatus", "OCR failed. Please try a clear image with printed text."); }
});

const ocrCopyBtn = $("ocrCopyBtn");
if (ocrCopyBtn) ocrCopyBtn.addEventListener("click", () => {
  const text = ocrLastWords.length ? ocrWordsToText(ocrLastWords, false) : ($("ocrOutput") ? $("ocrOutput").textContent : "");
  if (!text || text.startsWith("Recognized text") || text.startsWith("(No text")) { setError("ocrStatus", "Read text from an image first, then use Copy."); return; }
  copyTextToClipboard(text, "ocrStatus");
});

const ocrCopyLinesBtn = $("ocrCopyLinesBtn");
if (ocrCopyLinesBtn) ocrCopyLinesBtn.addEventListener("click", () => {
  const text = ocrLastWords.length ? ocrWordsToText(ocrLastWords, true) : ($("ocrOutput") ? $("ocrOutput").textContent : "");
  if (!text || text.startsWith("Recognized text") || text.startsWith("(No text")) { setError("ocrStatus", "Read text from an image first, then use Copy."); return; }
  copyTextToClipboard(text, "ocrStatus");
});
