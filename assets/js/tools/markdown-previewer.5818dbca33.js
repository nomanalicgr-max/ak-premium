/* AK Premium v12 — markdown-previewer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const mdInput = $("mdInput");
if (mdInput) mdInput.addEventListener("input", () => {
  const out = $("mdOutput");
  if (out) out.innerHTML = renderMarkdown(mdInput.value);
});
