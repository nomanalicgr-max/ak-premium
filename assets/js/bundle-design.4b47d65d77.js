/* AK Premium v9 — bundle-design (split from app.js, Phase 4.3). Loads after core.js. */

/* ---------- Phase 2 handlers: Design ---------- */

const paletteBtn = $("paletteBtn");
if (paletteBtn) paletteBtn.addEventListener("click", () => {
  const parsed = colorPalette($("paletteBase").value);
  if (parsed.error) { setStatus("paletteStatus", parsed.error); return; }
  const out = $("paletteOutput");
  if (out) {
    out.innerHTML = "";
    parsed.items.forEach((item) => {
      const sw = document.createElement("button");
      sw.type = "button"; sw.className = "swatch"; sw.dataset.hex = item.hex;
      sw.title = "Click to copy " + item.hex;
      sw.innerHTML = "<span class=\"swatch-color\" style=\"background:" + item.hex + "\"></span><span>" + item.label + "</span><span>" + item.hex + "</span>";
      out.appendChild(sw);
    });
  }
  setStatus("paletteStatus", "Done. Click a swatch to copy its hex code.");
});

const paletteOutput = $("paletteOutput");
if (paletteOutput) paletteOutput.addEventListener("click", (event) => {
  const sw = event.target.closest ? event.target.closest(".swatch") : null;
  if (sw && sw.dataset.hex) copyTextToClipboard(sw.dataset.hex, "paletteStatus", "Copied " + sw.dataset.hex + ".");
});
