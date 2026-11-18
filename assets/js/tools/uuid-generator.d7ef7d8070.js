/* AK Premium v12 — uuid-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Developer ---------- */

function renderUuids(count) {
  try {
    const list = [];
    for (let i = 0; i < count; i++) list.push(generateUuid());
    if ($("uuidOutput")) $("uuidOutput").textContent = list.join("\n");
    setStatus("uuidStatus", "Done.");
  } catch (e) { setStatus("uuidStatus", "Secure random numbers are not available in this browser."); }
}

const uuidBtn = $("uuidBtn");
if (uuidBtn) uuidBtn.addEventListener("click", () => renderUuids(1));

const uuidBtn5 = $("uuidBtn5");
if (uuidBtn5) uuidBtn5.addEventListener("click", () => renderUuids(5));

const uuidCopyBtn = $("uuidCopyBtn");
if (uuidCopyBtn) uuidCopyBtn.addEventListener("click", () => {
  const text = $("uuidOutput") ? $("uuidOutput").textContent : "";
  if (!text || text.startsWith("Your UUID")) { setStatus("uuidStatus", "Generate a UUID first, then use Copy."); return; }
  copyTextToClipboard(text, "uuidStatus");
});
