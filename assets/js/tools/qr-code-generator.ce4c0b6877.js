/* AK Premium v12 — qr-code-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Everyday ---------- */

const qrBtn = $("qrBtn");
if (qrBtn) qrBtn.addEventListener("click", () => {
  const text = ($("qrText").value || "").trim();
  if (!text) { setError("qrStatus", "Please enter text or a URL first."); return; }
  const container = $("qrContainer");
  if (!container) { setError("qrStatus", "QR output area is missing. Please reload the page."); return; }
  container.innerHTML = "";
  qrGenerated = false;
  try {
    if (window.QRCode && window.QRCode.toCanvas) {
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);
      window.QRCode.toCanvas(canvas, text, { width: 220, margin: 1 }, (err) => {
        if (err) { setError("qrStatus", "Could not generate this QR code. Please try shorter text."); return; }
        qrGenerated = true; setStatus("qrStatus", "Done. QR code generated.");
      });
    } else if (typeof window.QRCode === "function") {
      new window.QRCode(container, { text: text, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel.M });
      qrGenerated = true; setStatus("qrStatus", "Done. QR code generated.");
    } else {
      setError("qrStatus", "QR library did not load. Check your connection and try again.");
    }
  } catch (e) {
    setError("qrStatus", "Could not generate this QR code. Please try shorter text.");
  }
});

const qrDownloadBtn = $("qrDownloadBtn");
if (qrDownloadBtn) qrDownloadBtn.addEventListener("click", async () => {
  if (!qrGenerated) { setStatus("qrStatus", "Generate a QR code first, then download it."); return; }
  const container = $("qrContainer");
  const canvas = container ? container.querySelector("canvas") : null;
  if (canvas) {
    canvas.toBlob((blob) => {
      if (!blob) { setError("qrStatus", "Could not download this QR code."); return; }
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
    } catch (e) { setError("qrStatus", "Could not download this QR code."); }
    return;
  }
  setError("qrStatus", "Could not download this QR code.");
});
