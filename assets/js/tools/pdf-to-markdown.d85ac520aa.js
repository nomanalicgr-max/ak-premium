/* AK Premium v12 — pdf-to-markdown (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const pdfmdPdfBtn = $("pdfmdPdfBtn");
if (pdfmdPdfBtn) pdfmdPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfmdInput").files || [])[0]; if (!file) { setError("pdfmdPdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "pdfmdPdfStatus"); if (text === null) return;
    const md = text.split("\n").map((line) => {
      const t = line.trim(); if (!t) return "";
      if (/^--- Page/.test(t)) return "\n## " + t + "\n";
      return t;
    }).join("\n");
    downloadText(md, "ak-premium-document.md", "text/markdown;charset=utf-8");
    setStatus("pdfmdPdfStatus", "Done. Markdown file downloaded.");
  } catch (e) { if (!setPdfError("pdfmdPdfStatus", e)) setError("pdfmdPdfStatus", "Could not convert this PDF to Markdown."); }
});
