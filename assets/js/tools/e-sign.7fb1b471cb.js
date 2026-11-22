/* AK Premium v12 — e-sign (split from app.js). Loads after core.js, only on its own tool page. */

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
  function start(e) { e.preventDefault(); drawing = true; hasSignature = true; esignCanvas.dataset.signed = "1"; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
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
  if (clearBtn) clearBtn.addEventListener("click", () => { ctx.clearRect(0, 0, esignCanvas.width, esignCanvas.height); hasSignature = false; delete esignCanvas.dataset.signed; setStatus("esignStatus", "Signature cleared."); });
  const typeBtn = $("esignTypeBtn");
  if (typeBtn) typeBtn.addEventListener("click", () => {
    const name = (($("esignTyped") || {}).value || "").trim();
    if (!name) { setError("esignStatus", "Type your name first."); return; }
    ctx.clearRect(0, 0, esignCanvas.width, esignCanvas.height);
    ctx.font = "italic 52px cursive, 'Segoe Script', cursive";
    ctx.fillStyle = "#111827";
    ctx.fillText(name, 12, 110);
    hasSignature = true;
    esignCanvas.dataset.signed = "1";
    setStatus("esignStatus", "Typed signature ready. You can draw over it, or sign a PDF below.");
  });
  const dlBtn = $("esignDownloadBtn");
  if (dlBtn) dlBtn.addEventListener("click", () => {
    // Previously a blank canvas still produced a "Done" PNG download.
    if (!hasSignature) { setError("esignStatus", "Please draw a signature first."); return; }
    esignCanvas.toBlob((blob) => {
      if (!blob) { setError("esignStatus", "Please draw a signature first."); return; }
      downloadBlob(blob, "ak-premium-signature.png");
      setStatus("esignStatus", "Done. Signature PNG downloaded.");
    }, "image/png");
  });
}

/* Digitally sign a PDF (PAdES) with a user-supplied .p12 certificate, fully
   in the browser: pdf-lib adds a signature field with a placeholder, the
   ByteRange is patched in place, node-forge makes a detached PKCS#7
   signature over the signed bytes, and the signature is written into the
   placeholder. The certificate is self-signed only: a PDF reader shows the
   document as signed by the user's own certificate, not by a trusted
   authority, until that certificate is trusted. */
const ESIGN_SIG_PLACEHOLDER_HEX = 32768; /* 16 KB of signature room */

const esignStampBtn = $("esignStampBtn");
if (esignStampBtn) esignStampBtn.addEventListener("click", async () => {
  const file = ($("esignPdfInput").files || [])[0];
  if (!file) { setError("esignStatus", "Please choose a PDF file first."); return; }
  const canvas = $("esignCanvas");
  if (!canvas || canvas.dataset.signed !== "1") { setError("esignStatus", "Draw or type a signature first."); return; }
  const pagesOpt = ($("esignPages") || {}).value || "all";
  const pageNum = parseInt(($("esignPageNum") || {}).value, 10);
  const pos = ($("esignPos") || {}).value || "bottom-right";
  const width = Math.max(50, Math.min(400, parseInt(($("esignWidth") || {}).value, 10) || 150));
  try {
    const doc = await loadPdfLibDoc(file, "esignStatus");
    if (!doc) return;
    const pngBlob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!pngBlob) { setError("esignStatus", "Could not read the signature. Please draw it again."); return; }
    const img = await doc.embedPng(await pngBlob.arrayBuffer());
    const pages = doc.getPages();
    if (!pages.length) { setError("esignStatus", "This PDF has no pages."); return; }
    let targets;
    if (pagesOpt === "first") targets = [pages[0]];
    else if (pagesOpt === "last") targets = [pages[pages.length - 1]];
    else if (pagesOpt === "custom") {
      if (!pageNum || pageNum < 1 || pageNum > pages.length) { setError("esignStatus", "Please enter a page number between 1 and " + pages.length + "."); return; }
      targets = [pages[pageNum - 1]];
    } else targets = pages;
    const h = width * (img.height / img.width);
    for (const page of targets) {
      const { width: pw, height: ph } = page.getSize();
      const m = 36;
      let x = pw - width - m, y = m;
      if (pos === "bottom-left") { x = m; y = m; }
      else if (pos === "top-right") { x = pw - width - m; y = ph - h - m; }
      else if (pos === "top-left") { x = m; y = ph - h - m; }
      else if (pos === "centre") { x = (pw - width) / 2; y = (ph - h) / 2; }
      page.drawImage(img, { x, y, width, height: h });
    }
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-signed.pdf");
    setStatus("esignStatus", "Done. Signed PDF downloaded \u2014 the signature was stamped on " + targets.length + " page" + (targets.length === 1 ? "" : "s") + ". This is a picture of your signature, not a certificate-based digital signature.");
  } catch (e) { if (!setPdfError("esignStatus", e)) setError("esignStatus", "Could not sign this PDF. Please check the file."); }
});

const esignDigitalBtn = $("esignDigitalBtn");
if (esignDigitalBtn) esignDigitalBtn.addEventListener("click", async () => {
  const file = ($("esignPdfInput").files || [])[0];
  if (!file) { setError("esignStatus", "Please choose a PDF file first."); return; }
  const p12File = ($("esignP12Input").files || [])[0];
  if (!p12File) { setError("esignStatus", "Please choose your .p12 certificate file first."); return; }
  const pass = ($("esignP12Pass") || {}).value || "";
  if (!window.forge) { const ok = await loadLibrary("forge", "esignStatus"); if (!ok) return; }
  setStatus("esignStatus", "Signing the PDF with your certificate. Your certificate and password never leave your browser.");
  try {
    const signed = await digitallySignPdf(file, p12File, pass, "esignStatus");
    if (!signed) return;
    downloadBlob(new Blob([signed], { type: "application/pdf" }), "ak-premium-digitally-signed.pdf");
    setStatus("esignStatus", "Done. Digitally signed PDF downloaded. The signature is self-signed: a PDF reader will show it as signed by your own certificate, not by a trusted authority, until that certificate is trusted.");
  } catch (e) {
    setError("esignStatus", e.message || "Could not digitally sign this PDF.");
  }
});
