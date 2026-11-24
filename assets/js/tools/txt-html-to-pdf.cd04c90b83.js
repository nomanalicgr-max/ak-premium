/* AK Premium v12 — txt-html-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

const txtHtmlPdfBtn = $("txtHtmlPdfBtn");
if (txtHtmlPdfBtn) txtHtmlPdfBtn.addEventListener("click", () => {
  const raw = $("txtHtmlInput").value.trim();
  if (!raw) { setError("txtHtmlPdfStatus", "Please paste some text or simple HTML first."); return; }
  textToPdf(raw, "txtHtmlPdfStatus", "ak-premium-text-to-pdf.pdf");
});

/* Clean pasted or uploaded HTML before it is rendered: scripts, frames,
   embeds and external stylesheets are removed (they cannot run or load
   from a saved file), and event-handler attributes plus javascript: links
   are stripped, so a saved page cannot run code on this page. Inline
   <style> blocks and style attributes are kept, because html2canvas
   needs them to render headings, bold text and tables. Returns the
   cleaned inner HTML of the document body. */
