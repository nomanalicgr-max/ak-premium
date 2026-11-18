/* AK Premium v12 — base64 (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Developer ---------- */

const base64EncodeBtn = $("base64EncodeBtn");
if (base64EncodeBtn) base64EncodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64EncodeText($("base64Input").value); setStatus("base64Status", "Done. Text encoded."); }
  catch (e) { setError("base64Status", "Could not encode this text."); }
});

const base64DecodeBtn = $("base64DecodeBtn");
if (base64DecodeBtn) base64DecodeBtn.addEventListener("click", () => {
  try { $("base64Output").textContent = base64DecodeText($("base64Input").value); setStatus("base64Status", "Done. Text decoded."); }
  catch (e) { setError("base64Status", "Invalid Base64: " + e.message); }
});

const base64CopyBtn = $("base64CopyBtn");
if (base64CopyBtn) base64CopyBtn.addEventListener("click", () => {
  const text = $("base64Output") ? $("base64Output").textContent : "";
  if (!text || text.startsWith("Result will")) { setStatus("base64Status", "Encode or decode text first, then use Copy."); return; }
  copyTextToClipboard(text, "base64Status");
});
