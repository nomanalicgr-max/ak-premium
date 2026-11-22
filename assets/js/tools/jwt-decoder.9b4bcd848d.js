/* AK Premium v12 — jwt-decoder (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const jwtBtn = $("jwtBtn");
if (jwtBtn) jwtBtn.addEventListener("click", () => {
  const input = ($("jwtInput") || {}).value || "";
  if (!input.trim()) { setError("jwtStatus", "Please paste a JWT token first."); return; }
  let d;
  try { d = decodeJwt(input); } catch (e) { setError("jwtStatus", e.message || "That token could not be decoded."); return; }
  let out = "Header\n" + JSON.stringify(d.header, null, 2) + "\n\nPayload\n" + JSON.stringify(d.payload, null, 2) + "\n\nSignature: " + d.signature;
  if (d.expiryDate) out += "\n\nExpires: " + d.expiryDate.toLocaleString() + jwtExpiryNote(d);
  if (d.payload && d.payload.iss) out += "\nIssuer: " + d.payload.iss;
  if (d.payload && d.payload.aud) out += "\nAudience: " + (Array.isArray(d.payload.aud) ? d.payload.aud.join(", ") : d.payload.aud);
  if (d.header && d.header.alg === "none") out += "\n\nWARNING: this token uses alg \"none\" — it carries no signature and can never be trusted as verified.";
  if ($("jwtOutput")) $("jwtOutput").textContent = out;
  setStatus("jwtStatus", "Done. Token decoded. This does not check the signature — use Verify Signature below to check it.");
});

const jwtCopyBtn = $("jwtCopyBtn");
if (jwtCopyBtn) jwtCopyBtn.addEventListener("click", () => {
  const text = ($("jwtOutput") || {}).textContent || "";
  if (!text || text === "The decoded header and payload will appear here.") { setStatus("jwtStatus", "Decode a token first, then use Copy Result."); return; }
  copyTextToClipboard(text, "jwtStatus");
});

const jwtVerifyBtn = $("jwtVerifyBtn");
if (jwtVerifyBtn) jwtVerifyBtn.addEventListener("click", async () => {
  const input = ($("jwtInput") || {}).value || "";
  const secret = ($("jwtSecret") || {}).value || "";
  const outEl = $("jwtVerifyOut");
  if (!input.trim()) { setError("jwtStatus", "Please paste a JWT token first."); return; }
  if (!secret) { setError("jwtStatus", "Paste the secret this token was signed with. The secret stays in your browser and is never sent anywhere."); return; }
  let d;
  try { d = decodeJwt(input); } catch (e) { setError("jwtStatus", e.message || "That token could not be decoded."); return; }
  const alg = d.header && d.header.alg;
  if (alg === "none") {
    if (outEl) outEl.textContent = "WARNING \u2014 this token uses alg \"none\": it has no signature at all, so it can never be verified. Do not trust it.";
    setStatus("jwtStatus", "Done. Token uses alg \"none\" \u2014 no signature to check.");
    return;
  }
  if (!/^HS(256|384|512)$/.test(alg || "")) {
    if (outEl) outEl.textContent = "Cannot verify \u2014 this tool checks HMAC signatures (HS256, HS384, HS512) only. This token uses \"" + alg + "\", so it was decoded above but its signature was not checked.";
    setStatus("jwtStatus", "Done. Signature not checked: " + alg + " is not an HMAC algorithm.");
    return;
  }
  setStatus("jwtStatus", "Checking the signature...");
  let ok;
  try { ok = await verifyJwtHmac(input, secret, alg); } catch (e) { setError("jwtStatus", e.message || "The signature could not be checked."); return; }
  if (outEl) outEl.textContent = ok ? "VERIFIED \u2014 the signature matches this secret, so the token is genuine for this secret." : "INVALID \u2014 the signature does not match this secret. The token may be fake, or the secret may be wrong.";
  setStatus("jwtStatus", ok ? "Done. Signature verified." : "Done. Signature does not match.");
});
