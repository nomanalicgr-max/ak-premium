/* AK Premium v12 — unit-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const unitType = $("unitType");
if (unitType) unitType.addEventListener("change", () => {
  const def = unitOptions(unitType.value);
  ["unitFrom", "unitTo"].forEach((id) => {
    const sel = $(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = "";
    def.forEach(([key, label]) => {
      const opt = document.createElement("option");
      opt.value = key; opt.textContent = label + " (" + key + ")";
      sel.appendChild(opt);
    });
    if (def.some(([k]) => k === cur)) sel.value = cur;
  });
  const btn = $("unitBtn"); if (btn && ($("unitValue") || {}).value) btn.click();
});

const unitBtn = $("unitBtn");
if (unitBtn) unitBtn.addEventListener("click", () => {
  const type = ($("unitType") || {}).value;
  const value = parseFloat(($("unitValue") || {}).value);
  const from = ($("unitFrom") || {}).value, to = ($("unitTo") || {}).value;
  const result = convertUnit(type, value, from, to);
  if (result.error) { setError("unitStatus", result.error); return; }
  if ($("unitOutput")) $("unitOutput").textContent = result.text;
  setStatus("unitStatus", "Done.");
});
