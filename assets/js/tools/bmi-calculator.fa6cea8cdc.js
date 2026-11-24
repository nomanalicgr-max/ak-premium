/* AK Premium v12 — bmi-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 tools: pure logic (testable) ---------- */

function bmiCalc(heightCm, weightKg) {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return { error: "Please enter a positive height and weight." };
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  const rounded = Math.round(bmi * 10) / 10;
  let category = "Obese";
  if (rounded < 18.5) category = "Underweight";
  else if (rounded < 25) category = "Normal";
  else if (rounded < 30) category = "Overweight";
  const healthyLow = Math.round(18.5 * m * m * 10) / 10;
  const healthyHigh = Math.round(24.9 * m * m * 10) / 10;
  const prime = Math.round(bmi / 25 * 100) / 100;
  return { bmi: rounded, category, healthyLow, healthyHigh, prime };
}

/* ---------- Phase 1 handlers: Calculators ---------- */

function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

function bmiChildPercentile(sex, ageYears, bmi) {
  /* WHO Growth Reference 2007, BMI-for-age 5 to 19 years: LMS values at
     each birthday, taken from the official WHO expanded percentile tables
     (who.int). L, M and S are interpolated linearly between birthdays and
     the percentile comes from the LMS z-score formula. */
  const WHO_BMI_LMS = {
    girls: [[5.08, -0.8886, 15.2441, 0.09692], [6, -1.0794, 15.2697, 0.10195], [7, -1.2565, 15.4036, 0.10746], [8, -1.388, 15.681, 0.11291], [9, -1.465, 16.0964, 0.11816], [10, -1.4864, 16.6133, 0.12307], [11, -1.4606, 17.2459, 0.12748], [12, -1.4006, 17.9966, 0.13129], [13, -1.3195, 18.8012, 0.13445], [14, -1.2266, 19.5647, 0.137], [15, -1.1311, 20.2125, 0.13904], [16, -1.0368, 20.7008, 0.1407], [17, -0.9423, 21.0367, 0.14208], [18, -0.8462, 21.2603, 0.1433], [19, -0.7496, 21.4269, 0.14441]],
    boys: [[5.08, -0.7387, 15.2641, 0.0839], [6, -0.9921, 15.3062, 0.08682], [7, -1.246, 15.4832, 0.09068], [8, -1.4629, 15.7368, 0.09526], [9, -1.6318, 16.049, 0.10038], [10, -1.7407, 16.4433, 0.10566], [11, -1.7862, 16.9392, 0.1107], [12, -1.7751, 17.5334, 0.11522], [13, -1.7168, 18.233, 0.11898], [14, -1.6211, 19.005, 0.12191], [15, -1.4961, 19.7744, 0.12412], [16, -1.3529, 20.4951, 0.12579], [17, -1.1962, 21.1423, 0.12715], [18, -1.026, 21.7077, 0.12836], [19, -0.8419, 22.1883, 0.12948]]
  };
  const table = sex === "male" ? WHO_BMI_LMS.boys : sex === "female" ? WHO_BMI_LMS.girls : null;
  if (!table) return { error: "Please choose boy or girl for the child percentile." };
  if (isNaN(ageYears) || ageYears < 5 || ageYears > 19) return { error: "The WHO 5 to 19 reference covers ages 5 to 19 only." };
  if (isNaN(bmi) || bmi <= 0) return { error: "Please enter a positive height and weight." };
  let lo = table[0], hi = table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    if (ageYears >= table[i][0] && ageYears <= table[i + 1][0]) { lo = table[i]; hi = table[i + 1]; break; }
  }
  const f = hi[0] === lo[0] ? 0 : (ageYears - lo[0]) / (hi[0] - lo[0]);
  const L = lo[1] + (hi[1] - lo[1]) * f;
  const M = lo[2] + (hi[2] - lo[2]) * f;
  const S = lo[3] + (hi[3] - lo[3]) * f;
  const z = (Math.pow(bmi / M, L) - 1) / (L * S);
  const percentile = Math.round(normalCdf(z) * 1000) / 10;
  let category = "Healthy weight";
  if (percentile < 3) category = "Thinness";
  else if (percentile > 97) category = "Obesity";
  else if (percentile > 85) category = "Overweight";
  return { percentile, z: Math.round(z * 100) / 100, category };
}

