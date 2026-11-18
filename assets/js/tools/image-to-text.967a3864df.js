/* AK Premium v12 — image-to-text (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Image ---------- */

const ocrBtn = $("ocrBtn");
if (ocrBtn) ocrBtn.addEventListener("click", async () => {
  const file = ($("ocrInput").files || [])[0];
  if (!file) { setError("ocrStatus", "Please select an image first."); return; }
  if (!window.Tesseract) { setError("ocrStatus", "OCR library (Tesseract.js) did not load. Check your connection and try again."); return; }
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
  } catch (e) { setError("ocrStatus", "OCR failed. Please try a clear image with printed text."); }
});

const ocrCopyBtn = $("ocrCopyBtn");
if (ocrCopyBtn) ocrCopyBtn.addEventListener("click", () => {
  const text = $("ocrOutput") ? $("ocrOutput").textContent : "";
  if (!text || text.startsWith("Recognized text")) { setError("ocrStatus", "Read text from an image first, then use Copy."); return; }
  copyTextToClipboard(text, "ocrStatus");
});
