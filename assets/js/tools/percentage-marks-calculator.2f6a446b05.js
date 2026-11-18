/* AK Premium v12 — percentage-marks-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- v4: Pakistan / Urdu tools ---------- */

(function initMerit() {
  const btn = $("meritBtn"); if (!btn) return;
  btn.addEventListener("click", () => {
    const rows = [];
    for (let i = 1; i <= 3; i++) {
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
})();