function bmiFromImperial(feet, inches, lb) {
  const ft = Number(feet) || 0, inch = Number(inches) || 0;
  if (ft <= 0 && inch <= 0) return { error: "Please enter your height in feet and inches." };
  if (ft < 0 || inch < 0 || inch >= 12) return { error: "Please enter feet as 0 or more and inches from 0 to 11." };
  if (isNaN(lb) || lb <= 0) return { error: "Please enter a weight in pounds more than 0." };
  const heightCm = Math.round((ft * 12 + inch) * 2.54 * 10) / 10;
  const weightKg = Math.round(lb * 0.45359237 * 10) / 10;
  return { heightCm, weightKg };
}

function bmiWaistRatio(waistCm, heightCm) {
  if (!waistCm || waistCm <= 0 || !heightCm || heightCm <= 0) return { error: "Please enter a positive waist and height." };
  const ratio = Math.round(waistCm / heightCm * 100) / 100;
  let band = "Healthy range";
  if (ratio < 0.4) band = "Below the healthy range";
  else if (ratio >= 0.6) band = "High health risk";
  else if (ratio >= 0.5) band = "Increased health risk";
  return { ratio, band };
}

const bmiBtn = $("bmiBtn");
if (bmiBtn) bmiBtn.addEventListener("click", () => {
  const mode = ($("bmiMode") || {}).value || "adult";
  const unit = ($("bmiUnit") || {}).value || "metric";
  let heightCm, weightKg;
  if (unit === "imperial") {
    const conv = bmiFromImperial(parseFloat($("bmiFeet").value), parseFloat($("bmiInches").value), parseFloat($("bmiLb").value));
    if (conv.error) { setStatus("bmiStatus", conv.error); return; }
    heightCm = conv.heightCm; weightKg = conv.weightKg;
  } else {
    heightCm = parseFloat($("bmiHeight").value);
    weightKg = parseFloat($("bmiWeight").value);
  }
  const result = bmiCalc(heightCm, weightKg);
  if (result.error) { setStatus("bmiStatus", result.error); return; }
  /* In child mode the adult category, healthy range and BMI Prime do not
     apply: a healthy BMI changes with age, so the WHO percentile line
     below is the child's result and the adult lines are left out. */
  let out = "BMI: " + result.bmi + (mode === "child" ? "" : " (" + result.category + ")");
  if (mode !== "child") {
    out += "\nHealthy weight for your height: " + result.healthyLow + " to " + result.healthyHigh + " kg"
      + "\nBMI Prime: " + result.prime;
  }
  const waist = parseFloat(($("bmiWaist") || {}).value);
  if (!isNaN(waist) && waist > 0) {
    const wr = bmiWaistRatio(waist, heightCm);
    if (!wr.error) out += "\nWaist-to-height ratio: " + wr.ratio + " (" + wr.band + ")";
  }
  if (mode === "child") {
    const age = parseFloat($("bmiAge").value);
    const sex = ($("bmiSex") || {}).value || "female";
    const child = bmiChildPercentile(sex, age, result.bmi);
    if (child.error) { setStatus("bmiStatus", child.error); return; }
    out += "\nWHO percentile (age " + age + ", " + (sex === "male" ? "boy" : "girl") + "): " + child.percentile + "th (" + child.category + ")"
      + "\nSource: WHO Growth Reference 2007, BMI-for-age 5 to 19 years. A guide, not a diagnosis.";
  }
  if ($("bmiOutput")) $("bmiOutput").textContent = out;
  setStatus("bmiStatus", "Done.");
});

const bmiModeSel = $("bmiMode");
if (bmiModeSel) bmiModeSel.addEventListener("change", () => {
  const row = $("bmiChildRow");
  if (row) row.style.display = bmiModeSel.value === "child" ? "" : "none";
});

const bmiUnitSel = $("bmiUnit");
if (bmiUnitSel) bmiUnitSel.addEventListener("change", () => {
  const imp = $("bmiImperialRow"), met = $("bmiMetricRow");
  if (imp) imp.style.display = bmiUnitSel.value === "imperial" ? "" : "none";
  if (met) met.style.display = bmiUnitSel.value === "imperial" ? "none" : "";
});
