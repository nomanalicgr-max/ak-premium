/* AK Premium v12 — percentage-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 tools: pure logic (testable) ---------- */

function percentageCalc(mode, x, y, round2) {
  if (isNaN(x) || isNaN(y)) return { error: "Please enter numbers for both X and Y." };
  const fmt = (n) => round2 ? String(Math.round(n * 100) / 100) : String(n);
  if (mode === "of") { const v = (x / 100) * y; return { value: v, text: x + "% of " + y + " = " + fmt(v) }; }
  if (mode === "share") {
    if (y === 0) return { error: "Y cannot be zero for this calculation." };
    const v = (x / y) * 100; return { value: v, text: x + " is " + fmt(v) + "% of " + y };
  }
  if (mode === "change") {
    if (x === 0) return { error: "X cannot be zero for a percentage change." };
    const v = ((y - x) / Math.abs(x)) * 100;
    return { value: v, text: "Percentage change from " + x + " to " + y + " = " + fmt(v) + "%" };
  }
  if (mode === "reverse") {
    if (x < 0 || x >= 100) return { error: "The discount must be between 0 and 100 percent for a reverse calculation." };
    const v = y / (1 - x / 100);
    return { value: v, text: "Original price before a " + x + "% discount, with a sale price of " + y + ", = " + fmt(v) };
  }
  if (mode === "points") {
    const v = y - x;
    return { value: v, text: "The difference between " + x + "% and " + y + "% is " + fmt(v) + " percentage points" };
  }
  if (mode === "margin") {
    if (y === 0) return { error: "The selling price cannot be zero for a margin." };
    const v = ((y - x) / y) * 100;
    return { value: v, text: "Margin on a cost of " + x + " sold at " + y + " = " + fmt(v) + "%" };
  }
  if (mode === "markup") {
    if (x === 0) return { error: "The cost cannot be zero for a markup." };
    const v = ((y - x) / x) * 100;
    return { value: v, text: "Markup on a cost of " + x + " sold at " + y + " = " + fmt(v) + "%" };
  }
  return { error: "Please choose a calculation type." };
}

/* ---------- Phase 1 handlers: Calculators ---------- */

const percentBtn = $("percentBtn");
if (percentBtn) percentBtn.addEventListener("click", () => {
  const result = percentageCalc($("percentMode").value, parseFloat($("percentX").value), parseFloat($("percentY").value), !!($("percentRound") && $("percentRound").checked));
  if (result.error) { setStatus("percentStatus", result.error); return; }
  if ($("percentOutput")) $("percentOutput").textContent = result.text;
  setStatus("percentStatus", "Done.");
});

const percentRoundEl = $("percentRound");
if (percentBtn && percentRoundEl) percentRoundEl.addEventListener("change", () => { if (($("percentX") || {}).value !== "" && ($("percentY") || {}).value !== "") percentBtn.click(); });
