/* AK Premium v12 — unlock-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

function renderUnlockInfo(info) {
  const el = $("unlockInfo");
  if (!el) return;
  if (!info) { el.textContent = "Could not read this file. Check that it is a PDF."; return; }
  if (!info.encrypted) {
    el.textContent = "This PDF is not password-protected." + (info.pageCount ? " It has " + info.pageCount + " page(s), PDF version " + (info.pdfVersion || "?") + "." : "");
    return;
  }
  if (info.needsPassword) {
    el.textContent = "This PDF is password-protected (PDF version " + (info.pdfVersion || "?") + "). Type the password and press Check Protection again to see which password it is and what is locked.";
    return;
  }
  const enc = info.encrypt || {};
  const p = enc.parameters || {};
  const caps = enc.capabilities || {};
  const who = enc.ownerpasswordmatched ? "owner password" : (enc.userpasswordmatched ? "user password" : "password");
  const lines = [];
  lines.push("Password type: " + who + ".");
  lines.push("Encryption: " + pdfEncryptionSummary(p) + ".");
  const perm = formatPdfPermissions(caps);
  if (perm.allowed.length) lines.push("Allowed: " + perm.allowed.join(", ") + ".");
  if (perm.locked.length) lines.push("Locked: " + perm.locked.join(", ") + ".");
  el.textContent = lines.join("\n");
}

const unlockCheckBtn = $("unlockCheckBtn");
if (unlockCheckBtn) unlockCheckBtn.addEventListener("click", async () => {
  const file = ($("unlockInput").files || [])[0];
  if (!file) { setError("unlockPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "unlockPdfStatus")) return;
  const password = $("unlockPassword").value || "";
  setStatus("unlockPdfStatus", "Checking the protection on this file...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const info = await runQpdfInfo(bytes, password, "unlockPdfStatus");
  if (!info) return;
  unlockLastInfo = { key: file.name + "|" + file.size + "|" + file.lastModified + "|" + password, info };
  renderUnlockInfo(info);
  setStatus("unlockPdfStatus", info.encrypted ? (info.needsPassword ? "This PDF is locked. Enter the password to see the details." : "Protection details are shown above.") : "This PDF is not locked, so there is nothing to unlock.");
});

const unlockPdfBtn = $("unlockPdfBtn");
if (unlockPdfBtn) unlockPdfBtn.addEventListener("click", async () => {
  const files = Array.from(($("unlockInput").files || []));
  if (!files.length) { setError("unlockPdfStatus", "Please select a PDF file first."); return; }
  if (!files.every((f) => checkFileSize(f, "unlockPdfStatus"))) return;
  const password = $("unlockPassword").value || "";
  if (!password) { setError("unlockPdfStatus", "Please enter the PDF password. This tool does not guess or crack passwords."); return; }
  if (files.length === 1) {
    const file = files[0];
    setStatus("unlockPdfStatus", "Unlocking with standard PDF decryption, this may take a moment...");
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    const out = await runQpdf("unlock", bytes, password, "unlockPdfStatus");
    if (!out) return;
    downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-unlocked.pdf");
    let extra = "";
    const key = file.name + "|" + file.size + "|" + file.lastModified + "|" + password;
    if (unlockLastInfo && unlockLastInfo.key === key && unlockLastInfo.info && unlockLastInfo.info.encrypt) {
      const enc = unlockLastInfo.info.encrypt;
      const who = enc.ownerpasswordmatched ? "owner" : "user";
      const perm = formatPdfPermissions(enc.capabilities || {});
      extra = " Opened with the " + who + " password." + (perm.locked.length ? " Locked before unlocking: " + perm.locked.join(", ") + "." : "");
    }
    setStatus("unlockPdfStatus", "Done. Unlocked PDF downloaded with its original pages and layout." + extra);
    return;
  }
  // Batch: the same password is tried for every file; successes go in one ZIP.
  if (!needLibrary(!!window.JSZip, "JSZip", "unlockPdfStatus")) return;
  setStatus("unlockPdfStatus", "Unlocking " + files.length + " files, this may take a moment...");
  const zip = new window.JSZip();
  let okCount = 0;
  const failed = [];
  for (const file of files) {
    const bytes = new Uint8Array(await readAsArrayBuffer(file));
    const out = await runQpdf("unlock", bytes, password, "unlockPdfStatus", null, true);
    if (out) {
      zip.file(file.name.replace(/\.pdf$/i, "") + "-unlocked.pdf", out);
      okCount++;
    } else {
      failed.push(file.name + " (" + (getLastQpdfError() === "WRONG_PASSWORD" ? "wrong password" : "could not unlock") + ")");
    }
  }
  if (!okCount) { setError("unlockPdfStatus", "None of the files could be unlocked. " + (failed[0] || "Check the password and try again.")); return; }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "ak-premium-unlocked.zip");
  setStatus("unlockPdfStatus", "Done. " + okCount + " of " + files.length + " file(s) unlocked into ak-premium-unlocked.zip." + (failed.length ? " Skipped: " + failed.join("; ") + "." : ""));
});
