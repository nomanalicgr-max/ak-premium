/* AK Premium v12 — character-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const charCountInput = $("charCountInput");
if (charCountInput) charCountInput.addEventListener("input", () => {
  const c = countWords(charCountInput.value);
  const out = $("charCountOutput");
  if (out) out.textContent = "Characters: " + c.chars + " | Characters (no spaces): " + c.charsNoSpaces + " | Words: " + c.words + " | Sentences: " + c.sentences + " | Paragraphs: " + c.paragraphs + " | Reading time: " + c.readingMinutes + " min";
});
