/* AK Premium v12 — flatten-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const flattenBtn = $("flattenBtn");
if (flattenBtn) flattenBtn.addEventListener("click", async () => {
  const file = ($("flattenInput").files || [])[0];
  if (!file) { setError("flattenStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "flattenStatus")) return;
  const mode = $("flattenMode") ? $("flattenMode").value : "both";
  setStatus("flattenStatus", "Flattening PDF…");
  try {
    const doc = await loadPdfLibDoc(file, "flattenStatus");
    if (!doc) return;
    const P = window.PDFLib.PDFName;
    // Report first: the original fields, so the user keeps a copy of
    // what was flattened. Fields are read before anything is changed.
    const report = [];
    let annotBefore = 0;
    doc.getPages().forEach((page) => {
      const annots = page.node.Annots();
      if (annots) annotBefore += annots.size();
    });
    let fieldNames = [];
    if (doc.catalog.has(P.of("AcroForm"))) {
      const form = doc.getForm();
      fieldNames = form.getFields().map((f) => {
        const t = f.constructor && f.constructor.name ? f.constructor.name.replace("PDF", "").replace("Field", "") : "field";
        return f.getName() + " (" + t + ")";
      });
    }
    report.push("Original fields (" + fieldNames.length + "): " + (fieldNames.length ? fieldNames.join(", ") : "none"));
    report.push("Annotations on pages before flattening: " + annotBefore);
    let bytes = null;
    if (mode === "fields" || mode === "both") {
      if (doc.catalog.has(P.of("AcroForm"))) {
        const form = doc.getForm();
        if (form.getFields().length) form.flatten();
      }
      report.push("Form fields flattened: " + (mode === "both" ? "yes (then annotations)" : "yes"));
      bytes = await doc.save();
    }
    if (mode === "annotations" || mode === "both") {
      // qpdf renders annotation appearances into the page content.
      // Hyperlinks are kept as links; annotations without an appearance
      // (nothing to draw) are left in place, and qpdf says so in the
      // status below.
      const input = bytes || await doc.save();
      const flat = await runQpdf("flatten", input, "", "flattenStatus");
      if (!flat) return;
      bytes = flat;
      const check = await window.PDFLib.PDFDocument.load(bytes);
      let annotAfter = 0;
      check.getPages().forEach((page) => {
        const annots = page.node.Annots();
        if (annots) annotAfter += annots.size();
      });
      report.push("Annotations after flattening: " + annotAfter + (annotAfter ? " (these have no appearance to draw, so they stay as annotations; links are kept)" : " — all annotations are now part of the pages"));
    }
    if (!bytes) bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-flattened.pdf");
    const reportEl = $("flattenReport");
    if (reportEl) reportEl.textContent = report.join("\n");
    const reportLink = $("flattenReportLink");
    if (reportLink) {
      const rb = new Blob([report.join("\n") + "\n"], { type: "text/plain" });
      reportLink.href = URL.createObjectURL(rb);
      reportLink.style.display = "";
    }
    setStatus("flattenStatus", "Done. PDF flattened (" + (mode === "fields" ? "form fields only" : mode === "annotations" ? "annotations only" : "form fields and annotations") + "). The field report is shown below; flattening cannot be undone, so keep the original file.");
  } catch (e) { if (!setPdfError("flattenStatus", e)) setError("flattenStatus", "Could not flatten this PDF. Please check the file."); }
});

/* Format a Date for a datetime-local input (local time, no seconds). */
