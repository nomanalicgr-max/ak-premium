/* AK Premium v12 — date-difference (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function pkHolidaySet() {
  return new Set(["2026-02-05", "2026-03-20", "2026-03-21", "2026-03-23", "2026-05-01", "2026-05-26", "2026-05-27", "2026-05-28", "2026-06-25", "2026-06-26", "2026-08-14", "2026-08-26", "2026-11-09", "2026-12-25"]);
}
// Working days (Monday to Friday) between two dates, both end dates counted.

function workingDaysBetween(fromStr, toStr, skipHolidays) {
  const a = new Date(fromStr + "T00:00:00");
  const b = new Date(toStr + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return { error: "Please pick two valid dates." };
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  const holidays = pkHolidaySet();
  let working = 0, weekend = 0, holidayCount = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const key = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2, "0") + "-" + String(cur.getDate()).padStart(2, "0");
    if (dow === 0 || dow === 6) weekend++;
    else if (skipHolidays && holidays.has(key)) holidayCount++;
    else working++;
    cur.setDate(cur.getDate() + 1);
  }
  return { working, weekend, holidayCount, total: Math.round((end - start) / 86400000) + 1 };
}

function addDaysToDate(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return { error: "Please pick a valid date." };
  if (!Number.isInteger(n)) return { error: "Please enter a whole number of days." };
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  const iso = r.getFullYear() + "-" + String(r.getMonth() + 1).padStart(2, "0") + "-" + String(r.getDate()).padStart(2, "0");
  return { date: r, iso };
}
// Add months without rolling over month ends (31 Jan + 1 month = 28/29 Feb).

function addMonthsClamped(d, n) {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(day, last));
  return r;
}
// Calendar-accurate years + months + days between two dates.

function ymdBreakdown(fromStr, toStr) {
  const a = new Date(fromStr + "T00:00:00");
  const b = new Date(toStr + "T00:00:00");
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return { error: "Please pick two valid dates." };
  const start = a <= b ? a : b;
  const end = a <= b ? b : a;
  let years = end.getFullYear() - start.getFullYear();
  let anchor = addMonthsClamped(start, years * 12);
  if (anchor > end) { years--; anchor = addMonthsClamped(start, years * 12); }
  let months = (end.getFullYear() - anchor.getFullYear()) * 12 + (end.getMonth() - anchor.getMonth());
  let mAnchor = addMonthsClamped(anchor, months);
  if (mAnchor > end) { months--; mAnchor = addMonthsClamped(anchor, months); }
  const days = Math.round((end - mAnchor) / 86400000);
  return { years, months, days };
}
// Days, hours, minutes and seconds left until a target date and time.

function countdownParts(targetStr, nowMs) {
  const t = new Date(targetStr);
  if (isNaN(t.getTime())) return { error: "Please pick a valid target date and time." };
  let diff = t.getTime() - (nowMs || Date.now());
  if (diff <= 0) return { passed: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / 86400000); diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000); diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return { passed: false, days, hours, minutes, seconds };
}
// Daily calorie target for a goal: lose about 0.5 kg a week (-500), gain (+500).

const ddBtn = $("ddBtn");
if (ddBtn) ddBtn.addEventListener("click", () => {
  const result = dateDiffCalc($("ddFrom").value, $("ddTo").value);
  if (result.error) { setError("ddStatus", result.error); return; }
  const dayWord = result.remDays === 1 ? " day" : " days";
  const monthWord = result.months === 1 ? " month." : " months.";
  let out = result.days + " days. That is " + result.weeks + " weeks and " + result.remDays + dayWord + ", or " + result.months + monthWord;
  const br = ymdBreakdown($("ddFrom").value, $("ddTo").value);
  if (!br.error) out += "\nBroken down: " + br.years + " year(s), " + br.months + " month(s), " + br.days + " day(s).";
  if ($("ddWorking") && $("ddWorking").checked) {
    const wd = workingDaysBetween($("ddFrom").value, $("ddTo").value, true);
    if (!wd.error) out += "\nWorking days (Monday to Friday, both dates counted, skipping Pakistan public holidays 2026): " + wd.working + ". Weekends in the range: " + wd.weekend + ". Public holidays skipped: " + wd.holidayCount + ".";
  }
  if ($("ddOutput")) $("ddOutput").textContent = out;
  setStatus("ddStatus", "Done.");
});

(function initDdExtra() {
  const addBtn = $("ddAddBtn");
  if (addBtn) addBtn.addEventListener("click", () => {
    const result = addDaysToDate($("ddBase").value, parseInt(($("ddDays").value || "").trim(), 10));
    if (result.error) { setError("ddAddStatus", result.error); return; }
    const d = result.date;
    const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(d);
    const el = $("ddAddOutput");
    if (el) el.textContent = "Result: " + result.iso + " (" + dayName + ").";
    setStatus("ddAddStatus", "Done.");
  });
  let timer = null;
  const render = () => {
    const result = countdownParts(($("ddTarget") || {}).value, Date.now());
    const el = $("ddCountOutput");
    if (result.error) { if (el) el.textContent = "Pick a target date and time first."; return; }
    if (result.passed) {
      if (el) el.textContent = "That date has already passed.";
      if (timer) { clearInterval(timer); timer = null; }
      setStatus("ddCountStatus", "Done.");
      return;
    }
    if (el) el.textContent = result.days + " day(s), " + result.hours + " hour(s), " + result.minutes + " minute(s), " + result.seconds + " second(s) to go.";
  };
  const countBtn = $("ddCountBtn");
  if (countBtn) countBtn.addEventListener("click", () => {
    const check = countdownParts(($("ddTarget") || {}).value, Date.now());
    if (check.error) { setError("ddCountStatus", check.error); return; }
    if (timer) clearInterval(timer);
    render();
    timer = setInterval(render, 1000);
    setStatus("ddCountStatus", "Counting down. Press Stop to stop it.");
  });
  const stopBtn = $("ddCountStop");
  if (stopBtn) stopBtn.addEventListener("click", () => {
    if (timer) { clearInterval(timer); timer = null; }
    setStatus("ddCountStatus", "Stopped.");
  });
})();
/* v33: TDEE extras — goal target, macros, Katch-McArdle and imperial units. */
