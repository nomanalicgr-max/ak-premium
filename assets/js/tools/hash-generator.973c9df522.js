/* AK Premium v12 — hash-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Developer tools (batch 5) ---------- */

const hashBtn = $("hashBtn");

function syncHashBtn() {
  if (!hashBtn) return;
  const hasText = (($("hashInput") || {}).value || "").trim().length > 0;
  const hasFile = (($("hashFile") || {}).files || []).length > 0;
  hashBtn.disabled = !hasText && !hasFile;
}
if (hashBtn) {
  const hashInput = $("hashInput");
  if (hashInput) hashInput.addEventListener("input", syncHashBtn);
  const hashFile = $("hashFile");
  if (hashFile) hashFile.addEventListener("change", syncHashBtn);
  syncHashBtn();
  hashBtn.addEventListener("click", async () => {
    const algo = ($("hashAlgo") || {}).value || "SHA-256";
    const file = (($("hashFile") || {}).files || [])[0];
    const text = ($("hashInput") || {}).value || "";
    if (!file && !text.trim()) { setError("hashStatus", "Type some text or choose a file first."); return; }
    if (file && file.size > 10 * 1024 * 1024) { setError("hashStatus", "That file is over 10 MB. Choose a smaller file."); return; }
    setStatus("hashStatus", "Working…");
    let out;
    try {
      const data = file ? await readAsArrayBuffer(file) : (algo === "MD5" ? text : new TextEncoder().encode(text));
      out = await hashData(algo, data);
    } catch (e) {
      setError("hashStatus", (e && e.message) || "The hash could not be made. Try again.");
      return;
    }
    if ($("hashOutput")) $("hashOutput").textContent = out;
    setStatus("hashStatus", "Done. " + algo + " hash generated.");
  });
}

const hashCopyBtn = $("hashCopyBtn");
if (hashCopyBtn) hashCopyBtn.addEventListener("click", () => {
  const text = ($("hashOutput") || {}).textContent || "";
  if (!text || text === "Your hash will appear here.") { setStatus("hashStatus", "Generate a hash first, then use Copy Hash."); return; }
  copyTextToClipboard(text, "hashStatus");
});
