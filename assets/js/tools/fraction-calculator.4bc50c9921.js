/* AK Premium v12 — fraction-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

const frBtn = $("frBtn");
if (frBtn) frBtn.addEventListener("click", () => {
  const result = fractionCalc(parseFloat($("frNum1").value), parseFloat($("frDen1").value), $("frOp").value, parseFloat($("frNum2").value), parseFloat($("frDen2").value));
  if (result.error) { setError("frStatus", result.error); return; }
  const opSym = { add: "+", sub: "−", mul: "×", div: "÷" }[$("frOp").value] || "+";
  const frac = result.den === 1 ? String(result.num) : result.num + "/" + result.den;
  if ($("frOutput")) $("frOutput").textContent = $("frNum1").value + "/" + $("frDen1").value + " " + opSym + " " + $("frNum2").value + "/" + $("frDen2").value + " = " + frac + " (about " + result.decimal + ").";
  setStatus("frStatus", "Done.");
});
