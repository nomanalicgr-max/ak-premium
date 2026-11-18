/* AK Premium v12 — pdf-forms (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const formsPdfBtn = $("formsPdfBtn");
if (formsPdfBtn) formsPdfBtn.addEventListener("click", async () => {
  try {
    if (!needLibrary(!!window.PDFLib, "pdf-lib", "formsPdfStatus")) return;
    const doc = await window.PDFLib.PDFDocument.create(); const page = doc.addPage([595, 842]); const form = doc.getForm();
    const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    page.drawText($("formsTitle").value || "Application Form", { x: 50, y: 780, size: 20, font });
    page.drawText("Full name:", { x: 50, y: 730, size: 12, font });
    const nameField = form.createTextField("fullName"); nameField.addToPage(page, { x: 150, y: 715, width: 300, height: 20, borderWidth: 1 });
    page.drawText("Email:", { x: 50, y: 690, size: 12, font });
    const emailField = form.createTextField("email"); emailField.addToPage(page, { x: 150, y: 675, width: 300, height: 20, borderWidth: 1 });
    page.drawText("Agree:", { x: 50, y: 650, size: 12, font });
    const agree = form.createCheckBox("agree"); agree.addToPage(page, { x: 150, y: 640, width: 15, height: 15, borderWidth: 1 });
    page.drawText("Category:", { x: 50, y: 610, size: 12, font });
    const cat = form.createDropdown("category"); cat.addOptions(["General", "Support", "Sales"]); cat.select("General"); cat.addToPage(page, { x: 150, y: 595, width: 200, height: 20, borderWidth: 1 });
    form.updateFieldAppearances();
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-form.pdf");
    setStatus("formsPdfStatus", "Done. Fillable form PDF downloaded.");
  } catch (e) { if (!setPdfError("formsPdfStatus", e)) setError("formsPdfStatus", "Could not create a form PDF."); }
});
