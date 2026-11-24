/* AK Premium v12 — translate-helper (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function glossaryTranslate(text, direction) {
  const GLOSSARY = [
    ["invoice", "\u0627\u0646\u0648\u0627\u0626\u0633"], ["bill", "\u0628\u0644"], ["receipt", "\u0631\u0633\u06cc\u062f"],
    ["total", "\u06a9\u0644 \u0631\u0642\u0645"], ["subtotal", "\u0630\u06cc\u0644\u06cc \u0645\u062c\u0645\u0648\u0639\u06c1"],
    ["discount", "\u0631\u0639\u0627\u06cc\u062a"], ["tax", "\u0679\u06cc\u06a9\u0633"], ["amount", "\u0631\u0642\u0645"],
    ["price", "\u0642\u06cc\u0645\u062a"], ["quantity", "\u0645\u0642\u062f\u0627\u0631"], ["date", "\u062a\u0627\u0631\u06cc\u062e"],
    ["time", "\u0648\u0642\u062a"], ["name", "\u0646\u0627\u0645"], ["address", "\u067e\u062a\u06c1"],
    ["phone", "\u0641\u0648\u0646"], ["email", "\u0627\u06cc \u0645\u06cc\u0644"], ["customer", "\u06af\u0627\u06c1\u06a9"],
    ["client", "\u06a9\u0644\u0627\u0626\u0646\u0679"], ["order", "\u0622\u0631\u0688\u0631"], ["delivery", "\u062a\u0631\u0633\u06cc\u0644"],
    ["payment", "\u0627\u062f\u0627\u0626\u06cc\u06af\u06cc"], ["due", "\u0648\u0627\u062c\u0628 \u0627\u0644\u0627\u062f\u0627"],
    ["balance", "\u0628\u0642\u0627\u06cc\u0627"], ["signature", "\u062f\u0633\u062a\u062e\u0637"], ["paid", "\u0627\u062f\u0627 \u0634\u062f\u06c1"],
    ["unpaid", "\u063a\u06cc\u0631 \u0627\u062f\u0627 \u0634\u062f\u06c1"], ["cash", "\u0646\u0642\u062f"], ["bank", "\u0628\u06cc\u0646\u06a9"],
    ["account", "\u06a9\u06be\u0627\u062a\u06c1"], ["number", "\u0646\u0645\u0628\u0631"], ["item", "\u0622\u0626\u0679\u0645"],
    ["description", "\u062a\u0641\u0635\u06cc\u0644"], ["unit", "\u0627\u06a9\u0627\u0626\u06cc"], ["rate", "\u0634\u0631\u062d"],
    ["service", "\u062e\u062f\u0645\u062a"], ["product", "\u0645\u0635\u0646\u0648\u0639\u0627\u062a"], ["company", "\u06a9\u0645\u067e\u0646\u06cc"],
    ["seller", "\u0628\u06cc\u0686\u0646\u06d2 \u0648\u0627\u0644\u0627"], ["buyer", "\u062e\u0631\u06cc\u062f\u0627\u0631"], ["purchase", "\u062e\u0631\u06cc\u062f\u0627\u0631\u06cc"],
    ["sale", "\u0641\u0631\u0648\u062e\u062a"], ["refund", "\u0648\u0627\u067e\u0633\u06cc"], ["warranty", "\u0648\u0627\u0631\u0646\u0679\u06cc"],
    ["weight", "\u0648\u0632\u0646"], ["size", "\u0633\u0627\u0626\u0632"], ["color", "\u0631\u0646\u06af"], ["colour", "\u0631\u0646\u06af"],
    ["code", "\u06a9\u0648\u0688"], ["reference", "\u062d\u0648\u0627\u0644\u06c1"], ["note", "\u0646\u0648\u0679"],
    ["thank you", "\u0634\u06a9\u0631\u06cc\u06c1"], ["please", "\u0628\u0631\u0627\u06c1 \u06a9\u0631\u0645"],
    ["terms", "\u0634\u0631\u0627\u0626\u0637"], ["conditions", "\u0634\u0631\u0627\u0626\u0637"], ["agreement", "\u0645\u0639\u0627\u06c1\u062f\u06c1"],
    ["contract", "\u0645\u0639\u0627\u06c1\u062f\u06c1"], ["form", "\u0641\u0627\u0631\u0645"], ["application", "\u062f\u0631\u062e\u0648\u0627\u0633\u062a"],
    ["office", "\u062f\u0641\u062a\u0631"], ["manager", "\u0645\u06cc\u0646\u06cc\u062c\u0631"], ["employee", "\u0645\u0644\u0627\u0632\u0645"],
    ["salary", "\u062a\u0646\u062e\u0648\u0627\u06c1"], ["month", "\u0645\u06c1\u06cc\u0646\u06c1"], ["year", "\u0633\u0627\u0644"],
    ["day", "\u062f\u0646"], ["week", "\u06c1\u0641\u062a\u06c1"], ["city", "\u0634\u06c1\u0631"], ["country", "\u0645\u0644\u06a9"],
    ["postal", "\u0688\u0627\u06a9"], ["school", "\u0627\u0633\u06a9\u0648\u0644"], ["student", "\u0637\u0627\u0644\u0628 \u0639\u0644\u0645"],
    ["teacher", "\u0627\u0633\u062a\u0627\u0630"], ["hospital", "\u06c1\u0633\u067e\u062a\u0627\u0644"], ["doctor", "\u0688\u0627\u06a9\u0679\u0631"],
    ["passport", "\u067e\u0627\u0633\u067e\u0648\u0631\u0679"], ["ticket", "\u0679\u06a9\u0679"], ["booking", "\u0628\u06a9\u0646\u06af"]
  ];
  const src = String(text || "");
  const found = [];
  if (direction === "ur-en") {
    for (const [en, ur] of GLOSSARY) {
      const at = src.indexOf(ur);
      if (at !== -1) found.push({ from: ur, to: en, at });
    }
  } else {
    const lower = src.toLowerCase();
    for (const [en, ur] of GLOSSARY) {
      const re = new RegExp("\\b" + en.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\b", "i");
      const m = lower.match(re);
      if (m) found.push({ from: en, to: ur, at: m.index });
    }
  }
  found.sort((a, b) => a.at - b.at);
  return { matches: found, glossarySize: GLOSSARY.length };
}

const translatePdfBtn = $("translatePdfBtn");
let translateLastText = "";
if (translatePdfBtn) translatePdfBtn.addEventListener("click", async () => {
  const file = ($("translateInput").files || [])[0]; if (!file) { setError("translatePdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "translatePdfStatus"); if (text === null) return;
    translateLastText = text;
    const direction = $("translateDir") ? $("translateDir").value : "en-ur";
    const res = glossaryTranslate(text, direction);
    const out = $("translateOutput");
    if (out) {
      out.innerHTML = "";
      if (!res.matches.length) {
        out.textContent = "No glossary terms found in this PDF. The glossary covers " + res.glossarySize + " common document words (invoice, total, date, payment and similar).";
      } else {
        const table = document.createElement("table"); table.className = "glossary-table";
        const head = document.createElement("tr");
        head.innerHTML = "<th>" + (direction === "ur-en" ? "Urdu" : "English") + "</th><th>" + (direction === "ur-en" ? "English" : "Urdu") + "</th>";
        table.appendChild(head);
        for (const m of res.matches) {
          const tr = document.createElement("tr");
          const a = document.createElement("td"); a.textContent = m.from;
          const b = document.createElement("td"); b.textContent = m.to;
          tr.appendChild(a); tr.appendChild(b); table.appendChild(tr);
        }
        out.appendChild(table);
      }
    }
    if ($("translateDownloadBtn")) $("translateDownloadBtn").style.display = "";
    setStatus("translatePdfStatus", "Done. Found " + res.matches.length + " glossary term(s) from a fixed list of " + res.glossarySize + " common document words. This is glossary matching only, not full translation: sentences and words outside the list are left as they are. No text was sent to a translation server.");
  } catch (e) { if (!setPdfError("translatePdfStatus", e)) setError("translatePdfStatus", "Could not extract text from this PDF."); }
});

const translateDownloadBtn = $("translateDownloadBtn");
if (translateDownloadBtn) translateDownloadBtn.addEventListener("click", () => {
  if (!translateLastText) { setError("translatePdfStatus", "Find the glossary terms first, then download the extracted text."); return; }
  downloadText(translateLastText, "ak-premium-for-translation.txt");
  setStatus("translatePdfStatus", "Done. Extracted text downloaded, ready to translate elsewhere.");
});


/* More dropdown: horizontal panel, closes on selection or outside click */
