/* AK Premium v12 — word-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Everyday ---------- */

function updateWordCount() {
  const input = $("wordCountInput");
  const text = (input || {}).value || "";
  const c = countWords(text);
  const out = $("wordCountOutput");
  let line = "Words: " + c.words + " | Characters: " + c.chars + " | Characters (no spaces): " + c.charsNoSpaces + " | Sentences: " + c.sentences + " | Paragraphs: " + c.paragraphs + " | Reading time: " + c.readingMinutes + " min | Speaking time: " + Math.ceil(c.words / 130) + " min";
  const kwOut = $("wordKeywordOutput");
  if (text.trim()) {
    const r = readabilityScore(text);
    if (!r.error) line += " | Flesch: " + r.ease + " (" + r.level + ") | Grade: " + r.grade;
    const kw = wordFrequency(text, false, 5);
    if (kwOut) kwOut.textContent = kw.rows.length ? "Most-used words: " + kw.rows.map(([w, n]) => w + " (" + n + ", " + (Math.round(n / c.words * 1000) / 10) + "%)").join(" | ") : "No words found.";
  } else if (kwOut) {
    kwOut.textContent = "Most-used words will appear here.";
  }
  if (out) out.textContent = line;
  const goal = parseFloat(($("wordGoal") || {}).value);
  const barWrap = $("wordGoalBarWrap"), bar = $("wordGoalBar"), goalText = $("wordGoalText");
  if (!isNaN(goal) && goal > 0) {
    const pct = Math.min(100, Math.round(c.words / goal * 100));
    if (barWrap) barWrap.style.display = "";
    if (bar) bar.style.width = pct + "%";
    if (goalText) goalText.textContent = c.words >= goal ? "Goal reached: " + c.words + " words (target " + goal + ")." : c.words + " of " + goal + " words (" + pct + "%).";
  } else {
    if (barWrap) barWrap.style.display = "none";
    if (bar) bar.style.width = "0%";
    if (goalText) goalText.textContent = "";
  }
}

const wordCountInput = $("wordCountInput");
if (wordCountInput) wordCountInput.addEventListener("input", updateWordCount);

const wordGoalEl = $("wordGoal");
if (wordGoalEl) wordGoalEl.addEventListener("input", updateWordCount);
