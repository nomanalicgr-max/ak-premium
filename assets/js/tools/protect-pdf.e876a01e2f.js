/* AK Premium v12 — protect-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const protectPdfBtn = $("protectPdfBtn");
if (protectPdfBtn) protectPdfBtn.addEventListener("click", async () => {
  const file = ($("protectInput").files || [])[0];
  const password = $("protectPassword").value || "";
  if (!file) { setError("protectPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "protectPdfStatus")) return;
  if (password.length < 4) { setError("protectPdfStatus", "Please enter a password of at least 4 characters. A longer password is safer."); return; }
  const ownerPassword = ($("protectOwnerPassword") || { value: "" }).value || "";
  const allowModify = !!($("protectAllowModify") && $("protectAllowModify").checked);
  const perms = {
    print: ($("protectPrint") || { value: "full" }).value || "full",
    extract: !!($("protectAllowCopy") && $("protectAllowCopy").checked),
    modify: allowModify ? "all" : "none",
    annotate: !!($("protectAllowAnnotate") && $("protectAllowAnnotate").checked),
    form: !!($("protectAllowForms") && $("protectAllowForms").checked),
    assemble: !!($("protectAllowAssemble") && $("protectAllowAssemble").checked),
    modifyOther: allowModify
  };
  setStatus("protectPdfStatus", "Encrypting with standard AES-256 PDF encryption, this may take a moment...");
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  const out = await runQpdf("protect", bytes, password, "protectPdfStatus", { opts: { userPassword: password, ownerPassword: ownerPassword || password, permissions: perms } });
  if (!out) return;
  downloadBlob(new Blob([out], { type: "application/pdf" }), "ak-premium-protected.pdf");
  const perm = formatPdfPermissions({
    printhigh: perms.print === "full", printlow: perms.print !== "none",
    extract: perms.extract, modify: allowModify,
    modifyannotations: perms.annotate, modifyforms: perms.form,
    modifyassembly: perms.assemble, modifyother: allowModify, accessibility: true
  });
  setStatus("protectPdfStatus", "Done. Standard password-protected PDF downloaded (" + humanBytes(file.size) + " to " + humanBytes(out.length) + "). It opens in Acrobat and Chrome with this password. Keep the password safe, it cannot be recovered." + (ownerPassword && ownerPassword !== password ? " The owner password is different from the user password." : "") + (perm.locked.length ? " Not allowed: " + perm.locked.join(", ") + "." : ""));
});

/* Ink bounding box in an ImageData object (pixel units), or null when the
   page has no ink. Pure, unit-testable. */
