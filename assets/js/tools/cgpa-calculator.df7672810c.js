/* AK Premium v12 — cgpa-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 tools: pure logic (testable) ---------- */

function parseCgpa(text, scale) {
  const sc = Number(scale) === 10 ? 10 : 4;
  const LETTER_4 = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0 };
  const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!lines.length) return { error: "Please add at least one course, one per line as: Course, credit hours, grade point." };
  let creditSum = 0, weighted = 0;
  const semesters = {};
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if ((parts.length !== 3 && parts.length !== 4) || !parts[0]) return { error: "Invalid course line: \"" + line + "\". Use: Course, credit hours, grade point." };
    const credits = parseFloat(parts[1]);
    if (isNaN(credits) || credits <= 0) return { error: "Invalid credit hours in line: \"" + line + "\"." };
    const gradeRaw = parts[2];
    let grade;
    if (/^[A-F][+-]?$/i.test(gradeRaw)) {
      if (sc !== 4) return { error: "Letter grades work on the 4.0 scale. Type a number from 0 to 10 for the 10.0 scale in line: \"" + line + "\"." };
      grade = LETTER_4[gradeRaw.toUpperCase()];
      if (grade === undefined) return { error: "Unknown grade \"" + gradeRaw + "\" in line: \"" + line + "\"." };
    } else {
      grade = parseFloat(gradeRaw);
      if (isNaN(grade) || grade < 0 || grade > sc) return { error: "Invalid grade point in line: \"" + line + "\". Grade points run from 0 to " + sc + " on this scale." };
    }
    creditSum += credits; weighted += credits * grade;
    const sem = parts.length === 4 ? parts[3] : "All courses";
    if (!semesters[sem]) semesters[sem] = { name: sem, credits: 0, weighted: 0 };
    semesters[sem].credits += credits; semesters[sem].weighted += credits * grade;
  }
  if (!creditSum) return { error: "Total credit hours cannot be zero." };
  const cgpa = Math.round((weighted / creditSum) * 100) / 100;
  const semList = Object.values(semesters).map((s) => ({ name: s.name, credits: s.credits, cgpa: Math.round((s.weighted / s.credits) * 100) / 100 }));
  const percent = Math.round(cgpa / sc * 1000) / 10;
  return { cgpa, credits: creditSum, scale: sc, percent, semesters: semList };
}

function cgpaWhatIf(currentCgpa, currentCredits, futureText, scale) {
  if (isNaN(currentCgpa) || currentCgpa < 0 || isNaN(currentCredits) || currentCredits <= 0) return { error: "Please enter your current CGPA and credit hours first." };
  const fut = parseCgpa(futureText, scale);
  if (fut.error) return fut;
  const totalCredits = currentCredits + fut.credits;
  const newCgpa = Math.round(((currentCgpa * currentCredits + fut.cgpa * fut.credits) / totalCredits) * 100) / 100;
  return { newCgpa, totalCredits, futureCgpa: fut.cgpa, futureCredits: fut.credits };
}

function cgpaRequiredAverage(currentCgpa, currentCredits, targetCgpa, remainingCredits, scale) {
  if (isNaN(currentCgpa) || currentCgpa < 0 || isNaN(currentCredits) || currentCredits < 0 || isNaN(targetCgpa) || targetCgpa < 0 || isNaN(remainingCredits) || remainingCredits <= 0) return { error: "Please enter your current CGPA, credit hours, target CGPA and remaining credit hours." };
  const max = Number(scale) === 10 ? 10 : 4;
  const needed = (targetCgpa * (currentCredits + remainingCredits) - currentCgpa * currentCredits) / remainingCredits;
  return { required: Math.round(needed * 100) / 100, possible: needed >= 0 && needed <= max };
}

/* ---------- Phase 2 handlers: Calculators ---------- */

const cgpaBtn = $("cgpaBtn");
if (cgpaBtn) cgpaBtn.addEventListener("click", () => {
  const scale = ($("cgpaScale") || {}).value || "4";
  const result = parseCgpa($("cgpaInput").value, scale);
  if (result.error) { setStatus("cgpaStatus", result.error); return; }
  let out = "CGPA: " + result.cgpa.toFixed(2) + " (out of " + result.scale + ".0)"
    + "\nTotal credit hours: " + result.credits
    + "\nAbout " + result.percent + "%";
  if (result.semesters.length > 1) {
    out += "\n" + result.semesters.map((s) => s.name + ": " + s.cgpa.toFixed(2) + " (" + s.credits + " credits)").join("\n");
  }
  const target = parseFloat(($("cgpaTarget") || {}).value);
  const remaining = parseFloat(($("cgpaRemaining") || {}).value);
  if (!isNaN(target) && !isNaN(remaining) && remaining > 0) {
    const req = cgpaRequiredAverage(result.cgpa, result.credits, target, remaining, scale);
    if (!req.error) {
      out += "\nTo reach " + target.toFixed(2) + " in your next " + remaining + " credits, you need an average of " + req.required.toFixed(2) + "."
        + (req.possible ? "" : " That is above the " + result.scale + ".0 scale, so the target cannot be reached in " + remaining + " credits.");
    }
  }
  if ($("cgpaOutput")) $("cgpaOutput").textContent = out;
  setStatus("cgpaStatus", "Done.");
});

const cgpaPlanBtn = $("cgpaPlanBtn");
if (cgpaPlanBtn) cgpaPlanBtn.addEventListener("click", () => {
  const scale = ($("cgpaScale") || {}).value || "4";
  const result = cgpaWhatIf(parseFloat($("cgpaCurrent").value), parseFloat($("cgpaCurrentCredits").value), $("cgpaFuture").value, scale);
  if (result.error) { setStatus("cgpaStatus", result.error); return; }
  if ($("cgpaPlanOutput")) $("cgpaPlanOutput").textContent = "With those future courses (" + result.futureCgpa.toFixed(2) + " over " + result.futureCredits + " credits), your CGPA becomes " + result.newCgpa.toFixed(2) + " over " + result.totalCredits + " credit hours.";
  setStatus("cgpaStatus", "Done. What-if calculated.");
});
["cgpaScale", "cgpaTarget", "cgpaRemaining"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
    if (cgpaBtn && ($("cgpaInput") || {}).value.trim() !== "") cgpaBtn.click();
  });
});
