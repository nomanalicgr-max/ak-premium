/* AK Premium v12 — word-frequency (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const wfBtn = $("wfBtn");
if (wfBtn) wfBtn.addEventListener("click", () => {
  const input = ($("wfInput") || {}).value || "";
  if (!input.trim()) { setError("wfStatus", "Please paste some text first."); return; }
  const result = wordFrequency(input, !!($("wfStopwords") || {}).checked, ($("wfTop") || {}).value, { ngrams: true });
  if ($("wfOutput")) $("wfOutput").textContent = result.rows.length ? result.rows.map(([w, n]) => w + ": " + n).join("\n") : "No words found.";
  const ng = $("wfNgrams");
  if (ng) {
    const lines = [];
    if (result.bigrams && result.bigrams.length) lines.push("Common pairs: " + result.bigrams.map(([w, n]) => w + " (" + n + ")").join(", "));
    if (result.trigrams && result.trigrams.length) lines.push("Common triples: " + result.trigrams.map(([w, n]) => w + " (" + n + ")").join(", "));
    ng.textContent = lines.length ? lines.join("\n") : "No repeated pairs or triples.";
  }
  const bars = $("wfBars");
  if (bars) {
    bars.innerHTML = "";
    const top = result.rows.slice(0, 20);
    const max = top.length ? top[0][1] : 0;
    top.forEach(([w, n]) => {
      const row = document.createElement("div");
      row.className = "wf-bar-row";
      const label = document.createElement("span");
      label.textContent = w + " (" + n + ")";
      const bar = document.createElement("div");
      bar.className = "progress";
      const fill = document.createElement("span");
      fill.style.width = (max ? Math.round(n / max * 100) : 0) + "%";
      bar.appendChild(fill);
      row.appendChild(label);
      row.appendChild(bar);
      bars.appendChild(row);
    });
  }
  setStatus("wfStatus", "Done. " + result.total + " different word" + (result.total === 1 ? " counted." : "s counted."));
});

const wfDownloadBtn = $("wfDownloadBtn");
if (wfDownloadBtn) wfDownloadBtn.addEventListener("click", () => {
  const input = ($("wfInput") || {}).value || "";
  if (!input.trim()) { setStatus("wfStatus", "Paste some text and count it first, then use Download CSV."); return; }
  const result = wordFrequency(input, !!($("wfStopwords") || {}).checked, "all", { ngrams: true });
  const cell = (v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = ["word,count"];
  result.rows.forEach(([w, n]) => lines.push(cell(w) + "," + n));
  if (result.bigrams && result.bigrams.length) { lines.push(""); lines.push("phrase,count"); result.bigrams.forEach(([w, n]) => lines.push(cell(w) + "," + n)); }
  downloadText(lines.join("\n"), "ak-premium-word-frequency.csv", "text/csv;charset=utf-8");
  setStatus("wfStatus", "Done. CSV downloaded (" + result.total + " words).");
});
