/* AK Premium v12 — urdu-word-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function urduCountStats(text) {
  const t = String(text || "");
  const words = t.trim() ? t.trim().split(/\s+/).filter(Boolean) : [];
  const englishWords = (t.match(/[A-Za-z]+/g) || []).length;
  const arabicDigits = (t.match(/[٠-٩۰-۹]/g) || []).length;
  const chars = t.length, charsNoSpaces = t.replace(/\s/g, "").length;
  const sentences = t.split(/[۔؟!?.]+/).map((s) => s.trim()).filter(Boolean);
  const paragraphs = t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const avgWords = sentences.length ? words.length / sentences.length : 0;
  const avgLen = words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0;
  const level = (avgWords <= 12 && avgLen <= 5) ? "Easy to read" : (avgWords <= 20 ? "Medium" : "Long sentences");
  return { words: words.length, englishWords, arabicDigits, chars, charsNoSpaces, sentences: sentences.length, paragraphs: paragraphs.length, avgWords: Math.round(avgWords * 10) / 10, readingMin: Math.max(1, Math.ceil(words.length / 200)), speakingMin: Math.max(1, Math.ceil(words.length / 130)), level };
}
// Reverse merit planner: marks needed in the last part to reach a target.

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initUrduCounter() {
  const btn = $("urduCounterBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const text = $("urduCounterInput") ? $("urduCounterInput").value : "";
    const s = urduCountStats(text);
    const el = $("urduCounterOutput");
    if (el) el.textContent = "Words: " + s.words + " (English words in the text: " + s.englishWords + ", Arabic-Indic digits: " + s.arabicDigits + ")\nSentences: " + s.sentences + "\nParagraphs: " + s.paragraphs + "\nCharacters (with spaces): " + s.chars + "\nCharacters (without spaces): " + s.charsNoSpaces + "\nAverage words per sentence: " + s.avgWords + "\nReading time: about " + s.readingMin + " minute(s) at 200 words per minute.\nSpeaking time: about " + s.speakingMin + " minute(s) at 130 words per minute.\nReading level (estimate): " + s.level + ".";
    setStatus("urduCounterStatus", "Done.");
  });
})();
/* Percentage / marks / merit aggregate: generic weighted formula, user-editable weights. */
