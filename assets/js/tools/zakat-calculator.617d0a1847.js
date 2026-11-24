/* AK Premium v12 — zakat-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function zakatTotals(o) {
  const fx = o.currency === "usd" ? (Number(o.fxRate) || 0) : 1;
  if (o.currency === "usd" && (!fx || fx <= 0)) return { error: "Please enter the rupee rate for one US dollar." };
  const cash = (Number(o.cash) || 0) * fx;
  const debts = (Number(o.debts) || 0) * fx;
  const trade = (Number(o.trade) || 0) * fx;
  const shares = (Number(o.shares) || 0) * fx;
  const loans = (Number(o.loans) || 0) * fx;
  const goldVal = (Number(o.gold) || 0) * (Number(o.goldRate) || 0);
  const silverVal = (Number(o.silver) || 0) * (Number(o.silverRate) || 0);
  const forexVal = (Number(o.forex) || 0) * (Number(o.forexRate) || 0);
  if (cash < 0 || debts < 0 || trade < 0 || shares < 0 || loans < 0 || goldVal < 0 || silverVal < 0 || forexVal < 0) return { error: "Amounts cannot be negative." };
  const gross = cash + goldVal + silverVal + trade + shares + loans + forexVal;
  const net = gross - debts;
  const nisabGold = (Number(o.goldRate) || 0) > 0 ? 7.5 * (Number(o.goldRate) || 0) : 0;
  const nisabSilver = (Number(o.silverRate) || 0) > 0 ? 52.5 * (Number(o.silverRate) || 0) : 0;
  const custom = Number(o.customNisab) || 0;
  if (gross <= 0 && custom <= 0 && nisabGold <= 0 && nisabSilver <= 0) return { error: "Enter at least one asset and a gold or silver rate, or a custom nisab." };
  const nisab = custom > 0 ? custom : (o.nisabMode === "gold" ? nisabGold : nisabSilver);
  return { gross: Math.round(gross), net: Math.round(net), nisabGold: Math.round(nisabGold), nisabSilver: Math.round(nisabSilver), nisab: Math.round(nisab), custom: custom > 0, due: (net >= nisab && nisab > 0) ? Math.round(net * 0.025) : 0 };
}
// Lunar-year (hawl) completion: one lunar year is about 354 days. The
// Hijri date shown for today comes from the browser's Islamic calendar.

function hijriYearEnd(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return { error: "Please pick the date your wealth first reached the nisab." };
  const end = new Date(d);
  end.setDate(end.getDate() + 354);
  let hijriToday = "";
  try { hijriToday = new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }).format(new Date()); } catch (e) { hijriToday = ""; }
  return { end, hijriToday };
}
// Amount in words for a currency (names only, no conversion). Arab is
// 1,000,000,000 and kharab is 100,000,000,000 in the South Asian system.

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initZakat() {
  const btn = $("zakatBtn"); if (!btn) return;
  btn.addEventListener("click", async () => {
    const totals = zakatTotals({
      cash: $("zakatCash").value, debts: $("zakatDebts").value,
      gold: $("zakatGold").value, goldRate: $("zakatGoldRate").value,
      silver: $("zakatSilver").value, silverRate: $("zakatSilverRate").value,
      trade: ($("zakatTrade") || {}).value, shares: ($("zakatShares") || {}).value,
      forex: ($("zakatForex") || {}).value, forexRate: ($("zakatForexRate") || {}).value,
      loans: ($("zakatLoans") || {}).value,
      currency: ($("zakatCurrency") || {}).value || "pkr",
      fxRate: ($("zakatFxRate") || {}).value,
      nisabMode: ($("zakatNisabMode") || {}).value || "silver",
      customNisab: ($("zakatNisab") && $("zakatNisab").value) || "0"
    });
    if (totals.error) { setError("zakatStatus", totals.error); return; }
    const usd = (($("zakatCurrency") || {}).value || "pkr") === "usd";
    const fxRate = parseFloat(($("zakatFxRate") || {}).value) || 0;
    let out = "Total zakatable wealth: Rs " + fmtMoney(totals.gross) + "\nDebts subtracted: Rs " + fmtMoney(totals.gross - totals.net) + "\nNet zakatable wealth: Rs " + fmtMoney(totals.net);
    out += "\nNisab by gold (7.5 tola): " + (totals.nisabGold > 0 ? "Rs " + fmtMoney(totals.nisabGold) : "enter a gold rate to see it");
    out += "\nNisab by silver (52.5 tola): " + (totals.nisabSilver > 0 ? "Rs " + fmtMoney(totals.nisabSilver) : "enter a silver rate to see it");
    out += "\nNisab used: Rs " + fmtMoney(totals.nisab) + (totals.custom ? " (your custom nisab)" : ((($("zakatNisabMode") || {}).value || "silver") === "gold" ? " (gold nisab)" : " (silver nisab)"));
    out += "\nZakat due (2.5%): Rs " + fmtMoney(totals.due) + (totals.due === 0 ? "\nNo Zakat is due, because your wealth is below the nisab." : "");
    if (usd) out += "\n\nAmounts were entered in US dollars and converted at Rs " + fxRate.toLocaleString("en-PK") + " per dollar, the rate you typed.";
    const hawlDate = ($("zakatHawlDate") || {}).value;
    if (hawlDate) {
      const hawl = hijriYearEnd(hawlDate);
      if (!hawl.error) {
        const endIso = hawl.end.getFullYear() + "-" + String(hawl.end.getMonth() + 1).padStart(2, "0") + "-" + String(hawl.end.getDate()).padStart(2, "0");
        out += "\n\nLunar year: wealth first reached the nisab on " + hawlDate + ", so one lunar year (about 354 days) ends around " + endIso + ". Zakat is due once that year has passed.";
        if (hawl.hijriToday) out += " Today is " + hawl.hijriToday + ".";
      }
    }
    out += "\n\nNisab is 7.5 tola gold or 52.5 tola silver. The government bank-deduction nisab for Ramadan 2026 was reported as Rs 503,529, but that figure was not directly verified from an official source, and the government re-notifies it every year — verify before relying on it. This calculator is an estimate only, not religious advice.";
    const el = $("zakatOutput");
    if (el) el.textContent = out;
    setStatus("zakatStatus", "Done. This is an estimate only.");
  });
})();
/* Amount to words: English and Urdu, for invoices and cheques. */
