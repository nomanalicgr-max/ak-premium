/* AK Premium v12 — invoice-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 tools: pure logic (testable) ---------- */

function parseInvoiceItems(text) {
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return { error: "Please add at least one item, one per line as: Item name, quantity, price." };
  const items = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if ((parts.length !== 3 && parts.length !== 4 && parts.length !== 5) || !parts[0]) return { error: "Invalid item line: \"" + line + "\". Use: Item name, quantity, price." };
    const qty = parseFloat(parts[1]);
    const price = parseFloat(parts[2]);
    const discPct = parts.length >= 4 && parts[3] !== "" ? parseFloat(parts[3]) : 0;
    const taxPct = parts.length >= 5 && parts[4] !== "" ? parseFloat(parts[4]) : 0;
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) return { error: "Invalid quantity or price in line: \"" + line + "\"." };
    if (isNaN(discPct) || discPct < 0 || discPct > 100) return { error: "Invalid discount percent in line: \"" + line + "\". Discounts run from 0 to 100." };
    if (isNaN(taxPct) || taxPct < 0) return { error: "Invalid tax percent in line: \"" + line + "\"." };
    const r2 = (n) => Math.round(n * 100) / 100;
    const net = r2(qty * price * (1 - discPct / 100));
    const lineTax = r2(net * taxPct / 100);
    items.push({ name: parts[0], qty, price, discPct, taxPct, net, lineTax, amount: r2(net + lineTax) });
  }
  return { items };
}

function invoiceTotals(items, taxPct) {
  const subtotal = Math.round(items.reduce((sum, it) => sum + (it.net !== undefined ? it.net : it.amount), 0) * 100) / 100;
  const lineTax = Math.round(items.reduce((sum, it) => sum + (it.lineTax || 0), 0) * 100) / 100;
  const tax = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + lineTax + tax) * 100) / 100;
  return { subtotal, lineTax, tax, total };
}

function formatInvoiceNumber(year, seq) {
  return "INV-" + year + "-" + String(seq).padStart(3, "0");
}

/* ---------- Phase 2 handlers: Business ---------- */

function invoiceFormData() {
  return {
    business: ($("invoiceBusiness").value || "").trim(),
    client: ($("invoiceClient").value || "").trim(),
    date: ($("invoiceDate") || {}).value || "",
    due: ($("invoiceDue") || {}).value || "",
    number: ($("invoiceNumber") || {}).value || "",
    po: ($("invoicePo") || {}).value || "",
    bank: ($("invoiceBank") || {}).value || "",
    ntn: ($("invoiceNtn") || {}).value || "",
    notes: ($("invoiceNotes") || {}).value || "",
    tax: parseFloat($("invoiceTax").value),
    template: $("invoiceTemplate") ? $("invoiceTemplate").value : "1",
    itemsText: ($("invoiceItems") || {}).value || ""
  };
}

