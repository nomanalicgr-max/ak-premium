/* AK Premium v12 — percentage-marks-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function meritReversePlanner(targetPct, knownParts, lastTotal, lastWeight) {
  if (!targetPct || targetPct <= 0 || targetPct > 100) return { error: "Please enter a target aggregate between 1 and 100." };
  if (!lastTotal || lastTotal <= 0 || !lastWeight || lastWeight <= 0) return { error: "Please enter the total marks and the weight of the part you still have to take." };
  const known = knownParts.reduce((a, p) => a + (p.pct * p.weight / 100), 0);
  const need = targetPct - known;
  const needPct = need / lastWeight * 100;
  if (needPct > 100) return { impossible: true, needPct: Math.round(needPct * 100) / 100 };
  if (needPct <= 0) return { already: true, needPct: Math.round(needPct * 100) / 100 };
  return { needPct: Math.round(needPct * 100) / 100, needObtained: Math.round(needPct / 100 * lastTotal * 100) / 100 };
}
// Percentage to GPA on the common 4.0 scale. This is a common conversion,
// not an official scale: universities set their own grade boundaries.

function pctToGpa(pct) {
  if (isNaN(pct) || pct < 0 || pct > 100) return { error: "Please enter a percentage between 0 and 100." };
  const table = [[90, 4.0], [85, 3.7], [80, 3.3], [75, 3.0], [70, 2.7], [65, 2.3], [60, 2.0], [55, 1.7], [50, 1.0]];
  for (const [min, gpa] of table) if (pct >= min) return { gpa };
  return { gpa: 0 };
}

function gpaToPct(gpa) {
  if (isNaN(gpa) || gpa < 0 || gpa > 4) return { error: "Please enter a GPA between 0 and 4.0." };
  const table = [[4.0, 90], [3.7, 85], [3.3, 80], [3.0, 75], [2.7, 70], [2.3, 65], [2.0, 60], [1.7, 55], [1.0, 50]];
  for (const [g, pct] of table) if (gpa >= g) return { pct };
  return { pct: 0 };
}

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initMerit() {
  const btn = $("meritBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const rows = [];
    for (let i = 1; i <= 5; i++) {
      const obtained = parseFloat(($("meritObtained" + i).value || "")) || 0;
      const total = parseFloat(($("meritTotal" + i).value || "")) || 0;
      const weight = parseFloat(($("meritWeight" + i).value || "")) || 0;
      if (total > 0 && weight > 0) rows.push({ obtained, total, weight, pct: obtained / total * 100 });
    }
    if (!rows.length) { setError("meritStatus", "Please enter at least one part: obtained marks, total marks and its weight."); return; }
    const weightSum = rows.reduce((a, r) => a + r.weight, 0);
    if (Math.abs(weightSum - 100) > 0.01) { setStatus("meritStatus", "Weights add up to " + weightSum + "%. They should add up to 100% for a merit aggregate."); return; }
    const aggregate = rows.reduce((a, r) => a + r.pct * r.weight / 100, 0);
    const el = $("meritOutput");
    if (el) el.textContent = rows.map((r, i) => "Part " + (i + 1) + ": " + r.pct.toFixed(2) + "% x " + r.weight + "% weight = " + (r.pct * r.weight / 100).toFixed(2)).join("\n") + "\n\nMerit aggregate: " + aggregate.toFixed(2) + "%\n\nFormula: sum of (obtained / total x 100 x weight / 100) for each part.";
    setStatus("meritStatus", "Done.");
  });
  const revBtn = $("meritRevBtn");
  if (revBtn) revBtn.addEventListener("click", () => {
    const known = [];
    for (let i = 1; i <= 4; i++) {
      const obtained = parseFloat(($("meritObtained" + i).value || "")) || 0;
      const total = parseFloat(($("meritTotal" + i).value || "")) || 0;
      const weight = parseFloat(($("meritWeight" + i).value || "")) || 0;
      if (total > 0 && weight > 0) known.push({ pct: obtained / total * 100, weight });
    }
    const result = meritReversePlanner(
      parseFloat(($("meritTarget") || {}).value),
      known,
      parseFloat(($("meritRevTotal") || {}).value),
      parseFloat(($("meritRevWeight") || {}).value)
    );
    const el = $("meritRevOutput");
    if (result.error) { setError("meritRevStatus", result.error); return; }
    if (result.impossible) {
      if (el) el.textContent = "Not possible: even full marks in the last part cannot reach the target. You would need " + result.needPct + "% in it.";
    } else if (result.already) {
      if (el) el.textContent = "Already there: your known parts alone reach the target, so any marks in the last part keep you above it.";
    } else {
      if (el) el.textContent = "You need " + result.needPct + "% in the last part, which is " + result.needObtained + " marks out of " + parseFloat(($("meritRevTotal") || {}).value) + ".";
    }
    setStatus("meritRevStatus", "Done.");
  });
  const gpaBtn = $("meritGpaBtn");
  if (gpaBtn) gpaBtn.addEventListener("click", () => {
    const pctVal = parseFloat(($("meritGpaPct") || {}).value);
    const gpaVal = parseFloat(($("meritGpaVal") || {}).value);
    const el = $("meritGpaOutput");
    if (!isNaN(pctVal) && ($("meritGpaPct") || {}).value !== "") {
      const r = pctToGpa(pctVal);
      if (r.error) { setError("meritGpaStatus", r.error); return; }
      if (el) el.textContent = pctVal + "% is a GPA of " + r.gpa.toFixed(1) + " on the common 4.0 scale. This is a common conversion, not an official scale: universities set their own grade boundaries.";
    } else if (!isNaN(gpaVal) && ($("meritGpaVal") || {}).value !== "") {
      const r = gpaToPct(gpaVal);
      if (r.error) { setError("meritGpaStatus", r.error); return; }
      if (el) el.textContent = "A GPA of " + gpaVal + " is about " + r.pct + "% or more on the common 4.0 scale. This is a common conversion, not an official scale: universities set their own grade boundaries.";
    } else {
      setError("meritGpaStatus", "Enter a percentage or a GPA first.");
      return;
    }
    setStatus("meritGpaStatus", "Done.");
  });
})();
