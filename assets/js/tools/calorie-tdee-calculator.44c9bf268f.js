/* AK Premium v12 — calorie-tdee-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function tdeeGoalTarget(tdee, goal) {
  if (!tdee || tdee <= 0) return { error: "Calculate your TDEE first." };
  let target = tdee, note = "";
  if (goal === "lose") {
    target = tdee - 500;
    if (target < 1200) { target = 1200; note = "A target below 1,200 calories a day is very low. Talk to a doctor before eating that little."; }
  } else if (goal === "gain") target = tdee + 500;
  return { target: Math.round(target), note };
}
// Protein, carbs and fat in grams for a daily calorie target (4, 4 and 9 kcal/g).

function tdeeMacros(calories, ratioKey) {
  const ratios = { balanced: [30, 40, 30], "high-protein": [40, 30, 30], "low-carb": [35, 20, 45] };
  const r = ratios[ratioKey] || ratios.balanced;
  return { protein: Math.round(calories * r[0] / 100 / 4), carbs: Math.round(calories * r[1] / 100 / 4), fat: Math.round(calories * r[2] / 100 / 9), ratio: r };
}
// Katch-McArdle BMR from lean body mass (needs a body-fat percentage).

function katchMcArdle(weightKg, bodyFatPct) {
  if (!weightKg || weightKg <= 0) return { error: "Please enter a weight more than 0." };
  if (bodyFatPct === "" || bodyFatPct === null || bodyFatPct === undefined || isNaN(bodyFatPct) || bodyFatPct < 3 || bodyFatPct > 70) return { error: "Please enter a body-fat percentage between 3 and 70." };
  const lean = weightKg * (1 - bodyFatPct / 100);
  return { bmr: Math.round(370 + 21.6 * lean), lean: Math.round(lean * 10) / 10 };
}

function imperialToMetric(feet, inches, lb) {
  const totalIn = (Number(feet) || 0) * 12 + (Number(inches) || 0);
  if (totalIn <= 0 || !lb || lb <= 0) return { error: "Please enter a height and a weight more than 0." };
  return { cm: Math.round(totalIn * 2.54 * 10) / 10, kg: Math.round(lb * 0.45359237 * 10) / 10 };
}
/* Land units in square feet for one marla of the size the user picked.
   1 Kanal is always 20 Marla and 1 Acre is always 43,560 sq ft. 1 Punjab
   bigha is 20 Marla. 1 guntha is 1,089 sq ft, 1 cent is 435.6 sq ft,
   1 ropani (Nepal) is 5,476 sq ft, 1 perch is 272.25 sq ft, 1 sarsai is
   one ninth of a marla, and 1 hectare is 107,639 sq ft. */

const tdeeBtn = $("tdeeBtn");
if (tdeeBtn) tdeeBtn.addEventListener("click", () => {
  const unit = ($("tdeeUnit") || {}).value || "metric";
  let heightCm = parseFloat($("tdeeHeight").value), weightKg = parseFloat($("tdeeWeight").value);
  if (unit === "imperial") {
    const conv = imperialToMetric(parseFloat(($("tdeeFeet") || {}).value), parseFloat(($("tdeeInches") || {}).value), parseFloat(($("tdeeLb") || {}).value));
    if (conv.error) { setError("tdeeStatus", conv.error); return; }
    heightCm = conv.cm; weightKg = conv.kg;
  }
  const result = tdeeCalc(parseFloat($("tdeeAge").value), $("tdeeSex").value, heightCm, weightKg, parseFloat($("tdeeActivity").value));
  if (result.error) { setError("tdeeStatus", result.error); return; }
  let out = "BMR: " + result.bmr + " calories a day. TDEE: " + result.tdee + " calories a day.";
  const bf = parseFloat(($("tdeeBodyFat") || {}).value);
  if (!isNaN(bf) && ($("tdeeBodyFat") || {}).value !== "") {
    const km = katchMcArdle(weightKg, bf);
    if (!km.error) out += "\nKatch-McArdle BMR (from " + km.lean + " kg lean mass): " + km.bmr + " calories a day.";
  }
  const goal = ($("tdeeGoal") || {}).value || "maintain";
  const gt = tdeeGoalTarget(result.tdee, goal);
  if (!gt.error) {
    const goalWord = goal === "lose" ? "lose about 0.5 kg a week" : goal === "gain" ? "gain about 0.5 kg a week" : "stay the same weight";
    out += "\nDaily target to " + goalWord + ": " + gt.target + " calories a day." + (gt.note ? " " + gt.note : "");
    const macros = tdeeMacros(gt.target, ($("tdeeMacro") || {}).value || "balanced");
    out += "\nMacros at " + macros.ratio[0] + "% protein, " + macros.ratio[1] + "% carbs, " + macros.ratio[2] + "% fat: protein " + macros.protein + " g, carbs " + macros.carbs + " g, fat " + macros.fat + " g a day.";
  }
  out += "\nWater (estimate): about " + Math.round(weightKg * 35) + " ml a day (35 ml per kg of body weight).";
  if ($("tdeeOutput")) $("tdeeOutput").textContent = out;
  setStatus("tdeeStatus", "Done.");
});

(function initTdeeExtra() {
  const unitSel = $("tdeeUnit");
  if (unitSel) unitSel.addEventListener("change", () => {
    const imp = unitSel.value === "imperial";
    ["tdeeFeetRow", "tdeeLbRow"].forEach((id) => { const r = $(id); if (r) r.style.display = imp ? "" : "none"; });
    ["tdeeHeightRow", "tdeeWeightRow"].forEach((id) => { const r = $(id); if (r) r.style.display = imp ? "none" : ""; });
  });
})();
