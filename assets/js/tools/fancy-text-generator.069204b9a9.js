/* AK Premium v12 — fancy-text-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

const fancyInput = $("fancyInput");
if (fancyInput) fancyInput.addEventListener("input", () => {
  const out = $("fancyOutput");
  if (!out) return;
  const text = fancyInput.value || "";
  out.innerHTML = "";
  if (!text.trim()) return;
  fancyRows(text).forEach(([label, styled]) => {
    const row = document.createElement("div");
    row.className = "fancy-row";
    const name = document.createElement("span");
    name.className = "fancy-name";
    name.textContent = label;
    const val = document.createElement("span");
    val.className = "fancy-text";
    val.textContent = styled;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn-secondary";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => copyTextToClipboard(styled, "fancyStatus", "Copied " + label + "."));
    row.appendChild(name);
    row.appendChild(val);
    row.appendChild(copy);
    out.appendChild(row);
  });
});
