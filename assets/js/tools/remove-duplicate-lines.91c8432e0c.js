/* AK Premium v12 — remove-duplicate-lines (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

function levenshtein(a, b) {
  const x = String(a || ""), y = String(b || "");
  if (x === y) return 0;
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = [], cur = [];
  for (let j = 0; j <= y.length; j++) prev[j] = j;
  for (let i = 1; i <= x.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const cost = x.charAt(i - 1) === y.charAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[y.length];
}
// Punctuation marks whose presence alone is ignored when the
// ignore-punctuation box is ticked (Latin plus Urdu/Arabic marks).
const DEDUPE_PUNCT = /[.,;:!?'"()\[\]{}،۔؟؛«»\-–—_\/\\|@#$%^&*+=~`]/g;

function dedupeLines(text, caseSensitive, opts) {
  opts = opts || {};
  const keepLast = opts.keep === "last";
  const ignorePunct = !!opts.ignorePunctuation;
  const fuzzy = opts.fuzzy ? Math.max(0, Math.min(100, parseInt(opts.fuzzyLevel, 10) || 90)) / 100 : 0;
  const normKey = (t) => {
    let k = caseSensitive ? t : t.toLowerCase();
    if (ignorePunct) k = k.replace(DEDUPE_PUNCT, "");
    return k;
  };
  const lines = String(text || "").split("\n");
  const order = keepLast ? lines.slice().reverse() : lines;
  const seen = new Set();
  const keptKeys = [];
  const kept = [];
  let removed = 0, near = 0;
  for (const line of order) {
    const t = line.trim();
    if (!t) continue;
    const key = normKey(t);
    if (seen.has(key)) { removed++; continue; }
    let isNear = false;
    if (fuzzy > 0) {
      for (const keptKey of keptKeys) {
        const maxLen = Math.max(key.length, keptKey.length);
        if (maxLen > 0 && 1 - levenshtein(key, keptKey) / maxLen >= fuzzy) { isNear = true; break; }
      }
    }
    if (isNear) { removed++; near++; continue; }
    seen.add(key);
    keptKeys.push(key);
    kept.push(t);
  }
  if (keepLast) kept.reverse();
  return { lines: kept, removed, near };
}

const dedupeBtn = $("dedupeBtn");
if (dedupeBtn) dedupeBtn.addEventListener("click", () => {
  const input = ($("dedupeInput") || {}).value || "";
  if (!input.trim()) { setError("dedupeStatus", "Please paste some lines first."); return; }
  const result = dedupeLines(input, !!($("dedupeCase") || {}).checked, {
    keep: ($("dedupeKeep") || {}).value || "first",
    ignorePunctuation: !!($("dedupeIgnorePunct") || {}).checked,
    fuzzy: !!($("dedupeFuzzy") || {}).checked,
    fuzzyLevel: ($("dedupeFuzzyLevel") || {}).value || "90"
  });
  if ($("dedupeOutput")) $("dedupeOutput").textContent = result.lines.join("\n") || "No lines left.";
  setStatus("dedupeStatus", "Done. Removed " + result.removed + " duplicate line" + (result.removed === 1 ? "" : "s") + (result.near ? " (" + result.near + " near-duplicate" + (result.near === 1 ? "" : "s") + ")" : "") + ".");
});

const dedupeFuzzyLevel = $("dedupeFuzzyLevel");
if (dedupeFuzzyLevel) dedupeFuzzyLevel.addEventListener("input", () => { const l = $("dedupeFuzzyLabel"); if (l) l.textContent = dedupeFuzzyLevel.value + "%"; });

const dedupeCopyBtn = $("dedupeCopyBtn");
if (dedupeCopyBtn) dedupeCopyBtn.addEventListener("click", () => {
  const text = ($("dedupeOutput") || {}).textContent || "";
  if (!text || text.startsWith("Cleaned list")) { setStatus("dedupeStatus", "Remove duplicates first, then use Copy Result."); return; }
  copyTextToClipboard(text, "dedupeStatus");
});
