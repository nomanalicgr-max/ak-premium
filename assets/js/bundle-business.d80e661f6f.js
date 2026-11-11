/* AK Premium v9 — bundle-business (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 2 handlers: Business ---------- */

const invoiceCalcBtn = $("invoiceCalcBtn");
if (invoiceCalcBtn) invoiceCalcBtn.addEventListener("click", () => {
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setStatus("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, tax);
  const lines = parsed.items.map((it) => it.name + " x " + it.qty + " @ " + it.price + " = " + it.amount.toFixed(2));
  $("invoiceSummary").textContent = lines.join("\n") + "\nSubtotal: " + totals.subtotal.toFixed(2) + "\nTax (" + tax + "%): " + totals.tax.toFixed(2) + "\nTotal: " + totals.total.toFixed(2);
  setStatus("invoiceStatus", "Done. Summary calculated.");
});

const invoicePdfBtn = $("invoicePdfBtn");
if (invoicePdfBtn) invoicePdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "invoiceStatus")) return;
  const business = ($("invoiceBusiness").value || "").trim();
  const client = ($("invoiceClient").value || "").trim();
  if (!business || !client) { setStatus("invoiceStatus", "Please enter both the business name and the client name."); return; }
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setStatus("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, tax);
  const template = $("invoiceTemplate") ? $("invoiceTemplate").value : "1";
  const notes = $("invoiceNotes") ? ($("invoiceNotes").value || "").trim() : "";
  const doc = new JsPDF();
  if (template === "2") {
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("INVOICE", 15, 18);
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    doc.text("From: " + business, 15, 40);
    doc.text("To: " + client, 15, 48);
    if ($("invoiceDate").value) doc.text("Date: " + $("invoiceDate").value, 15, 56);
  } else {
    doc.setFontSize(18); doc.text("INVOICE", 15, 20);
    doc.setFontSize(12);
    doc.text("From: " + business, 15, 32);
    doc.text("To: " + client, 15, 40);
    if ($("invoiceDate").value) doc.text("Date: " + $("invoiceDate").value, 15, 48);
  }
  let y = 62;
  parsed.items.forEach((it) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(it.name + "  x " + it.qty + "  @ " + it.price + "  = " + it.amount.toFixed(2), 15, y); y += 8;
  });
  if (y > 250) { doc.addPage(); y = 20; }
  doc.text("Subtotal: " + totals.subtotal.toFixed(2), 15, y + 6);
  doc.text("Tax (" + tax + "%): " + totals.tax.toFixed(2), 15, y + 14);
  doc.setFontSize(13); doc.text("Total: " + totals.total.toFixed(2), 15, y + 24);
  if (template === "2" && notes) { doc.setFontSize(11); doc.text("Notes: " + notes, 15, y + 34); }
  doc.save("ak-premium-invoice.pdf");
  setStatus("invoiceStatus", "Done. Invoice PDF downloaded.");
});

const resumeBtn = $("resumeBtn");
if (resumeBtn) resumeBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "resumeStatus")) return;
  const name = ($("resumeName").value || "").trim();
  const title = ($("resumeTitle").value || "").trim();
  if (!name || !title) { setStatus("resumeStatus", "Please enter your full name and job title."); return; }
  const template = $("resumeTemplate") ? $("resumeTemplate").value : "1";
  const doc = new JsPDF();
  if (template === "2") {
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(name, 15, 16);
    doc.setFontSize(13); doc.text(title, 15, 26);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFontSize(20); doc.text(name, 15, 20);
    doc.setFontSize(13); doc.text(title, 15, 29);
  }
  doc.setFontSize(11);
  const contact = [($("resumeEmail").value || "").trim(), ($("resumePhone").value || "").trim()].filter(Boolean).join("  |  ");
  if (contact) doc.text(contact, 15, 38);
  let y = 52;
  const skills = ($("resumeSkills").value || "").trim();
  if (skills) {
    doc.setFontSize(13); doc.text("Skills", 15, y); y += 8;
    doc.setFontSize(11);
    if (template === "2") {
      skills.split(",").map((sk) => sk.trim()).filter(Boolean).forEach((sk) => { if (y > 270) { doc.addPage(); y = 20; } doc.text("- " + sk, 15, y); y += 7; });
    } else {
      wrapPdfText(doc, skills, 170).forEach((line) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(line, 15, y); y += 7; });
    }
    y += 6;
  }
  const exp = ($("resumeExperience").value || "").trim();
  if (exp) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(13); doc.text("Experience", 15, y); y += 8;
    doc.setFontSize(11);
    addWrappedTextPaginatedFrom(doc, exp, y);
  }
  doc.save("ak-premium-resume.pdf");
  setStatus("resumeStatus", "Done. Resume PDF downloaded.");
});
