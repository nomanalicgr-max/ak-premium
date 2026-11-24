/* AK Premium v12 — age-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 tools: pure logic (testable) ---------- */

function calculateAge(dobStr, todayStr) {
  const dob = new Date(dobStr + "T00:00:00");
  if (isNaN(dob.getTime())) return { error: "Please choose a valid date of birth." };
  const today = todayStr ? new Date(todayStr + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  if (dob > today) return { error: "Date of birth cannot be in the future." };
  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthLast = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    days += prevMonthLast;
  }
  if (months < 0) { years -= 1; months += 12; }
  const totalDays = Math.round((today - dob) / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalHours = totalDays * 24;
  let nb = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (nb <= today) nb = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const daysUntilBirthday = Math.round((nb - today) / 86400000);
  const nextBirthday = nb.getFullYear() + "-" + String(nb.getMonth() + 1).padStart(2, "0") + "-" + String(nb.getDate()).padStart(2, "0");
  return { years, months, days, totalDays, totalWeeks, totalHours, daysUntilBirthday, nextBirthday };
}

/* ---------- Phase 1 handlers: Calculators ---------- */

function ageMilestones(dobStr, todayStr) {
  const dob = new Date(dobStr + "T00:00:00");
  if (isNaN(dob.getTime())) return { error: "Please choose a valid date of birth." };
  const today = todayStr ? new Date(todayStr + "T00:00:00") : new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return [18, 60].map((n) => {
    const d = new Date(dob.getFullYear() + n, dob.getMonth(), dob.getDate());
    const daysUntil = Math.round((d - today) / 86400000);
    return { label: n === 18 ? "18th birthday" : "Retirement at 60", date: fmt(d), daysUntil, passed: daysUntil < 0 };
  });
}

const ageBtn = $("ageBtn");
if (ageBtn) ageBtn.addEventListener("click", () => {
  const result = calculateAge($("ageDob").value);
  if (result.error) { setStatus("ageStatus", result.error); return; }
  let out = "Age: " + result.years + " years, " + result.months + " months, " + result.days + " days."
    + "\nTotal: " + result.totalDays + " days (" + result.totalWeeks + " weeks, " + result.totalHours + " hours)."
    + "\nNext birthday: " + result.nextBirthday + " (in " + result.daysUntilBirthday + " days).";
  const onDate = ($("ageOnDate") || {}).value;
  if (onDate) {
    const aged = calculateAge($("ageDob").value, onDate);
    if (!aged.error) out += "\nAge on " + onDate + ": " + aged.years + " years, " + aged.months + " months, " + aged.days + " days.";
  }
  const ms = ageMilestones($("ageDob").value);
  if (!ms.error) out += "\n" + ms.map((m) => m.label + ": " + m.date + (m.passed ? " (passed)" : " (in " + m.daysUntil + " days)")).join("\n");
  if ($("ageOutput")) $("ageOutput").textContent = out;
  setStatus("ageStatus", "Done.");
});

const ageOnDateEl = $("ageOnDate");
if (ageBtn && ageOnDateEl) ageOnDateEl.addEventListener("input", () => { if (($("ageDob") || {}).value) ageBtn.click(); });
