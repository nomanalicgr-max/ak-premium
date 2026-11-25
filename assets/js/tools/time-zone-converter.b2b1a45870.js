/* AK Premium v12 — time-zone-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v33: Calculators 2 + Pakistan ---------- */

function tzLabel(zone) {
  if (TZ_LABELS[zone]) return TZ_LABELS[zone];
  return String(zone).split("/").pop().replace(/_/g, " ");
}
// Wall-clock time in fromZone -> UTC instant (two passes for DST edges).

function tzWallToUtc(dateStr, timeStr, fromZone) {
  if (!dateStr || !timeStr) return { error: "Please pick a date and a time." };
  if (!fromZone) return { error: "Please choose a time zone." };
  const m = String(timeStr).match(/^(\d{2}):(\d{2})$/);
  if (!m) return { error: "Please pick a valid time." };
  const d = String(dateStr).split("-").map(Number);
  if (d.length !== 3 || d.some(isNaN)) return { error: "Please pick a valid date." };
  const wallAsUTC = Date.UTC(d[0], d[1] - 1, d[2], Number(m[1]), Number(m[2]));
  let utc = wallAsUTC - zoneOffsetMs(fromZone, new Date(wallAsUTC));
  utc = wallAsUTC - zoneOffsetMs(fromZone, new Date(utc));
  return { utc };
}
// One time shown across several zones at once (meeting planner).

function tzMeetingPlan(dateStr, timeStr, homeZone, zones) {
  const conv = tzWallToUtc(dateStr, timeStr, homeZone);
  if (conv.error) return conv;
  const rows = (zones || []).filter(Boolean).map((z) => {
    const d = new Date(conv.utc);
    const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: z, hour: "2-digit", minute: "2-digit", hour12: false });
    const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: z, day: "numeric", month: "short", year: "numeric" });
    return { zone: z, label: tzLabel(z), time: timeFmt.format(d), date: dateFmt.format(d) };
  });
  return { rows };
}
// Hours (0-23 in zone A) that fall inside 09:00-17:00 in both zones.

function tzWorkingOverlap(dateStr, zoneA, zoneB) {
  if (!dateStr) return { error: "Please pick a date." };
  if (!zoneA || !zoneB) return { error: "Please choose both zones." };
  const d = String(dateStr).split("-").map(Number);
  if (d.length !== 3 || d.some(isNaN)) return { error: "Please pick a valid date." };
  const bHourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: zoneB, hour: "2-digit", hour12: false });
  const hours = [];
  for (let h = 0; h < 24; h++) {
    const wallAsUTC = Date.UTC(d[0], d[1] - 1, d[2], h, 0);
    let utc = wallAsUTC - zoneOffsetMs(zoneA, new Date(wallAsUTC));
    utc = wallAsUTC - zoneOffsetMs(zoneA, new Date(utc));
    const bHour = Number(bHourFmt.format(new Date(utc))) % 24;
    if (h >= 9 && h < 17 && bHour >= 9 && bHour < 17) hours.push(h);
  }
  return { hours };
}
// A calendar (.ics) file for one event, times in UTC.

function buildIcsEvent(title, utcMs, durationMin, description) {
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = (ms) => {
    const d = new Date(ms);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  };
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AK Premium//Time Zone Converter//EN", "BEGIN:VEVENT", "UID:" + utcMs + "@ak-premium", "DTSTAMP:" + stamp(utcMs), "DTSTART:" + stamp(utcMs), "DTEND:" + stamp(utcMs + (durationMin || 60) * 60000), "SUMMARY:" + esc(title), "DESCRIPTION:" + esc(description), "END:VEVENT", "END:VCALENDAR"].join("\r\n") + "\r\n";
}
/* Pakistan public holidays 2026, Cabinet Division circular F.No.10-1/2025-Min-II
   dated 19 January 2026 ("Public and Optional Holidays for the Year 2026"),
   with the four moon-dependent dates as later confirmed by separate Cabinet
   Division notifications after moon sighting (Eid-ul-Fitr 20-21 Mar, Eid-ul-Azha
   26-28 May, Ashura 25-26 Jun, Eid Milad-un-Nabi 26 Aug). 26 December is a
   public holiday for Christians only, so it is NOT skipped in working days.
   The 2027 list is published by the Cabinet Division at the start of 2027. */

