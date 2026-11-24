/* AK Premium v12 — amount-to-words (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function amountWordsFor(amount, currency, paisaMode) {
  if (isNaN(amount) || amount < 0 || amount >= 10000000000000) return { error: "Please enter an amount from 0 to 9,999,999,999,999." };
  const maps = {
    pkr: { en: "rupees", enSub: "paisa", ur: "روپے", urSub: "پیسے" },
    usd: { en: "dollars", enSub: "cents", ur: "ڈالر", urSub: "سینٹ" },
    gbp: { en: "pounds", enSub: "pence", ur: "پاؤنڈ", urSub: "پینس" },
    aed: { en: "dirhams", enSub: "fils", ur: "درہم", urSub: "فلس" }
  };
  const m = maps[currency] || maps.pkr;
  let rupees = Math.floor(amount), paisa = Math.round((amount - rupees) * 100);
  if (paisaMode === "round") { rupees = Math.round(amount); paisa = 0; }
  else if (paisaMode === "down") { rupees = Math.floor(amount); paisa = 0; }
  if (paisa === 100) { rupees += 1; paisa = 0; }
  const en = numToWordsEn(rupees) + " " + m.en + (paisa ? " and " + numToWordsEn(paisa) + " " + m.enSub : "") + " only";
  const ur = numToWordsUr(rupees) + " " + m.ur + (paisa ? " اور " + numToWordsUr(paisa) + " " + m.urSub : "") + " صرف";
  return { en, ur, rupees, paisa };
}

function chequeLine(amount, currency, payee, dateStr) {
  const words = amountWordsFor(amount, currency, "exact");
  if (words.error) return words;
  const who = String(payee || "").trim();
  if (!who) return { error: "Please enter the payee name for the cheque line." };
  const when = String(dateStr || "").trim();
  let whenText = "";
  if (when) {
    const d = new Date(when + "T00:00:00");
    whenText = isNaN(d.getTime()) ? when : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  return { line: "Pay " + who + " the sum of " + words.en + (whenText ? " on " + whenText : "") + ".", en: words.en, ur: words.ur };
}
// Urdu-aware text stats. Words split on spaces only, so ZWNJ-joined words
// stay one word and Arabic-Indic digits stay inside their words.

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initAmountWords() {
  const btn = $("amountWordsBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const raw = ($("amountWordsInput").value || "").trim().replace(/,/g, "");
    const amount = parseFloat(raw);
    const words = amountWordsFor(amount, ($("atwCurrency") || {}).value || "pkr", ($("atwPaisa") || {}).value || "exact");
    if (words.error) { setError("amountWordsStatus", words.error); return; }
    const el = $("amountWordsOutput");
    if (el) { el.innerHTML = ""; const p1 = document.createElement("p"); p1.textContent = words.en; const p2 = document.createElement("p"); p2.setAttribute("dir", "rtl"); p2.setAttribute("lang", "ur"); p2.textContent = words.ur; el.appendChild(p1); el.appendChild(p2); }
    const payee = ($("atwPayee") || {}).value || "";
    const chequeEl = $("amountWordsCheque");
    if (chequeEl) {
      if (payee.trim()) {
        const cl = chequeLine(amount, ($("atwCurrency") || {}).value || "pkr", payee, ($("atwDate") || {}).value || "");
        chequeEl.textContent = cl.error ? "" : cl.line;
      } else {
        chequeEl.textContent = "";
      }
    }
    setStatus("amountWordsStatus", "Done.");
  });
  const copyBtn = $("atwCopyBtn");
  if (copyBtn) copyBtn.addEventListener("click", async () => {
    const el = $("amountWordsOutput");
    const text = el ? el.textContent : "";
    if (!text.trim()) { setError("amountWordsStatus", "Write an amount in words first."); return; }
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = "Copied"; setTimeout(() => { copyBtn.textContent = "Copy Both Lines"; }, 1500); }
    catch (e) { setError("amountWordsStatus", "Copy did not work in this browser. Select the lines and copy them by hand."); }
  });
  const copyChequeBtn = $("atwCopyChequeBtn");
  if (copyChequeBtn) copyChequeBtn.addEventListener("click", async () => {
    const el = $("amountWordsCheque");
    const text = el ? el.textContent : "";
    if (!text.trim()) { setError("amountWordsStatus", "Enter a payee name and press Write in Words first."); return; }
    try { await navigator.clipboard.writeText(text); copyChequeBtn.textContent = "Copied"; setTimeout(() => { copyChequeBtn.textContent = "Copy Cheque Line"; }, 1500); }
    catch (e) { setError("amountWordsStatus", "Copy did not work in this browser. Select the line and copy it by hand."); }
  });
})();
/* Urdu word / character counter. */
