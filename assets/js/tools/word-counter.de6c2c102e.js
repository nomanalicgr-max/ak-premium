/* AK Premium v12 — word-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Everyday ---------- */

const wordCountInput = $("wordCountInput");
if (wordCountInput) wordCountInput.addEventListener("input", () => {
  const c = countWords(wordCountInput.value);
  const out = $("wordCountOutput");
  if (out) out.textContent = "Words: " + c.words + " | Characters: " + c.chars + " | Characters (no spaces): " + c.charsNoSpaces + " | Sentences: " + c.sentences + " | Paragraphs: " + c.paragraphs + " | Reading time: " + c.readingMinutes + " min";
});
