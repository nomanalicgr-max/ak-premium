/* AK Premium v12 — local-summarizer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New tools (all in browser) ---------- */

const summaryPdfBtn = $("summaryPdfBtn");
if (summaryPdfBtn) summaryPdfBtn.addEventListener("click", async () => {
  const file = ($("summaryInput").files || [])[0]; if (!file) { setError("summaryPdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "summaryPdfStatus"); if (text === null) return;
    const sentences = text.replace(/\n/g, " ").split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length > 30);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w=>w.length > 3);
    const freq = {}; words.forEach(w=>freq[w]=(freq[w]||0)+1);
    const scored = sentences.map(s=>({ s, score: s.toLowerCase().split(/\s+/).reduce((a,w)=>a+(freq[w]||0),0) })).sort((a,b)=>b.score-a.score);
    const n = parseInt($("summaryCount").value, 10) || 5;
    $("summaryPdfOutput").textContent = scored.slice(0, n).map(x=>"- " + x.s).join("\n");
    setStatus("summaryPdfStatus", "Done. Local summary shown above. No AI server was used.");
  } catch (e) { if (!setPdfError("summaryPdfStatus", e)) setError("summaryPdfStatus", "Could not summarize this PDF."); }
});