function buildInvoicePdf(data, items, totals) {
  const JsPDF = getJsPdf();
  if (!JsPDF) return null;
  const doc = new JsPDF();
  if (data.template === "2") {
    doc.setFillColor(79, 70, 229); doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text("INVOICE", 15, 18);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setFontSize(18); doc.text("INVOICE", 15, 20);
  }
  let y = data.template === "2" ? 40 : 32;
  doc.setFontSize(12);
  if (data.logo) {
    try {
      const fmt = data.logo.indexOf("image/jpeg") !== -1 || data.logo.indexOf("image/jpg") !== -1 ? "JPEG" : "PNG";
      doc.addImage(data.logo, fmt, 150, 8, 45, 18);
    } catch (e) { /* a bad logo must not block the invoice */ }
  }
  doc.text("From: " + data.business, 15, y); y += 8;
  doc.text("To: " + data.client, 15, y); y += 8;
  if (data.number) { doc.text("Invoice no: " + data.number, 15, y); y += 8; }
  if (data.date) { doc.text("Date: " + data.date, 15, y); y += 8; }
  if (data.due) { doc.text("Due date: " + data.due, 15, y); y += 8; }
  if (data.po) { doc.text("PO number: " + data.po, 15, y); y += 8; }
  y += 4;
  doc.setFontSize(11);
  doc.text("Item", 15, y); doc.text("Qty", 100, y); doc.text("Price", 125, y); doc.text("Amount", 165, y);
  y += 2; doc.line(15, y, 195, y); y += 6;
  items.forEach((it) => {
    if (y > 260) { doc.addPage(); y = 20; }
    const tag = (it.discPct > 0 ? it.discPct + "% off" : "") + (it.discPct > 0 && it.taxPct > 0 ? ", " : "") + (it.taxPct > 0 ? it.taxPct + "% tax" : "");
    const name = tag ? it.name + " (" + tag + ")" : it.name;
    const nameLines = doc.splitTextToSize(name, 80);
    doc.text(nameLines, 15, y);
    doc.text(String(it.qty), 100, y);
    doc.text(fmtTrim(it.price), 125, y);
    doc.text(it.amount.toFixed(2), 165, y);
    y += 7 * nameLines.length;
  });
  if (y > 240) { doc.addPage(); y = 20; }
  y += 4;
  doc.text("Subtotal: " + totals.subtotal.toFixed(2), 15, y); y += 8;
  if (totals.lineTax > 0) { doc.text("Line tax: " + totals.lineTax.toFixed(2), 15, y); y += 8; }
  doc.text("Tax (" + data.tax + "%): " + totals.tax.toFixed(2), 15, y); y += 8;
  doc.setFontSize(13); doc.text("Total: " + totals.total.toFixed(2), 15, y); y += 10;
  doc.setFontSize(11);
  if (data.bank) { doc.text("Bank details: " + data.bank, 15, y); y += 8; }
  if (data.ntn) { doc.text("NTN / GST: " + data.ntn, 15, y); y += 8; }
  if (data.template === "2" && data.notes) { doc.text("Notes: " + data.notes, 15, y); y += 8; }
  return doc;
}

const invoiceCalcBtn = $("invoiceCalcBtn");
if (invoiceCalcBtn) invoiceCalcBtn.addEventListener("click", () => {
  const parsed = parseInvoiceItems($("invoiceItems").value);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const tax = parseFloat($("invoiceTax").value);
  if (isNaN(tax) || tax < 0) { setError("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, tax);
  const lines = parsed.items.map((it) => it.name + " x " + it.qty + " @ " + it.price + (it.discPct > 0 ? " -" + it.discPct + "%" : "") + (it.taxPct > 0 ? " +" + it.taxPct + "% tax" : "") + " = " + it.amount.toFixed(2));
  let summary = lines.join("\n") + "\nSubtotal: " + totals.subtotal.toFixed(2);
  if (totals.lineTax > 0) summary += "\nLine tax: " + totals.lineTax.toFixed(2);
  summary += "\nTax (" + tax + "%): " + totals.tax.toFixed(2) + "\nTotal: " + totals.total.toFixed(2);
  $("invoiceSummary").textContent = summary;
  setStatus("invoiceStatus", "Done. Summary calculated.");
});

const invoicePdfBtn = $("invoicePdfBtn");
if (invoicePdfBtn) invoicePdfBtn.addEventListener("click", () => {
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "invoiceStatus")) return;
  const data = invoiceFormData();
  if (!data.business || !data.client) { setError("invoiceStatus", "Please enter both the business name and the client name."); return; }
  const parsed = parseInvoiceItems(data.itemsText);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  if (isNaN(data.tax) || data.tax < 0) { setError("invoiceStatus", "Please enter a tax percentage of 0 or more."); return; }
  const totals = invoiceTotals(parsed.items, data.tax);
  data.logo = window.__invoiceLogoDataUrl || null;
  if (!data.number) {
    let seq = 1;
    try { seq = (parseInt(window.localStorage.getItem("ak-invoice-seq") || "0", 10) || 0) + 1; window.localStorage.setItem("ak-invoice-seq", String(seq)); } catch (e) { seq = 1; }
    data.number = formatInvoiceNumber(new Date().getFullYear(), seq);
    const numEl = $("invoiceNumber");
    if (numEl) numEl.value = data.number;
  }
  const doc = buildInvoicePdf(data, parsed.items, totals);
  if (!doc) { setError("invoiceStatus", "Could not start the PDF. Please reload the page and try again."); return; }
  doc.save("ak-premium-invoice-" + data.number.replace(/[^A-Za-z0-9-]+/g, "-") + ".pdf");
  setStatus("invoiceStatus", "Done. Invoice PDF downloaded.");
});

