/* AK Premium v12 — local-summarizer (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function summarizeTextTfIdf(text, count, mode) {
  const STOPWORDS = new Set(("a,an,the,and,or,but,if,then,else,when,at,by,for,with,about,against,between,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,am,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,shall,may,might,must,of,as,it,its,this,that,these,those,i,you,he,she,we,they,them,his,her,their,our,your,my,me,him,us,who,whom,which,what,how,why,where,also,per,via,etc").split(","));
  const flat = String(text || "").replace(/\n/g, " ");
  let sentences = flat.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 30);
  if (sentences.length < 2) sentences = flat.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 10);
  const n = sentences.length;
  if (!n) return { sentences: [], picked: 0 };
  const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const docs = sentences.map(tokenize);
  const df = {};
  docs.forEach((ws) => { const seen = new Set(ws); seen.forEach((w) => { df[w] = (df[w] || 0) + 1; }); });
  const jaccard = (a, b) => {
    const A = new Set(a), B = new Set(b);
    if (!A.size || !B.size) return 0;
    let inter = 0; A.forEach((w) => { if (B.has(w)) inter++; });
    return inter / (A.size + B.size - inter);
  };
  const scored = docs.map((ws, i) => {
    const tf = {};
    ws.forEach((w) => { tf[w] = (tf[w] || 0) + 1; });
    let score = 0;
    for (const w in tf) score += tf[w] * (Math.log(n / df[w]) + 1);
    score *= 1 + 0.5 * (1 - i / Math.max(1, n - 1)); /* position: earlier sentences weigh more */
    return { i, s: sentences[i], words: ws, score };
  }).sort((a, b) => b.score - a.score);
  const want = Math.min(Math.max(1, count || 5), n);
  const picked = [];
  for (const cand of scored) {
    if (picked.length >= want) break;
    if (picked.some((p) => jaccard(cand.words, p.words) > 0.6)) continue; /* near-duplicate */
    picked.push(cand);
  }
  const ordered = picked.slice().sort((a, b) => a.i - b.i);
  if (mode === "paragraph") return { sentences: ordered.map((x) => x.s), picked: picked.length };
  return { sentences: picked.map((x) => x.s), picked: picked.length };
}

const summaryCount = $("summaryCount");
if (summaryCount) summaryCount.addEventListener("input", () => {
  const label = $("summaryCountLabel"); if (label) label.textContent = summaryCount.value;
});

const summaryPdfBtn = $("summaryPdfBtn");
let summaryLastText = "";
if (summaryPdfBtn) summaryPdfBtn.addEventListener("click", async () => {
  const file = ($("summaryInput").files || [])[0]; if (!file) { setError("summaryPdfStatus", "Please select a PDF file first."); return; }
  try {
    const text = await extractPdfText(file, "summaryPdfStatus"); if (text === null) return;
    const n = parseInt(($("summaryCount") || {}).value || "5", 10) || 5;
    const mode = $("summaryMode") ? $("summaryMode").value : "points";
    const res = summarizeTextTfIdf(text, n, mode);
    if (!res.sentences.length) { setError("summaryPdfStatus", "No sentences long enough to summarise were found in this PDF."); return; }
    summaryLastText = mode === "paragraph" ? res.sentences.join(" ") : res.sentences.map((x) => "- " + x).join("\n");
    $("summaryPdfOutput").textContent = summaryLastText;
    if ($("summaryDownloadBtn")) $("summaryDownloadBtn").style.display = "";
    setStatus("summaryPdfStatus", "Done. " + res.picked + " key sentence(s) shown above (TF-IDF scoring, in your browser). This is an extractive summary: sentences picked from your document, not rewritten. No AI server was used.");
  } catch (e) { if (!setPdfError("summaryPdfStatus", e)) setError("summaryPdfStatus", "Could not summarize this PDF."); }
});

const summaryDownloadBtn = $("summaryDownloadBtn");
if (summaryDownloadBtn) summaryDownloadBtn.addEventListener("click", () => {
  if (!summaryLastText) { setError("summaryPdfStatus", "Summarize a PDF first, then download the summary."); return; }
  downloadText(summaryLastText, "ak-premium-summary.txt");
  setStatus("summaryPdfStatus", "Done. Summary downloaded as ak-premium-summary.txt.");
});
/* Glossary-based translation of common document terms. Fixed word list
   only: terms found in the extracted text are matched (English by word,
   Urdu by substring) and returned in first-appearance order. This is NOT
   full translation: sentences, grammar and words outside the glossary are
   left as they are. Real full translation needs a translation service. */
