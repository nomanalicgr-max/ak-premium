/* AK Premium v12 — fraction-calculator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

function fractionCalc(n1, d1, op, n2, d2, extra) {
  if (!Number.isInteger(n1) || !Number.isInteger(d1) || !Number.isInteger(n2) || !Number.isInteger(d2)) return { error: "Please enter whole numbers only." };
  if (d1 === 0 || d2 === 0) return { error: "The bottom number cannot be zero." };
  const e = extra || {};
  const w1 = Number(e.whole1) || 0, w2 = Number(e.whole2) || 0;
  if (!Number.isInteger(w1) || !Number.isInteger(w2)) return { error: "Please enter whole numbers only for the whole parts." };
  if ((w1 !== 0 && n1 < 0) || (w2 !== 0 && n2 < 0)) return { error: "With a whole part, use a positive top number, such as 1 1/2." };
  const eff1 = w1 < 0 ? w1 * d1 - n1 : w1 * d1 + n1;
  const eff2 = w2 < 0 ? w2 * d2 - n2 : w2 * d2 + n2;
  let num, den;
  if (op === "add") { num = eff1 * d2 + eff2 * d1; den = d1 * d2; }
  else if (op === "sub") { num = eff1 * d2 - eff2 * d1; den = d1 * d2; }
  else if (op === "mul") { num = eff1 * eff2; den = d1 * d2; }
  else if (op === "div") {
    if (eff2 === 0) return { error: "Cannot divide by a fraction of zero." };
    num = eff1 * d2; den = d1 * eff2;
  } else return { error: "Please choose an operation." };
  if (den < 0) { num = -num; den = -den; }
  const g = gcdCalc(num, den);
  const simpNum = num / g, simpDen = den / g;
  const steps = fractionSteps(eff1, d1, op, eff2, d2, num, den, simpNum, simpDen, g);
  return { num: simpNum, den: simpDen, decimal: Math.round(simpNum / simpDen * 10000) / 10000, percent: Math.round(simpNum / simpDen * 100 * 100) / 100, mixed: mixedFraction(simpNum, simpDen), steps };
}

function mixedFraction(num, den) {
  if (den === 1) return String(num);
  if (Math.abs(num) < den) return num + "/" + den;
  const whole = Math.trunc(num / den);
  const rem = Math.abs(num % den);
  return rem === 0 ? String(whole) : whole + " " + rem + "/" + den;
}

function fractionSteps(a, d1, op, b, d2, num, den, simpNum, simpDen, g) {
  const sym = { add: "+", sub: "\u2212", mul: "\u00d7", div: "\u00f7" }[op] || "+";
  const steps = [];
  const fmt = (n, d) => d === 1 ? String(n) : n + "/" + d;
  if (op === "add" || op === "sub") {
    const cd = d1 * d2;
    steps.push(fmt(a, d1) + " = " + fmt(a * d2, cd));
    steps.push(fmt(b, d2) + " = " + fmt(b * d1, cd));
    steps.push(fmt(a * d2, cd) + " " + sym + " " + fmt(b * d1, cd) + " = " + fmt(num, den));
  } else if (op === "mul") {
    steps.push(fmt(a, d1) + " \u00d7 " + fmt(b, d2) + " = " + fmt(num, den) + " (multiply the tops, multiply the bottoms)");
  } else if (op === "div") {
    steps.push(fmt(a, d1) + " \u00f7 " + fmt(b, d2) + " = " + fmt(a, d1) + " \u00d7 " + fmt(d2, b) + " = " + fmt(num, den) + " (flip the second fraction and multiply)");
  }
  if (g > 1) steps.push(fmt(num, den) + " simplifies to " + fmt(simpNum, simpDen) + " (divide the top and bottom by " + g + ")");
  else steps.push(fmt(simpNum, simpDen) + " is already in its simplest form");
  return steps;
}

function fractionSumChain(fracs, op) {
  if (!fracs || fracs.length < 2) return { error: "Please enter at least two fractions." };
  let acc = fractionCalc(fracs[0].n, fracs[0].d, op, fracs[1].n, fracs[1].d, { whole1: fracs[0].whole || 0, whole2: fracs[1].whole || 0 });
  if (acc.error) return acc;
  const steps = acc.steps.slice();
  for (let i = 2; i < fracs.length; i++) {
    const next = fractionCalc(acc.num, acc.den, op, fracs[i].n, fracs[i].d, { whole1: 0, whole2: fracs[i].whole || 0 });
    if (next.error) return next;
    steps.push.apply(steps, next.steps);
    acc = next;
  }
  acc.steps = steps;
  return acc;
}

const frBtn = $("frBtn");
if (frBtn) frBtn.addEventListener("click", () => {
  const op = $("frOp").value;
  const f1 = { n: parseInt($("frNum1").value, 10), d: parseInt($("frDen1").value, 10), whole: parseInt(($("frWhole1") || {}).value || "0", 10) };
  const f2 = { n: parseInt($("frNum2").value, 10), d: parseInt($("frDen2").value, 10), whole: parseInt(($("frWhole2") || {}).value || "0", 10) };
  const num3v = ($("frNum3") || {}).value;
  const hasThird = num3v !== undefined && num3v !== "";
  let result;
  if (hasThird) {
    const f3 = { n: parseInt(num3v, 10), d: parseInt($("frDen3").value, 10), whole: parseInt(($("frWhole3") || {}).value || "0", 10) };
    result = fractionSumChain([f1, f2, f3], op);
  } else {
    result = fractionCalc(f1.n, f1.d, op, f2.n, f2.d, { whole1: f1.whole, whole2: f2.whole });
  }
  if (result.error) { setError("frStatus", result.error); return; }
  const opSym = { add: "+", sub: "\u2212", mul: "\u00d7", div: "\u00f7" }[op] || "+";
  const effNum = (w, n, d) => w < 0 ? w * d - n : w * d + n;
  const mixed1 = mixedFraction(effNum(f1.whole, f1.n, f1.d), f1.d);
  const mixed2 = mixedFraction(effNum(f2.whole, f2.n, f2.d), f2.d);
  let out = mixed1 + " " + opSym + " " + mixed2;
  if (hasThird) {
    const f3 = { n: parseInt(num3v, 10), d: parseInt($("frDen3").value, 10), whole: parseInt(($("frWhole3") || {}).value || "0", 10) };
    out += " " + opSym + " " + mixedFraction(effNum(f3.whole, f3.n, f3.d), f3.d);
  }
  out += " = " + result.mixed + " (about " + result.decimal + ", " + result.percent + "%).";
  if ($("frOutput")) $("frOutput").textContent = out;
  const stepsEl = $("frSteps");
  if (stepsEl) stepsEl.innerHTML = result.steps && result.steps.length ? "<p>Working:</p><ol>" + result.steps.map((s) => "<li>" + escapeHtml(s) + "</li>").join("") + "</ol>" : "";
  setStatus("frStatus", "Done.");
});
["frWhole1", "frWhole2", "frWhole3", "frNum3", "frDen3"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
    if (frBtn && ($("frNum1") || {}).value !== "" && ($("frDen1") || {}).value !== "" && ($("frNum2") || {}).value !== "" && ($("frDen2") || {}).value !== "") frBtn.click();
  });
});
