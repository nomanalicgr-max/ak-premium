/* AK Premium v12 — markdown-previewer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const mdInput = $("mdInput");
if (mdInput) mdInput.addEventListener("input", async () => {
  const out = $("mdOutput");
  if (!out) return;
  if (!window.marked) {
    const ok = await loadLibrary("marked", "mdStatus");
    if (ok) await loadLibrary("marked-footnote", "mdStatus");
  }
  if (!window.DOMPurify) await loadLibrary("dompurify", "mdStatus");
  if (!window.hljs) await loadLibrary("highlight", "mdStatus");
  out.innerHTML = renderMarkdown(mdInput.value);
  if (window.hljs && window.hljs.highlightElement) {
    out.querySelectorAll("pre code").forEach((el) => { try { window.hljs.highlightElement(el); } catch (e) { /* leave plain */ } });
  }
  // DOMPurify or highlight.js failing to load is a graceful downgrade
  // (raw HTML stays escaped, code stays uncoloured), so clear any load
  // error once the preview itself has rendered.
  if (out.innerHTML.trim()) setStatus("mdStatus", "");
  const stats = $("mdStats");
  if (stats) {
    const c = countWords(mdInput.value);
    stats.textContent = "Words: " + c.words + " | Reading time: " + c.readingMinutes + " min";
  }
});

const mdCopyBtn = $("mdCopyBtn");
if (mdCopyBtn) mdCopyBtn.addEventListener("click", () => {
  const out = $("mdOutput");
  if (!out || !out.innerHTML.trim()) { setStatus("mdStatus", "Type some Markdown first, then use Copy HTML."); return; }
  copyTextToClipboard(out.innerHTML, "mdStatus");
});

const mdDownloadBtn = $("mdDownloadBtn");
if (mdDownloadBtn) mdDownloadBtn.addEventListener("click", () => {
  const out = $("mdOutput");
  if (!out || !out.innerHTML.trim()) { setStatus("mdStatus", "Type some Markdown first, then use Download HTML."); return; }
  downloadText("<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><title>Markdown preview</title></head>\n<body>\n" + out.innerHTML + "\n</body></html>", "ak-premium-markdown-preview.html", "text/html;charset=utf-8");
  setStatus("mdStatus", "Done. HTML preview downloaded.");
});