const invoiceLogo = $("invoiceLogo");
if (invoiceLogo) invoiceLogo.addEventListener("change", () => {
  const f = invoiceLogo.files && invoiceLogo.files[0];
  if (!f) { window.__invoiceLogoDataUrl = null; return; }
  if (!/^image\/(png|jpe?g)$/i.test(f.type || "")) { setError("invoiceStatus", "Please choose a PNG or JPG logo."); invoiceLogo.value = ""; return; }
  const reader = new FileReader();
  reader.onload = () => { window.__invoiceLogoDataUrl = String(reader.result || ""); setStatus("invoiceStatus", "Done. Logo added to the invoice."); };
  reader.readAsDataURL(f);
});

const invoiceXlsxBtn = $("invoiceXlsxBtn");
if (invoiceXlsxBtn) invoiceXlsxBtn.addEventListener("click", () => {
  if (!window.XLSX) { setError("invoiceStatus", "The spreadsheet library did not load. Check your connection and try again."); return; }
  const data = invoiceFormData();
  const parsed = parseInvoiceItems(data.itemsText);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const totals = invoiceTotals(parsed.items, isNaN(data.tax) ? 0 : data.tax);
  const rows = [["Invoice", data.number || ""], ["From", data.business], ["To", data.client], ["Date", data.date], ["Due date", data.due], ["PO number", data.po], [], ["Item", "Quantity", "Price", "Discount %", "Tax %", "Amount"]];
  parsed.items.forEach((it) => rows.push([it.name, it.qty, it.price, it.discPct, it.taxPct, it.amount]));
  rows.push([], ["Subtotal", totals.subtotal], ["Line tax", totals.lineTax], ["Tax", totals.tax], ["Total", totals.total]);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(rows), "Invoice");
  window.XLSX.writeFile(wb, "ak-premium-invoice.xlsx");
  setStatus("invoiceStatus", "Done. Invoice spreadsheet downloaded.");
});

const invoiceCsvBtn = $("invoiceCsvBtn");
if (invoiceCsvBtn) invoiceCsvBtn.addEventListener("click", () => {
  const data = invoiceFormData();
  const parsed = parseInvoiceItems(data.itemsText);
  if (parsed.error) { setStatus("invoiceStatus", parsed.error); return; }
  const totals = invoiceTotals(parsed.items, isNaN(data.tax) ? 0 : data.tax);
  const q = (v) => "\"" + String(v).replace(/"/g, "\"\"") + "\"";
  const lines = [["Item", "Quantity", "Price", "Discount %", "Tax %", "Amount"].map(q).join(",")];
  parsed.items.forEach((it) => lines.push([it.name, it.qty, it.price, it.discPct, it.taxPct, it.amount].map(q).join(",")));
  lines.push("", "Subtotal," + totals.subtotal, "Line tax," + totals.lineTax, "Tax," + totals.tax, "Total," + totals.total);
  downloadText(lines.join("\n"), "ak-premium-invoice.csv", "text/csv");
  setStatus("invoiceStatus", "Done. Invoice CSV downloaded.");
});

const invoiceSaveBtn = $("invoiceSaveBtn");
if (invoiceSaveBtn) invoiceSaveBtn.addEventListener("click", () => {
  downloadText(JSON.stringify(invoiceFormData(), null, 2), "ak-premium-invoice.json", "application/json");
  setStatus("invoiceStatus", "Done. Invoice saved as JSON. Load it back with Load JSON.");
});

const invoiceLoadFile = $("invoiceLoadFile");
if (invoiceLoadFile) invoiceLoadFile.addEventListener("change", () => {
  const f = invoiceLoadFile.files && invoiceLoadFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ""));
      const map = { business: "invoiceBusiness", client: "invoiceClient", date: "invoiceDate", due: "invoiceDue", number: "invoiceNumber", po: "invoicePo", bank: "invoiceBank", ntn: "invoiceNtn", notes: "invoiceNotes", tax: "invoiceTax", itemsText: "invoiceItems", template: "invoiceTemplate" };
      Object.keys(map).forEach((k) => { const el = $(map[k]); if (el && data[k] !== undefined && data[k] !== null) el.value = String(data[k]); });
      setStatus("invoiceStatus", "Done. Invoice loaded from JSON.");
    } catch (e) { setError("invoiceStatus", "That file is not a saved invoice JSON file."); }
  };
  reader.readAsText(f);
});
