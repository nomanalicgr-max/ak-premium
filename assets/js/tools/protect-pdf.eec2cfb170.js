/* AK Premium v12 — protect-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const protectPdfBtn = $("protectPdfBtn");
if (protectPdfBtn) protectPdfBtn.addEventListener("click", async () => {
  const file = ($("protectInput").files || [])[0];
  const password = $("protectPassword").value || "";
  if (!file) { setError("protectPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "protectPdfStatus")) return;
  if (password.length < 4) { setError("protectPdfStatus", "Please enter a password of at least 4 characters. A longer password is safer."); return; }
  setStatus("protectPdfStatus", "Encrypting with standard AES-256 PDF encryption, this may take a moment...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const out = await runQpdf("protect", bytes, password, "protectPdfStatus");
  if (!out) return;
  downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-protected.pdf");
  setStatus("protectPdfStatus", "Done. Standard password-protected PDF downloaded (" + humanBytes(file.size) + " to " + humanBytes(out.length) + "). It opens in Acrobat and Chrome with this password. Keep the password safe, it cannot be recovered.");
});
