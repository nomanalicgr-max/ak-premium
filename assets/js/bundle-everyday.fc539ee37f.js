/* AK Premium v9 — bundle-everyday (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 1 handlers: Everyday ---------- */

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
