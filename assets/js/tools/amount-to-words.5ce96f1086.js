/* AK Premium v12 — amount-to-words (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initAmountWords() {
  const btn = $("amountWordsBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const raw = ($("amountWordsInput").value || "").trim().replace(/,/g, "");
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount < 0 || amount >= 1000000000) { setError("amountWordsStatus", "Please enter an amount from 0 to 999,999,999."); return; }
    const rupees = Math.floor(amount), paisa = Math.round((amount - rupees) * 100);
    const en = numToWordsEn(rupees) + " rupees" + (paisa ? " and " + numToWordsEn(paisa) + " paisa" : "") + " only";
    const ur = numToWordsUr(rupees) + " روپے" + (paisa ? " اور " + numToWordsUr(paisa) + " پیسے" : "") + " صرف";
    const el = $("amountWordsOutput");
    if (el) { el.innerHTML = ""; const p1 = document.createElement("p"); p1.textContent = en; const p2 = document.createElement("p"); p2.setAttribute("dir", "rtl"); p2.setAttribute("lang", "ur"); p2.textContent = ur; el.appendChild(p1); el.appendChild(p2); }
    setStatus("amountWordsStatus", "Done.");
  });
})();
/* Urdu word / character counter. */
