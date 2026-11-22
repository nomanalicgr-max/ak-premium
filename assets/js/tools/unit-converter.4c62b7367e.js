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
  const cookRow = $("unitCookRow");
  if (cookRow) cookRow.style.display = unitType.value === "cooking" ? "" : "none";
  const btn = $("unitBtn"); if (btn && ($("unitValue") || {}).value) btn.click();
});
/* Convert the typed value and show the result plus the value in every
   other unit of this type. Returns the conversion for the recents list, or
   null when it failed. Live typing calls this directly so half-typed
   numbers never land in the recents list. */

function unitConvert() {
  const type = ($("unitType") || {}).value;
  const value = parseFloat(($("unitValue") || {}).value);
  const from = ($("unitFrom") || {}).value, to = ($("unitTo") || {}).value;
  const result = convertUnit(type, value, from, to);
  if (result.error) { setError("unitStatus", result.error); return null; }
  if ($("unitOutput")) $("unitOutput").textContent = result.text;
  const all = $("unitAll");
  if (all) {
    const rows = unitAllRows(type, value, from);
    all.innerHTML = rows.length ? "<p>All units:</p><ul>" + rows.map((r) => "<li>" + escapeHtml(r) + "</li>").join("") + "</ul>" : "";
  }
  setStatus("unitStatus", "Done.");
  return { type, value, from, to };
}

const unitBtn = $("unitBtn");
if (unitBtn) unitBtn.addEventListener("click", () => {
  const r = unitConvert();
  if (r) { unitSaveRecent(r); unitRenderRecents(); }
});

const unitSwapBtn = $("unitSwapBtn");
if (unitSwapBtn) unitSwapBtn.addEventListener("click", () => {
  const f = $("unitFrom"), t = $("unitTo");
  if (!f || !t) return;
  const tmp = f.value; f.value = t.value; t.value = tmp;
  const btn = $("unitBtn"); if (btn && ($("unitValue") || {}).value) btn.click();
});
const UNIT_SHORTCUTS = [
  ["length", "km", "mi", "Kilometres \u2192 miles"],
  ["weight", "kg", "lb", "Kilograms \u2192 pounds"],
  ["temperature", "c", "f", "Celsius \u2192 Fahrenheit"],
  ["volume", "l", "gal", "Litres \u2192 gallons"],
  ["energy", "kwh", "kj", "Kilowatt-hours \u2192 kilojoules"],
  ["pressure", "bar", "psi", "Bar \u2192 psi"]
];

function unitApplyPair(type, from, to) {
  const typeSel = $("unitType");
  if (typeSel) { typeSel.value = type; typeSel.dispatchEvent(new Event("change")); }
  const f = $("unitFrom"), t = $("unitTo");
  if (f) f.value = from; if (t) t.value = to;
  const v = $("unitValue");
  const btn = $("unitBtn");
  if (btn && v && v.value) btn.click();
  else if (v) v.focus();
}

function unitRenderShortcuts() {
  const box = $("unitShortcuts");
  if (!box) return;
  box.innerHTML = "";
  UNIT_SHORTCUTS.forEach(([type, from, to, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn-secondary";
    b.textContent = label;
    b.addEventListener("click", () => unitApplyPair(type, from, to));
    box.appendChild(b);
  });
}

function unitRenderRecents() {
  const box = $("unitRecent");
  if (!box) return;
  const list = unitRecents();
  box.innerHTML = "";
  if (!list.length) return;
  const label = document.createElement("p");
  label.textContent = "Recent:";
  box.appendChild(label);
  list.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "btn-secondary";
    b.textContent = r.value + " " + (UNIT_SHORT[r.from] || r.from) + " \u2192 " + (UNIT_SHORT[r.to] || r.to);
    b.addEventListener("click", () => {
      const vv = $("unitValue"); if (vv) vv.value = r.value;
      unitApplyPair(r.type, r.from, r.to);
    });
    box.appendChild(b);
  });
}

function unitCookUpdate() {
  const out = $("unitCookOut");
  if (!out) return;
  const grams = parseFloat(($("unitGrams") || {}).value);
  const ing = ($("unitIngredient") || {}).value;
  const cups = cookCups(ing, grams);
  out.textContent = cups === null ? "" : "About " + fmtCalc(cups, 2) + " cups (estimate \u2014 densities vary by brand and packing).";
}

const unitIngredient = $("unitIngredient");
if (unitIngredient) unitIngredient.addEventListener("change", unitCookUpdate);

const unitGrams = $("unitGrams");
if (unitGrams) unitGrams.addEventListener("input", unitCookUpdate);

const unitValueInput = $("unitValue");
if (unitValueInput) unitValueInput.addEventListener("input", () => { if (unitValueInput.value) unitConvert(); });
unitRenderShortcuts();
unitRenderRecents();
