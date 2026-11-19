/* AK Premium v12 — scientific-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const sciDisplay = $("sciDisplay");
if (sciDisplay) {
  let sciFresh = false;
  document.querySelectorAll("#tool-scientific [data-sci-key]").forEach((k) => k.addEventListener("click", () => {
    const key = k.getAttribute("data-sci-key");
    if (sciFresh && /[0-9.(]/.test(key.charAt(0))) { sciDisplay.value = key; sciFresh = false; }
    else if (sciDisplay.value === "0" && key === ".") sciDisplay.value = "0.";
    else if (sciDisplay.value === "0" && /[0-9]/.test(key)) sciDisplay.value = key;
    else if (sciDisplay.value === "0") sciDisplay.value = key;
    else sciDisplay.value += key;
    setStatus("sciStatus", "");
  }));
  const sciClear = $("sciClear");
  if (sciClear) sciClear.addEventListener("click", () => { sciDisplay.value = "0"; sciFresh = false; if ($("sciOutput")) $("sciOutput").textContent = "Result will appear here."; setStatus("sciStatus", ""); });
  const sciBack = $("sciBack");
  if (sciBack) sciBack.addEventListener("click", () => { sciDisplay.value = sciDisplay.value.length > 1 ? sciDisplay.value.slice(0, -1) : "0"; sciFresh = false; });
  const sciEquals = $("sciEquals");
  if (sciEquals) sciEquals.addEventListener("click", () => {
    const result = evaluateScientific(sciDisplay.value);
    if (result.error) { setError("sciStatus", result.error); return; }
    const shown = fmtSci(result.value);
    if ($("sciOutput")) $("sciOutput").textContent = "Result: " + shown;
    sciDisplay.value = shown;
    sciFresh = true;
    setStatus("sciStatus", "Done.");
  });
}
