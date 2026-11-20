/* AK Premium v12 — jwt-decoder (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const jwtBtn = $("jwtBtn");
if (jwtBtn) jwtBtn.addEventListener("click", () => {
  const input = ($("jwtInput") || {}).value || "";
  if (!input.trim()) { setError("jwtStatus", "Please paste a JWT token first."); return; }
  let d;
  try { d = decodeJwt(input); } catch (e) { setError("jwtStatus", e.message || "That token could not be decoded."); return; }
  let out = "Header\n" + JSON.stringify(d.header, null, 2) + "\n\nPayload\n" + JSON.stringify(d.payload, null, 2) + "\n\nSignature: " + d.signature;
  if (d.expiryDate) out += "\n\nExpires: " + d.expiryDate.toLocaleString() + (d.expired ? " (expired)" : " (still valid)");
  if ($("jwtOutput")) $("jwtOutput").textContent = out;
  setStatus("jwtStatus", "Done. Token decoded. This does not check the signature.");
});

const jwtCopyBtn = $("jwtCopyBtn");
if (jwtCopyBtn) jwtCopyBtn.addEventListener("click", () => {
  const text = ($("jwtOutput") || {}).textContent || "";
  if (!text || text === "The decoded header and payload will appear here.") { setStatus("jwtStatus", "Decode a token first, then use Copy Result."); return; }
  copyTextToClipboard(text, "jwtStatus");
});
