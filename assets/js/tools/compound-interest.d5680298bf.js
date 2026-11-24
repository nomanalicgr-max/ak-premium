/* AK Premium v12 — compound-interest (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Calculators & converters (batch 3) ---------- */

function compoundCalc(principal, rate, years, freq, extra) {
  if (isNaN(principal) || principal <= 0) return { error: "Please enter a principal amount more than 0." };
  if (isNaN(rate) || rate < 0) return { error: "Please enter an interest rate of 0 or more." };
  if (isNaN(years) || years <= 0) return { error: "Please enter a number of years more than 0." };
  if (!freq || freq <= 0) return { error: "Please choose how often interest is added." };
  const e = extra || {};
  const deposit = Number(e.deposit) || 0;
  const inflation = Number(e.inflation) || 0;
  if (deposit < 0) return { error: "Please enter a monthly deposit of 0 or more." };
  if (inflation < 0) return { error: "Please enter an inflation rate of 0 or more." };
  const r2 = (n) => Math.round(n * 100) / 100;
  const rows = [];
  let amount, interest;
  if (deposit > 0) {
    // Monthly deposits compound monthly: simulate month by month.
    let bal = principal;
    const mr = rate / 100 / 12;
    let totalDeposits = 0;
    const wholeYears = Math.ceil(years);
    for (let yr = 1; yr <= wholeYears; yr++) {
      const start = bal;
      let yrInterest = 0, yrDeposits = 0;
      const mCount = (yr === wholeYears && years % 1 !== 0) ? Math.round((years % 1) * 12) : 12;
      for (let m = 0; m < mCount; m++) {
        const intr = bal * mr;
        bal += intr + deposit;
        yrInterest += intr; yrDeposits += deposit;
      }
      totalDeposits += yrDeposits;
      rows.push({ year: yr, start: r2(start), interest: r2(yrInterest), deposit: r2(yrDeposits), end: r2(bal) });
    }
    amount = r2(bal);
    interest = r2(bal - principal - totalDeposits);
  } else {
    const amountRaw = principal * Math.pow(1 + rate / 100 / freq, freq * years);
    amount = Math.round(amountRaw * 100) / 100;
    interest = Math.round((amount - principal) * 100) / 100;
    for (let yr = 1; yr <= Math.ceil(years); yr++) {
      const y = Math.min(yr, years);
      const start = principal * Math.pow(1 + rate / 100 / freq, freq * (y - 1));
      const end = principal * Math.pow(1 + rate / 100 / freq, freq * y);
      rows.push({ year: yr, start: r2(start), interest: r2(end - start), deposit: 0, end: r2(end) });
    }
  }
  const out = { amount, interest, rows };
  if (inflation > 0) out.realValue = r2(amount / Math.pow(1 + inflation / 100, years));
  return out;
}

function compoundYearTable(rows) {
  if (!rows || !rows.length) return "";
  let html = "<table><thead><tr><th>Year</th><th>Start</th><th>Interest</th><th>Deposits</th><th>End</th></tr></thead><tbody>";
  rows.forEach((r) => {
    html += "<tr><td>" + r.year + "</td><td>" + fmtMoney(r.start, 2) + "</td><td>" + fmtMoney(r.interest, 2) + "</td><td>" + fmtMoney(r.deposit, 2) + "</td><td>" + fmtMoney(r.end, 2) + "</td></tr>";
  });
  return html + "</tbody></table>";
}

/* ---------- v33: Calculators 2 + Pakistan ---------- */

const ciBtn = $("ciBtn");
if (ciBtn) ciBtn.addEventListener("click", () => {
  const result = compoundCalc(parseFloat($("ciPrincipal").value), parseFloat($("ciRate").value), parseFloat($("ciYears").value), parseFloat($("ciFreq").value), {
    deposit: ($("ciDeposit") || {}).value,
    inflation: ($("ciInflation") || {}).value
  });
  if (result.error) { setError("ciStatus", result.error); return; }
  let out = "Maturity amount: " + fmtMoney(result.amount, 0) + ". Interest earned: " + fmtMoney(result.interest, 0) + ".";
  if (result.realValue !== undefined) out += "\nIn today" + "'" + "s money (after inflation): " + fmtMoney(result.realValue, 0) + ".";
  if ($("ciOutput")) $("ciOutput").textContent = out;
  const tbl = $("ciTable");
  if (tbl) tbl.innerHTML = compoundYearTable(result.rows);
  const cmp = $("ciCompareOut");
  if (cmp) {
    if (!($("ciCompare") && $("ciCompare").checked)) { cmp.innerHTML = ""; }
    else {
      const rate2 = parseFloat(($("ciRate2") || {}).value);
      const second = compoundCalc(parseFloat($("ciPrincipal").value), rate2, parseFloat($("ciYears").value), parseFloat($("ciFreq").value), { deposit: ($("ciDeposit") || {}).value, inflation: ($("ciInflation") || {}).value });
      if (second.error) { cmp.innerHTML = "<p>" + escapeHtml(second.error) + "</p>"; }
      else {
        cmp.innerHTML = "<table><thead><tr><th></th><th>Plan 1 (" + fmtTrim(parseFloat($("ciRate").value)) + "%)</th><th>Plan 2 (" + fmtTrim(rate2) + "%)</th></tr></thead><tbody>"
          + "<tr><td>Maturity amount</td><td>" + fmtMoney(result.amount, 0) + "</td><td>" + fmtMoney(second.amount, 0) + "</td></tr>"
          + "<tr><td>Interest earned</td><td>" + fmtMoney(result.interest, 0) + "</td><td>" + fmtMoney(second.interest, 0) + "</td></tr>"
          + "</tbody></table>"
          + "<p>Plan 2 gives " + fmtMoney(second.amount - result.amount, 0) + " more than Plan 1.</p>";
      }
    }
  }
  setStatus("ciStatus", "Done.");
});

const ciCompareCb = $("ciCompare");
if (ciCompareCb) ciCompareCb.addEventListener("change", () => {
  const row = $("ciCompareRow");
  if (row) row.style.display = ciCompareCb.checked ? "" : "none";
});
["ciDeposit", "ciInflation", "ciRate2", "ciCompare"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
    if (ciBtn && ($("ciPrincipal") || {}).value !== "" && ($("ciRate") || {}).value !== "" && ($("ciYears") || {}).value !== "") ciBtn.click();
  });
});
