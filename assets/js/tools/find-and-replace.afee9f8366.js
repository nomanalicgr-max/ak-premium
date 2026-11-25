/* AK Premium v12 — find-and-replace (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const findrepBtn = $("findrepBtn");
let findrepUndoStack = [];
if (findrepBtn) findrepBtn.addEventListener("click", () => {
  const input = ($("findrepInput") || {}).value || "";
  if (!input.trim()) { setError("findrepStatus", "Please paste some text first."); return; }
  const result = findReplace(input, ($("findrepFind") || {}).value || "", ($("findrepReplace") || {}).value || "", !!($("findrepCase") || {}).checked, { regex: !!($("findrepRegex") || {}).checked, wholeWord: !!($("findrepWholeWord") || {}).checked });
  if (result.error) { setError("findrepStatus", result.error); return; }
  findrepUndoStack.push(input);
  if (findrepUndoStack.length > 10) findrepUndoStack.shift();
  if ($("findrepOutput")) $("findrepOutput").textContent = result.result;
  updateFindrepCount();
  setStatus("findrepStatus", "Done. Replaced " + result.count + " time" + (result.count === 1 ? "." : "s."));
});

function updateFindrepCount() {
  const find = ($("findrepFind") || {}).value || "";
  const out = $("findrepMatchCount");
  if (!out) return;
  if (!find) { out.textContent = ""; return; }
  const result = findReplace(($("findrepInput") || {}).value || "", find, "", !!($("findrepCase") || {}).checked, { regex: !!($("findrepRegex") || {}).checked, wholeWord: !!($("findrepWholeWord") || {}).checked });
  out.textContent = result.error ? "That pattern is not a valid regular expression." : result.count + " match" + (result.count === 1 ? "" : "es") + ".";
}
["findrepFind", "findrepInput"].forEach((id) => { const el = $(id); if (el) el.addEventListener("input", updateFindrepCount); });
["findrepRegex", "findrepWholeWord", "findrepCase"].forEach((id) => { const el = $(id); if (el) el.addEventListener("change", updateFindrepCount); });

const findrepPreviewBtn = $("findrepPreviewBtn");
if (findrepPreviewBtn) findrepPreviewBtn.addEventListener("click", () => {
  const input = ($("findrepInput") || {}).value || "";
  if (!input.trim()) { setError("findrepStatus", "Please paste some text first."); return; }
  const result = findReplace(input, ($("findrepFind") || {}).value || "", ($("findrepReplace") || {}).value || "", !!($("findrepCase") || {}).checked, { regex: !!($("findrepRegex") || {}).checked, wholeWord: !!($("findrepWholeWord") || {}).checked });
  if (result.error) { setError("findrepStatus", result.error); return; }
  const before = input.split("\n"), after = result.result.split("\n");
  const changed = [];
  for (let i = 0; i < Math.max(before.length, after.length) && changed.length < 5; i++) {
    if (before[i] !== after[i]) changed.push((before[i] === undefined ? "" : before[i]).slice(0, 120) + "  →  " + (after[i] === undefined ? "" : after[i]).slice(0, 120));
  }
  if ($("findrepPreview")) $("findrepPreview").textContent = changed.length ? changed.join("\n") : "No lines would change.";
  setStatus("findrepStatus", "Preview: " + result.count + " match" + (result.count === 1 ? "" : "es") + " would be replaced. Press Replace All to apply it.");
});

const findrepUndoBtn = $("findrepUndoBtn");
if (findrepUndoBtn) findrepUndoBtn.addEventListener("click", () => {
  const prev = findrepUndoStack.pop();
  if (prev === undefined) { setStatus("findrepStatus", "Nothing to undo yet. Replace the text first."); return; }
  const input = $("findrepInput");
  if (input) input.value = prev;
  if ($("findrepOutput")) $("findrepOutput").textContent = "New text will appear here.";
  if ($("findrepPreview")) $("findrepPreview").textContent = "A preview of the changes will appear here.";
  updateFindrepCount();
  setStatus("findrepStatus", "Undone. The text before the last replace is back in the box.");
});

const findrepCopyBtn = $("findrepCopyBtn");
if (findrepCopyBtn) findrepCopyBtn.addEventListener("click", () => {
  const text = ($("findrepOutput") || {}).textContent || "";
  if (!text || text.startsWith("New text")) { setStatus("findrepStatus", "Replace the text first, then use Copy Result."); return; }
  copyTextToClipboard(text, "findrepStatus");
});
