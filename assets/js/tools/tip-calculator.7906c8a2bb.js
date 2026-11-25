/* AK Premium v12 — tip-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

function tipCalc(bill, pct, people, extra) {
  if (isNaN(bill) || bill < 0) return { error: "Please enter a bill amount of 0 or more." };
  if (isNaN(pct) || pct < 0) return { error: "Please enter a tip percent of 0 or more." };
  if (!people || people < 1 || Math.floor(people) !== people) return { error: "Please enter a whole number of people, at least 1." };
  const e = extra || {};
  const tax = Number(e.tax) || 0;
  const service = Number(e.service) || 0;
  if (tax < 0) return { error: "Please enter a tax amount of 0 or more." };
  if (service < 0) return { error: "Please enter a service charge of 0 or more." };
  const r2 = (n) => Math.round(n * 100) / 100;
  const base = e.tipOnTax ? bill + tax : bill;
  const tip = r2(base * pct / 100);
  let total = r2(bill + tax + service + tip);
  let perPerson = r2(total / people);
  let roundedUp = 0;
  const roundUp = Number(e.roundUp) || 0;
  if (roundUp > 0) {
    const roundedPer = Math.ceil(perPerson / roundUp) * roundUp;
    roundedUp = r2((roundedPer - perPerson) * people);
    perPerson = roundedPer;
    total = r2(roundedPer * people);
  }
  return { tip, total, perPerson, tax: r2(tax), service: r2(service), roundedUp };
}

function tipSplitByItems(text, bill, pct, tax, service, tipOnTax) {
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return null;
  const items = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length !== 2 || !parts[0]) return { error: "Invalid item line: \"" + line + "\". Use: Name, amount." };
    const amount = parseFloat(parts[1]);
    if (isNaN(amount) || amount < 0) return { error: "Invalid amount in line: \"" + line + "\"." };
    items.push({ name: parts[0], amount });
  }
  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  if (subtotal <= 0) return { error: "The item amounts must add up to more than 0." };
  if (Math.abs(subtotal - bill) > 0.01) return { error: "The item amounts add up to " + subtotal + ", but the bill is " + bill + ". Make them match." };
  const r2 = (n) => Math.round(n * 100) / 100;
  const base = tipOnTax ? bill + tax : bill;
  const tip = base * pct / 100;
  const rows = items.map((it) => {
    const share = it.amount / subtotal;
    return { name: it.name, items: r2(it.amount), tip: r2(tip * share), tax: r2(tax * share), service: r2(service * share), total: r2(it.amount + tip * share + tax * share + service * share) };
  });
  return { rows, subtotal: r2(subtotal), tip: r2(tip) };
}
// Offset (ms) of a time zone at a given instant, via Intl formatToParts.

/* ---------- v33: Calculators 2 + Pakistan ---------- */

const tipBtn = $("tipBtn");
if (tipBtn) tipBtn.addEventListener("click", () => {
  const result = tipCalc(parseFloat($("tipBill").value), parseFloat($("tipPct").value), parseFloat($("tipPeople").value), {
    tax: ($("tipTax") || {}).value,
    service: ($("tipService") || {}).value,
    tipOnTax: !!($("tipOnTax") && $("tipOnTax").checked),
    roundUp: ($("tipRound") || {}).value
  });
  if (result.error) { setError("tipStatus", result.error); return; }
  let out = "Tip: " + fmtTrim(result.tip) + ". Total: " + fmtTrim(result.total) + ". Each person pays: " + fmtTrim(result.perPerson) + ".";
  if (result.tax > 0) out += "\nTax: " + fmtTrim(result.tax) + ".";
  if (result.service > 0) out += "\nService charge: " + fmtTrim(result.service) + ".";
  if (result.roundedUp > 0) out += "\nRounded up by " + fmtTrim(result.roundedUp) + " so each person pays a whole amount.";
  if ($("tipOutput")) $("tipOutput").textContent = out;
  const itemsOut = $("tipItemsOut");
  if (itemsOut) {
    const split = tipSplitByItems(($("tipItems") || {}).value, parseFloat($("tipBill").value), parseFloat($("tipPct").value), result.tax, result.service, !!($("tipOnTax") && $("tipOnTax").checked));
    if (split && split.error) { itemsOut.innerHTML = "<p>" + escapeHtml(split.error) + "</p>"; }
    else if (split) {
      let html = "<table><thead><tr><th>Person</th><th>Items</th><th>Tip</th><th>Tax</th><th>Service</th><th>Total</th></tr></thead><tbody>";
      split.rows.forEach((r) => {
        html += "<tr><td>" + escapeHtml(r.name) + "</td><td>" + fmtTrim(r.items) + "</td><td>" + fmtTrim(r.tip) + "</td><td>" + fmtTrim(r.tax) + "</td><td>" + fmtTrim(r.service) + "</td><td>" + fmtTrim(r.total) + "</td></tr>";
      });
      itemsOut.innerHTML = html + "</tbody></table>";
    } else itemsOut.innerHTML = "";
  }
  setStatus("tipStatus", "Done.");
});
document.querySelectorAll("#tool-tip [data-tip-preset]").forEach((b) => b.addEventListener("click", () => {
  const inp = $("tipPct");
  if (inp) { inp.value = b.getAttribute("data-tip-preset"); if (tipBtn && ($("tipBill") || {}).value !== "") tipBtn.click(); }
}));
["tipTax", "tipService", "tipOnTax", "tipRound", "tipItems"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
    if (tipBtn && ($("tipBill") || {}).value !== "" && ($("tipPct") || {}).value !== "" && ($("tipPeople") || {}).value !== "") tipBtn.click();
  });
});
