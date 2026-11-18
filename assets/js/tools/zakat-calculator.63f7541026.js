/* AK Premium v12 — zakat-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initZakat() {
  const btn = $("zakatBtn"); if (!btn) return;
  btn.addEventListener("click", async () => {
    const cash = parseFloat(($("zakatCash").value || "0")) || 0;
    const gold = parseFloat(($("zakatGold").value || "0")) || 0;
    const silver = parseFloat(($("zakatSilver").value || "0")) || 0;
    const debts = parseFloat(($("zakatDebts").value || "0")) || 0;
    const goldRate = parseFloat(($("zakatGoldRate").value || "0")) || 0;
    const silverRate = parseFloat(($("zakatSilverRate").value || "0")) || 0;
    const net = cash + gold * goldRate + silver * silverRate - debts;
    const nisabSilver = 52.5 * silverRate, nisabGold = 7.5 * goldRate;
    const customNisab = parseFloat(($("zakatNisab") && $("zakatNisab").value) || "0") || 0;
    const nisab = customNisab > 0 ? customNisab : (silverRate > 0 ? nisabSilver : nisabGold);
    const due = net >= nisab && nisab > 0 ? net * 0.025 : 0;
    const el = $("zakatOutput");
    if (el) el.textContent = "Net zakatable wealth: Rs " + fmtMoney(net) + "\nNisab (" + (customNisab > 0 ? "your custom nisab" : "52.5 tola silver at your rate") + "): Rs " + fmtMoney(nisab) + "\nZakat due (2.5%): Rs " + fmtMoney(due) + (due === 0 ? "\nNo Zakat is due, because your wealth is below the nisab." : "") + "\n\nNisab is 7.5 tola gold or 52.5 tola silver. The government bank-deduction nisab for Ramadan 2026 was reported as Rs 503,529, but that figure was not directly verified from an official source, and the government re-notifies it every year — verify before relying on it. This calculator is an estimate only, not religious advice.";
    setStatus("zakatStatus", "Done. This is an estimate only.");
  });
})();
/* Amount to words: English and Urdu, for invoices and cheques. */
