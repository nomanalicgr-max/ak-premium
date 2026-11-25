/* AK Premium v12 — character-counter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

function graphemeCount(text) {
  const s = String(text || "");
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try { return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].length; } catch (e) { /* fall through */ }
  }
  return [...s].length;
}

function utf8ByteSize(text) {
  const s = String(text || "");
  if (typeof TextEncoder !== "undefined") {
    try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ }
  }
  return unescape(encodeURIComponent(s)).length;
}

function updateCharLimit() {
  const sel = $("charLimitPreset");
  const out = $("charLimitOutput");
  if (!sel || !out) return;
  const name = sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].textContent : "";
  const limit = parseInt(sel.value, 10);
  if (!limit) { out.textContent = "Pick a platform limit to see how much room is left."; return; }
  const used = countWords(($("charCountInput") || {}).value || "").chars;
  const left = limit - used;
  out.textContent = name + ": " + used + " of " + limit + " characters (" + (left >= 0 ? left + " left" : (-left) + " over") + ").";
}

const charCountInput = $("charCountInput");
if (charCountInput) charCountInput.addEventListener("input", () => {
  const c = countWords(charCountInput.value);
  const out = $("charCountOutput");
  if (out) out.textContent = "Characters: " + c.chars + " | Characters (no spaces): " + c.charsNoSpaces + " | Words: " + c.words + " | Sentences: " + c.sentences + " | Paragraphs: " + c.paragraphs + " | Reading time: " + c.readingMinutes + " min | Graphemes: " + graphemeCount(charCountInput.value) + " | Size: " + utf8ByteSize(charCountInput.value) + " bytes";
  updateCharLimit();
});

const charLimitPreset = $("charLimitPreset");
if (charLimitPreset) charLimitPreset.addEventListener("change", updateCharLimit);
