/* AK Premium v12 — url-encode-decode (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const urlEncodeBtn = $("urlEncodeBtn");
if (urlEncodeBtn) urlEncodeBtn.addEventListener("click", () => {
  const input = ($("urlInput") || {}).value || "";
  if (!input.trim()) { setError("urlStatus", "Please type or paste some text first."); return; }
  const mode = ($("urlMode") || {}).value || "value";
  let out;
  try { out = urlEncodeText(input, mode); } catch (e) { setError("urlStatus", "That text could not be encoded."); return; }
  if ($("urlOutput")) $("urlOutput").textContent = out;
  setStatus("urlStatus", "Done. Text encoded.");
});

const urlDecodeBtn = $("urlDecodeBtn");
if (urlDecodeBtn) urlDecodeBtn.addEventListener("click", () => {
  const input = ($("urlInput") || {}).value || "";
  if (!input.trim()) { setError("urlStatus", "Please type or paste some text first."); return; }
  let out;
  try { out = urlDecodeText(input); } catch (e) { setError("urlStatus", "That text could not be decoded. Check for a stray % sign or a bad code."); return; }
  if ($("urlOutput")) $("urlOutput").textContent = out;
  setStatus("urlStatus", "Done. Text decoded.");
});

const urlCopyBtn = $("urlCopyBtn");
if (urlCopyBtn) urlCopyBtn.addEventListener("click", () => {
  const text = ($("urlOutput") || {}).textContent || "";
  if (!text || text === "Your result will appear here.") { setStatus("urlStatus", "Encode or decode first, then use Copy Result."); return; }
  copyTextToClipboard(text, "urlStatus");
});
