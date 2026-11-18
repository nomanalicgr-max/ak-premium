/* AK Premium v12 — unlock-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const unlockPdfBtn = $("unlockPdfBtn");
if (unlockPdfBtn) unlockPdfBtn.addEventListener("click", async () => {
  const file = ($("unlockInput").files || [])[0];
  if (!file) { setError("unlockPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "unlockPdfStatus")) return;
  const password = $("unlockPassword").value || "";
  if (!password) { setError("unlockPdfStatus", "Please enter the PDF password. This tool does not guess or crack passwords."); return; }
  setStatus("unlockPdfStatus", "Unlocking with standard PDF decryption, this may take a moment...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const out = await runQpdf("unlock", bytes, password, "unlockPdfStatus");
  if (!out) return;
  downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-unlocked.pdf");
  setStatus("unlockPdfStatus", "Done. Unlocked PDF downloaded with its original pages and layout.");
});
