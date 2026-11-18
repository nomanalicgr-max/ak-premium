/* AK Premium v12 — password-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Everyday ---------- */

const pwdLength = $("pwdLength");
if (pwdLength) pwdLength.addEventListener("input", () => { const l = $("pwdLengthLabel"); if (l) l.textContent = pwdLength.value; });

const pwdBtn = $("pwdBtn");
if (pwdBtn) pwdBtn.addEventListener("click", () => {
  const length = parseInt($("pwdLength").value, 10) || 16;
  const opts = { upper: !!$("pwdUpper").checked, lower: !!$("pwdLower").checked, numbers: !!$("pwdNumbers").checked, symbols: !!$("pwdSymbols").checked };
  const setCount = Object.values(opts).filter(Boolean).length;
  const result = generatePassword(length, opts);
  if (result.error) { setStatus("pwdStatus", result.error); return; }
  if ($("pwdOutput")) $("pwdOutput").textContent = result.password;
  setStatus("pwdStatus", "Done. " + passwordStrengthNote(length, setCount));
});

const pwdCopyBtn = $("pwdCopyBtn");
if (pwdCopyBtn) pwdCopyBtn.addEventListener("click", () => {
  const text = $("pwdOutput") ? $("pwdOutput").textContent : "";
  if (!text || text.startsWith("Your password")) { setStatus("pwdStatus", "Generate a password first, then use Copy."); return; }
  copyTextToClipboard(text, "pwdStatus");
});
