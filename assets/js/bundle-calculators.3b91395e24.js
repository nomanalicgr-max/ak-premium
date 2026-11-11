/* AK Premium v9 — bundle-calculators (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 1 handlers: Calculators ---------- */

const ageBtn = $("ageBtn");
if (ageBtn) ageBtn.addEventListener("click", () => {
  const result = calculateAge($("ageDob").value);
  if (result.error) { setStatus("ageStatus", result.error); return; }
  if ($("ageOutput")) $("ageOutput").textContent = "Age: " + result.years + " years, " + result.months + " months, " + result.days + " days.";
  setStatus("ageStatus", "Done.");
});

const percentBtn = $("percentBtn");
if (percentBtn) percentBtn.addEventListener("click", () => {
  const result = percentageCalc($("percentMode").value, parseFloat($("percentX").value), parseFloat($("percentY").value));
  if (result.error) { setStatus("percentStatus", result.error); return; }
  if ($("percentOutput")) $("percentOutput").textContent = result.text;
  setStatus("percentStatus", "Done.");
});

const bmiBtn = $("bmiBtn");
if (bmiBtn) bmiBtn.addEventListener("click", () => {
  const result = bmiCalc(parseFloat($("bmiHeight").value), parseFloat($("bmiWeight").value));
  if (result.error) { setStatus("bmiStatus", result.error); return; }
  if ($("bmiOutput")) $("bmiOutput").textContent = "BMI: " + result.bmi + " (" + result.category + ")";
  setStatus("bmiStatus", "Done.");
});

/* ---------- Phase 2 handlers: Calculators ---------- */

const emiBtn = $("emiBtn");
if (emiBtn) emiBtn.addEventListener("click", () => {
  const result = emiCalc(parseFloat($("emiPrincipal").value), parseFloat($("emiRate").value), parseFloat($("emiYears").value));
  if (result.error) { setStatus("emiStatus", result.error); return; }
  if ($("emiOutput")) $("emiOutput").textContent = "Monthly EMI: Rs " + fmtMoney(result.emi, 2) + "\nTotal payment: Rs " + fmtMoney(result.total, 2) + "\nTotal interest: Rs " + fmtMoney(result.interest, 2) + "\nMonths: " + result.months;
  const bd = $("emiBreakdown");
  if (bd) bd.innerHTML = "<table><tbody>" + "<tr><td>Monthly EMI</td><td>Rs " + fmtMoney(result.emi, 2) + "</td></tr>" + "<tr><td>Principal</td><td>Rs " + fmtMoney(parseFloat($("emiPrincipal").value) || 0, 2) + "</td></tr>" + "<tr><td>Total interest</td><td>Rs " + fmtMoney(result.interest, 2) + "</td></tr>" + "<tr><td>Total payment</td><td>Rs " + fmtMoney(result.total, 2) + "</td></tr>" + "<tr><td>Months</td><td>" + result.months + "</td></tr></tbody></table>";
  setStatus("emiStatus", "Done.");
});

const cgpaBtn = $("cgpaBtn");
if (cgpaBtn) cgpaBtn.addEventListener("click", () => {
  const result = parseCgpa($("cgpaInput").value);
  if (result.error) { setStatus("cgpaStatus", result.error); return; }
  if ($("cgpaOutput")) $("cgpaOutput").textContent = "CGPA: " + result.cgpa.toFixed(2) + "\nTotal credit hours: " + result.credits;
  setStatus("cgpaStatus", "Done.");
});
