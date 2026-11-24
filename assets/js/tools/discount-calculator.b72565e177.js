/* AK Premium v12 — discount-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

function discountCalc(price, pct, extra) {
  if (isNaN(price) || price < 0) return { error: "Please enter an original price of 0 or more." };
  if (isNaN(pct) || pct < 0 || pct > 100) return { error: "Please enter a discount between 0 and 100 percent." };
  const e = extra || {};
  const r2 = (n) => Math.round(n * 100) / 100;
  const pct2 = e.pct2 === undefined || e.pct2 === null || e.pct2 === "" ? 0 : Number(e.pct2);
  const taxRate = e.taxRate === undefined || e.taxRate === null || e.taxRate === "" ? 0 : Number(e.taxRate);
  const delivery = e.delivery === undefined || e.delivery === null || e.delivery === "" ? 0 : Number(e.delivery);
  if (isNaN(pct2) || pct2 < 0 || pct2 > 100) return { error: "Please enter a second discount between 0 and 100 percent." };
  if (isNaN(taxRate) || taxRate < 0) return { error: "Please enter a tax rate of 0 or more." };
  if (isNaN(delivery) || delivery < 0) return { error: "Please enter a delivery charge of 0 or more." };
  const d1 = price * pct / 100;
  let after = price - d1;
  const d2 = after * pct2 / 100;
  after -= d2;
  const bogoSaving = e.bogo ? after / 3 : 0;
  after -= bogoSaving;
  const tax = after * taxRate / 100;
  const final = after + tax + delivery;
  const saved = price - after;
  const effectivePct = price > 0 ? saved / price * 100 : 0;
  const perUnit = e.bogo ? after / 3 : after;
  return { discount: r2(saved), final: r2(final), afterDiscounts: r2(after), firstDiscount: r2(d1), secondDiscount: r2(d2), bogoSaving: r2(bogoSaving), tax: r2(tax), delivery: r2(delivery), effectivePct: r2(effectivePct), perUnit: r2(perUnit) };
}

function reverseDiscount(salePrice, pct) {
  if (isNaN(salePrice) || salePrice < 0) return { error: "Please enter a sale price of 0 or more." };
  if (isNaN(pct) || pct < 0 || pct >= 100) return { error: "Please enter a discount between 0 and 100 percent." };
  const original = Math.round(salePrice / (1 - pct / 100) * 100) / 100;
  return { original, saved: Math.round((original - salePrice) * 100) / 100 };
}

/* ---------- v33: Calculators 2 + Pakistan ---------- */

const discBtn = $("discBtn");
if (discBtn) discBtn.addEventListener("click", () => {
  const mode = ($("discMode") || {}).value || "discount";
  if (mode === "reverse") {
    const result = reverseDiscount(parseFloat($("discSalePrice").value), parseFloat(($("discPctRev") || {}).value));
    if (result.error) { setError("discStatus", result.error); return; }
    if ($("discOutput")) $("discOutput").textContent = "Original price: " + fmtTrim(result.original) + ". You saved: " + fmtTrim(result.saved) + ".";
    setStatus("discStatus", "Done.");
    return;
  }
  const result = discountCalc(parseFloat($("discPrice").value), parseFloat($("discPct").value), {
    pct2: ($("discPct2") || {}).value,
    taxRate: ($("discTaxRate") || {}).value,
    delivery: ($("discDelivery") || {}).value,
    bogo: !!($("discBogo") && $("discBogo").checked)
  });
  if (result.error) { setError("discStatus", result.error); return; }
  let out = "Discount amount: " + fmtTrim(result.discount) + " (" + result.effectivePct + "% off)."
    + "\nPrice after discounts: " + fmtTrim(result.afterDiscounts) + "."
    + "\nPrice per item: " + fmtTrim(result.perUnit) + ".";
  if (result.secondDiscount > 0) out += "\nSecond discount: " + fmtTrim(result.secondDiscount) + ".";
  if (result.bogoSaving > 0) out += "\nBuy 2 get 1 free saved: " + fmtTrim(result.bogoSaving) + ".";
  if (result.tax > 0) out += "\nTax: " + fmtTrim(result.tax) + ".";
  if (result.delivery > 0) out += "\nDelivery: " + fmtTrim(result.delivery) + ".";
  out += "\nFinal price: " + fmtTrim(result.final) + ".";
  if ($("discOutput")) $("discOutput").textContent = out;
  setStatus("discStatus", "Done.");
});

const discModeSel = $("discMode");
if (discModeSel) discModeSel.addEventListener("change", () => {
  const saleRow = $("discSaleRow"), priceRow = $("discPriceRow"), extraRow = $("discExtraRow");
  const rev = discModeSel.value === "reverse";
  if (saleRow) saleRow.style.display = rev ? "" : "none";
  if (priceRow) priceRow.style.display = rev ? "none" : "";
  if (extraRow) extraRow.style.display = rev ? "none" : "";
});
["discPct2", "discTaxRate", "discDelivery", "discBogo", "discSalePrice"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
    if (discBtn && ($("discPrice") || {}).value !== "" && ($("discPct") || {}).value !== "") discBtn.click();
  });
});
