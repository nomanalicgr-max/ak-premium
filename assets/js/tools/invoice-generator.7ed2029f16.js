/* AK Premium v12 — invoice-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 handlers: Business ---------- */

const invoiceCalcBtn = $("invoiceCalcBtn");
if (invoiceCalcBtn) invoiceCalcBtn.addEventListener("click", () => {
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setError("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
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
  if (!business || !client) { setError("invoiceStatus", "Please enter both the business name and the client name."); return; }
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setError("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
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
