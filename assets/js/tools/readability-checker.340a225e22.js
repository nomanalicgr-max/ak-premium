/* AK Premium v12 — readability-checker (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const readBtn = $("readBtn");
if (readBtn) readBtn.addEventListener("click", () => {
  const input = ($("readInput") || {}).value || "";
  if (!input.trim()) { setError("readStatus", "Please paste some text first."); return; }
  const result = readabilityScore(input);
  if (result.error) { setError("readStatus", result.error); return; }
  if ($("readOutput")) $("readOutput").textContent = "Flesch Reading Ease: " + result.ease + " (" + result.level + "). Grade level: " + result.grade + ". Words: " + result.words + " | Sentences: " + result.sentences + " | Syllables: " + result.syllables + ".";
  setStatus("readStatus", "Done.");
});
