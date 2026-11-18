/* AK Premium v12 — compare-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const comparePdfBtn = $("comparePdfBtn");
if (comparePdfBtn) comparePdfBtn.addEventListener("click", async () => {
  const a = ($("compareInputA").files || [])[0], b = ($("compareInputB").files || [])[0];
  if (!a || !b) { setError("comparePdfStatus", "Please select two PDF files."); return; }
  try {
    const ta = await extractPdfText(a, "comparePdfStatus"); const tb = await extractPdfText(b, "comparePdfStatus");
    const la = new Set(ta.split("\n").map(s=>s.trim()).filter(Boolean)); const lb = new Set(tb.split("\n").map(s=>s.trim()).filter(Boolean));
    const onlyA = [...la].filter(x=>!lb.has(x)); const onlyB = [...lb].filter(x=>!la.has(x));
    $("comparePdfOutput").textContent = "Only in first PDF:\n" + (onlyA.join("\n") || "(none)") + "\n\nOnly in second PDF:\n" + (onlyB.join("\n") || "(none)");
    setStatus("comparePdfStatus", "Done. " + onlyA.length + " line(s) only in first, " + onlyB.length + " only in second.");
  } catch (e) { if (!setPdfError("comparePdfStatus", e)) setError("comparePdfStatus", "Could not compare these PDFs."); }
});
