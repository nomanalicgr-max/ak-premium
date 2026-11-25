/* AK Premium v12 — scientific-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

const sciDisplay = $("sciDisplay");
if (sciDisplay) {
  let sciFresh = false;
  let sciAngle = "deg";
  let sciMemory = 0;
  const sciHistory = [];
  const sciRenderHistory = () => {
    const box = $("sciHistory");
    if (!box) return;
    box.innerHTML = "";
    if (!sciHistory.length) { box.textContent = "No calculations yet."; return; }
    sciHistory.slice().reverse().forEach((h) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn-secondary";
      b.textContent = h.expr + " = " + h.result;
      b.addEventListener("click", () => { sciDisplay.value = h.expr; sciFresh = false; setStatus("sciStatus", ""); });
      box.appendChild(b);
    });
  };
  const sciType = (key) => {
    if (sciFresh && /[0-9.(]/.test(key.charAt(0))) { sciDisplay.value = key; sciFresh = false; }
    else if (sciDisplay.value === "0" && key === ".") sciDisplay.value = "0.";
    else if (sciDisplay.value === "0" && /[0-9]/.test(key)) sciDisplay.value = key;
    else if (sciDisplay.value === "0") sciDisplay.value = key;
    else sciDisplay.value += key;
    setStatus("sciStatus", "");
  };
  document.querySelectorAll("#tool-scientific [data-sci-key]").forEach((k) => k.addEventListener("click", () => sciType(k.getAttribute("data-sci-key"))));
  const sciClear = $("sciClear");
  if (sciClear) sciClear.addEventListener("click", () => { sciDisplay.value = "0"; sciFresh = false; if ($("sciOutput")) $("sciOutput").textContent = "Result will appear here."; setStatus("sciStatus", ""); });
  const sciBack = $("sciBack");
  if (sciBack) sciBack.addEventListener("click", () => { sciDisplay.value = sciDisplay.value.length > 1 ? sciDisplay.value.slice(0, -1) : "0"; sciFresh = false; });
  const sciEquals = $("sciEquals");
  if (sciEquals) sciEquals.addEventListener("click", () => {
    const result = evaluateScientific(sciDisplay.value, sciAngle);
    if (result.error) { setError("sciStatus", result.error); return; }
    const shown = fmtSci(result.value);
    if ($("sciOutput")) $("sciOutput").textContent = "Result: " + shown;
    sciHistory.push({ expr: sciDisplay.value, result: shown });
    if (sciHistory.length > 10) sciHistory.shift();
    sciRenderHistory();
    sciDisplay.value = shown;
    sciFresh = true;
    setStatus("sciStatus", "Done.");
  });
  const sciAngleBtn = $("sciAngleBtn");
  if (sciAngleBtn) sciAngleBtn.addEventListener("click", () => {
    sciAngle = sciAngle === "deg" ? "rad" : "deg";
    sciAngleBtn.textContent = sciAngle === "deg" ? "DEG" : "RAD";
    setStatus("sciStatus", "Angles now in " + (sciAngle === "deg" ? "degrees" : "radians") + ".");
  });
  const sciMPlus = $("sciMPlus");
  if (sciMPlus) sciMPlus.addEventListener("click", () => {
    const v = parseFloat(sciDisplay.value);
    if (isNaN(v)) { setError("sciStatus", "The display has no number to store in memory."); return; }
    sciMemory += v;
    setStatus("sciStatus", "Added " + fmtSci(v) + " to memory. Memory is now " + fmtSci(sciMemory) + ".");
  });
  const sciMR = $("sciMR");
  if (sciMR) sciMR.addEventListener("click", () => { sciDisplay.value = fmtSci(sciMemory); sciFresh = false; setStatus("sciStatus", ""); });
  const sciMC = $("sciMC");
  if (sciMC) sciMC.addEventListener("click", () => { sciMemory = 0; setStatus("sciStatus", "Memory cleared."); });
  const sciAns = $("sciAns");
  if (sciAns) sciAns.addEventListener("click", () => {
    if (!sciHistory.length) { setError("sciStatus", "No answer yet. Work out a sum first."); return; }
    sciDisplay.value = sciHistory[sciHistory.length - 1].result; sciFresh = false; setStatus("sciStatus", "");
  });
  sciDisplay.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); if (sciEquals) sciEquals.click(); }
    else if (ev.key === "Escape") { ev.preventDefault(); if (sciClear) sciClear.click(); }
    else if (ev.key === "Backspace") { ev.preventDefault(); if (sciBack) sciBack.click(); }
    else if (/^[0-9+\-*/().%^!]$/.test(ev.key)) { ev.preventDefault(); sciType(ev.key); }
  });
  sciRenderHistory();
}
/* v33: fill the time-zone lists with the browser's full IANA list. */