const tzBtn = $("tzBtn");
if (tzBtn) tzBtn.addEventListener("click", () => {
  const result = tzConvert($("tzDate").value, $("tzTime").value, $("tzFrom").value, $("tzTo").value);
  if (result.error) { setError("tzStatus", result.error); return; }
  if ($("tzOutput")) $("tzOutput").textContent = result.text;
  setStatus("tzStatus", "Done.");
});

(function initTzPlan() {
  const btn = $("tzPlanBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const zones = [$("tzPlanZ1"), $("tzPlanZ2"), $("tzPlanZ3")].map((s) => s && s.value).filter(Boolean);
    const result = tzMeetingPlan($("tzPlanDate").value, $("tzPlanTime").value, $("tzPlanHome").value, zones);
    if (result.error) { setError("tzPlanStatus", result.error); return; }
    const home = tzWallToUtc($("tzPlanDate").value, $("tzPlanTime").value, $("tzPlanHome").value);
    const homeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: $("tzPlanHome").value, day: "numeric", month: "short", year: "numeric" });
    const lines = [$("tzPlanTime").value + " on " + homeFmt.format(new Date(home.utc)) + " in " + tzLabel($("tzPlanHome").value) + " is:"];
    result.rows.forEach((r) => lines.push(r.time + " on " + r.date + " in " + r.label));
    const el = $("tzPlanOutput");
    if (el) el.textContent = lines.join("\n");
    setStatus("tzPlanStatus", "Done.");
  });
})();
/* v33: overlapping 09:00-17:00 working hours for two zones. */

(function initTzOverlap() {
  const btn = $("tzOverlapBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const result = tzWorkingOverlap($("tzOverlapDate").value, $("tzOverlapA").value, $("tzOverlapB").value);
    if (result.error) { setError("tzOverlapStatus", result.error); return; }
    const a = tzLabel($("tzOverlapA").value), b = tzLabel($("tzOverlapB").value);
    const el = $("tzOverlapOutput");
    if (result.hours.length) {
      const fmt = (h) => String(h).padStart(2, "0") + ":00";
      if (el) el.textContent = "Working hours overlap in " + a + " and " + b + ": " + fmt(result.hours[0]) + " to " + fmt(result.hours[result.hours.length - 1] + 1) + " " + a + " time (" + result.hours.length + " hour(s)). Outside that window, one side is outside 09:00 to 17:00.";
    } else {
      if (el) el.textContent = "No overlap: there is no hour that is inside 09:00 to 17:00 in both " + a + " and " + b + " on that date. Try a different pair of zones.";
    }
    setStatus("tzOverlapStatus", "Done.");
  });
})();
/* v33: download the converted time as a calendar (.ics) file. */

(function initTzIcs() {
  const btn = $("tzIcsBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const conv = tzWallToUtc($("tzDate").value, $("tzTime").value, $("tzFrom").value);
    if (conv.error) { setError("tzIcsStatus", conv.error + " Convert a time first."); return; }
    const title = ($("tzIcsTitle") && $("tzIcsTitle").value.trim()) || "Meeting";
    const dur = parseInt(($("tzIcsDuration") && $("tzIcsDuration").value) || "60", 10) || 60;
    const ics = buildIcsEvent(title, conv.utc, dur, "Converted with AK Premium Time Zone Converter: " + $("tzTime").value + " in " + tzLabel($("tzFrom").value) + " to " + tzLabel($("tzTo").value) + ".");
    downloadBlob(new Blob([ics], { type: "text/calendar" }), "ak-premium-meeting.ics");
    setStatus("tzIcsStatus", "Done. Calendar file downloaded.");
  });
})();
/* v33: add or subtract days, and a live countdown to a date. */
