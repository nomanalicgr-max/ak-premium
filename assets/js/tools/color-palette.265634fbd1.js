/* AK Premium v12 — color-palette (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 2 tools: pure logic (testable) ---------- */

function hexToRgb(hex) {
  const c = String(hex || "").replace("#", "");
  return { r: parseInt(c.slice(0, 2), 16), g: parseInt(c.slice(2, 4), 16), b: parseInt(c.slice(4, 6), 16) };
}

function rgbToHex(r, g, b) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}
/* Mix a colour with white (t > 0) or black (t < 0); t in -1..1. */

function mixHex(hex, t) {
  const c = hexToRgb(hex);
  const f = t >= 0 ? 255 : 0, k = Math.abs(t);
  return rgbToHex(c.r + (f - c.r) * k, c.g + (f - c.g) * k, c.b + (f - c.b) * k);
}
/* WCAG 2 relative luminance (0 to 1). */

function wcagLuminance(hex) {
  const c = hexToRgb(hex);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
/* WCAG 2 contrast ratio, 1:1 to 21:1. */

function wcagContrastRatio(a, b) {
  const l1 = wcagLuminance(a), l2 = wcagLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
/* AA needs 4.5:1 for normal text and 3:1 for large text; AAA needs 7:1
   for normal text and 4.5:1 for large text. */

function wcagContrastGrade(ratio, large) {
  if (large) return ratio >= 4.5 ? "AAA" : ratio >= 3 ? "AA" : "Fail";
  return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail";
}
/* Harmonies from a base colour. Returns labelled items; "all" keeps the
   original six-item palette. */

function colorHarmonies(baseHex, harmony) {
  if (!/^#[0-9a-fA-F]{6}$/.test(String(baseHex || ""))) return { error: "Please choose a valid color." };
  const hsl = hexToHsl(baseHex);
  const base = baseHex.toLowerCase();
  const mk = (label, h, s, l) => ({ label: label, hex: hslToHex(h, s === undefined ? hsl.s : s, l === undefined ? hsl.l : l) });
  if (harmony === "complementary") return [ { label: "Base", hex: base }, mk("Complementary", hsl.h + 180) ];
  if (harmony === "analogous") return [ { label: "Base", hex: base }, mk("Analogous -30", hsl.h - 30), mk("Analogous +30", hsl.h + 30) ];
  if (harmony === "triadic") return [ { label: "Base", hex: base }, mk("Triadic +120", hsl.h + 120), mk("Triadic +240", hsl.h + 240) ];
  if (harmony === "tetradic") return [ { label: "Base", hex: base }, mk("Tetradic +90", hsl.h + 90), mk("Tetradic +180", hsl.h + 180), mk("Tetradic +270", hsl.h + 270) ];
  if (harmony === "split") return [ { label: "Base", hex: base }, mk("Split +150", hsl.h + 150), mk("Split +210", hsl.h + 210) ];
  if (harmony === "monochromatic") return [ { label: "Base", hex: base }, mk("Lighter", hsl.h, undefined, Math.min(90, hsl.l + 25)), mk("Darker", hsl.h, undefined, Math.max(10, hsl.l - 25)) ];
  return colorPalette(baseHex).items;
}
/* 50 to 900 shade/tint scale: 50 is almost white, 500 is the base colour,
   900 is almost black. */

function shadeTintScale(hex) {
  const steps = [[50, 0.9], [100, 0.75], [200, 0.55], [300, 0.35], [400, 0.15], [500, 0], [600, -0.15], [700, -0.35], [800, -0.55], [900, -0.75]];
  return steps.map(([n, t]) => ({ label: String(n), hex: t === 0 ? hex.toLowerCase() : mixHex(hex, t) }));
}
/* Common CSS colour names, so "red" or "navy" works as a colour input. */
const CSS_COLOR_NAMES = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", pink: "#ffc0cb", brown: "#a52a2a", grey: "#808080", gray: "#808080", navy: "#000080", teal: "#008080", olive: "#808000", maroon: "#800000", lime: "#00ff00", aqua: "#00ffff", cyan: "#00ffff", magenta: "#ff00ff", fuchsia: "#ff00ff", silver: "#c0c0c0", gold: "#ffd700", coral: "#ff7f50", salmon: "#fa8072", khaki: "#f0e68c", beige: "#f5f5dc", ivory: "#fffff0", indigo: "#4b0082", violet: "#ee82ee", lavender: "#e6e6fa", turquoise: "#40e0d0", skyblue: "#87ceeb", crimson: "#dc143c", tomato: "#ff6347", chocolate: "#d2691e", tan: "#d2b48c", hotpink: "#ff69b4", steelblue: "#4682b4", seagreen: "#2e8b57", darkgreen: "#006400", darkblue: "#00008b", darkred: "#8b0000", lightblue: "#add8e6", lightgreen: "#90ee90", lightgrey: "#d3d3d3", lightgray: "#d3d3d3", darkgrey: "#a9a9a9", darkgray: "#a9a9a9" };
/* Read a colour typed as #rrggbb, #rgb, rgb(r, g, b), hsl(h, s%, l%) or a
   colour name. Returns a lowercase #rrggbb string, or null. */

function parseColorInput(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(t)) {
    if (t.length === 4) return "#" + t[1] + t[1] + t[2] + t[2] + t[3] + t[3];
    return t;
  }
  let m = t.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (m) { const r = +m[1], g = +m[2], b = +m[3]; if (r <= 255 && g <= 255 && b <= 255) return rgbToHex(r, g, b); return null; }
  m = t.match(/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/);
  if (m) { const h = +m[1], s = +m[2], l = +m[3]; if (h <= 360 && s <= 100 && l <= 100) return hslToHex(h, s, l); return null; }
  if (CSS_COLOR_NAMES[t]) return CSS_COLOR_NAMES[t];
  /* Last resort: let the browser name the colour. Guarded, because in a
     test environment the stub never changes fillStyle. */
  try {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return null;
    c.fillStyle = "#000000"; c.fillStyle = t;
    return /^#[0-9a-f]{6}$/.test(c.fillStyle) && c.fillStyle !== "#000000" ? c.fillStyle : null;
  } catch (e) { return null; }
}
/* Render swatch buttons for the palette plus its 50 to 900 scale, and
   write the base colour's contrast against white and black. */

function renderPalette(base, items, scale) {
  const out = $("paletteOutput");
  if (out) {
    out.innerHTML = "";
    items.forEach((item) => {
      const sw = document.createElement("button");
      sw.type = "button"; sw.className = "swatch"; sw.dataset.hex = item.hex;
      sw.title = "Click to copy " + item.hex;
      sw.innerHTML = "<span class=\"swatch-color\" style=\"background:" + item.hex + "\"></span><span>" + item.label + "</span><span>" + item.hex + "</span>";
      out.appendChild(sw);
    });
    scale.forEach((item) => {
      const sw = document.createElement("button");
      sw.type = "button"; sw.className = "swatch"; sw.dataset.hex = item.hex;
      sw.title = "Click to copy " + item.hex;
      sw.innerHTML = "<span class=\"swatch-color\" style=\"background:" + item.hex + "\"></span><span>Shade " + item.label + "</span><span>" + item.hex + "</span>";
      out.appendChild(sw);
    });
  }
  const cc = $("paletteContrast");
  if (cc) {
    const cw = wcagContrastRatio(base, "#ffffff"), cb = wcagContrastRatio(base, "#000000");
    cc.textContent = "Contrast on white: " + cw.toFixed(2) + ":1 (" + wcagContrastGrade(cw, false) + " for normal text, " + wcagContrastGrade(cw, true) + " for large text). Contrast on black: " + cb.toFixed(2) + ":1 (" + wcagContrastGrade(cb, false) + " for normal text, " + wcagContrastGrade(cb, true) + " for large text).";
  }
}

function paletteToCssVars(p) {
  const lines = [":root {"];
  p.items.forEach((item, i) => lines.push("  --color-" + (i + 1) + ": " + item.hex + "; /* " + item.label + " */"));
  p.scale.forEach((item) => lines.push("  --color-" + item.label + ": " + item.hex + ";"));
  lines.push("}");
  return lines.join("\n") + "\n";
}

function paletteToTailwind(p) {
  const lines = ["// Paste into tailwind.config.js, under theme.extend.colors", "colors: {"];
  lines.push("  brand: {");
  p.scale.forEach((item) => lines.push("    " + item.label + ": '" + item.hex + "',"));
  lines.push("  },");
  lines.push("}");
  return lines.join("\n") + "\n";
}

function paletteSwatchSheet(items) {
  const cw = 160, ch = 160;
  const canvas = document.createElement("canvas"); canvas.width = items.length * cw; canvas.height = ch;
  const ctx = canvas.getContext("2d");
  items.forEach((item, i) => {
    ctx.fillStyle = item.hex; ctx.fillRect(i * cw, 0, cw, 120);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(i * cw, 120, cw, 40);
    ctx.fillStyle = "#111111"; ctx.font = "16px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(item.hex, i * cw + cw / 2, 146);
  });
  return canvas;
}

/* ---------- Phase 2 handlers: Design ---------- */

const paletteBtn = $("paletteBtn");
if (paletteBtn) paletteBtn.addEventListener("click", () => {
  /* Typed input wins over the colour picker, so hex, rgb(), hsl() and
     colour names all work. A typed value that cannot be read is an error,
     not a silent fall back to the picker, so the user is never shown a
     palette for a colour they did not ask for. */
  const typed = (($("paletteText") || {}).value || "").trim();
  let base = null;
  if (typed) {
    base = parseColorInput(typed);
    if (!base) { setStatus("paletteStatus", "Please type a colour as hex, rgb(), hsl() or a colour name, or pick one above."); return; }
  }
  if (!base) base = ($("paletteBase") || {}).value || "";
  if (!/^#[0-9a-fA-F]{6}$/.test(String(base || ""))) { setStatus("paletteStatus", "Please type a colour as hex, rgb(), hsl() or a colour name, or pick one above."); return; }
  base = base.toLowerCase();
  const harmony = ($("paletteHarmony") || {}).value || "all";
  const items = harmony === "all" ? colorPalette(base).items : colorHarmonies(base, harmony);
  if (items.error) { setStatus("paletteStatus", items.error); return; }
  const scale = shadeTintScale(base);
  paletteLast = { base: base, items: items, scale: scale };
  renderPalette(base, items, scale);
  setStatus("paletteStatus", "Done. Click a swatch to copy its hex code.");
});
/* Eyedropper: read the main colours out of an uploaded image with
   color-thief, then show them as a palette. */

const paletteImageInput = $("paletteImageInput");
if (paletteImageInput) paletteImageInput.addEventListener("change", async () => {
  const file = (paletteImageInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "paletteStatus")) return;
  setStatus("paletteStatus", "Reading colours from the image…");
  try {
    if (!window.ColorThief) { const ok = await loadLibrary("colorthief", "paletteStatus"); if (!ok) return; }
    const img = await loadImageFromFile(file);
    const pal = new window.ColorThief().getPalette(img, 6) || [];
    if (!pal.length) { setError("paletteStatus", "No colours could be read from this image."); return; }
    const items = pal.map((c, i) => ({ label: i === 0 ? "Dominant" : "Colour " + (i + 1), hex: rgbToHex(c[0], c[1], c[2]) }));
    const base = items[0].hex;
    const scale = shadeTintScale(base);
    paletteLast = { base: base, items: items, scale: scale };
    renderPalette(base, items, scale);
    setStatus("paletteStatus", "Done. " + items.length + " colours read from the image. Click a swatch to copy its hex code.");
  } catch (e) { setError("paletteStatus", "Could not read colours from this image. Please try a JPG or PNG file."); }
});

const paletteExportCssBtn = $("paletteExportCssBtn");
if (paletteExportCssBtn) paletteExportCssBtn.addEventListener("click", () => {
  if (!paletteLast) { setError("paletteStatus", "Make a palette first."); return; }
  downloadBlob(new Blob([paletteToCssVars(paletteLast)], { type: "text/css" }), "ak-premium-palette.css");
  setStatus("paletteStatus", "Done. CSS variables downloaded.");
});

const paletteExportTailwindBtn = $("paletteExportTailwindBtn");
if (paletteExportTailwindBtn) paletteExportTailwindBtn.addEventListener("click", () => {
  if (!paletteLast) { setError("paletteStatus", "Make a palette first."); return; }
  downloadBlob(new Blob([paletteToTailwind(paletteLast)], { type: "text/javascript" }), "ak-premium-palette-tailwind.js");
  setStatus("paletteStatus", "Done. Tailwind config downloaded.");
});

const paletteExportPngBtn = $("paletteExportPngBtn");
if (paletteExportPngBtn) paletteExportPngBtn.addEventListener("click", async () => {
  if (!paletteLast) { setError("paletteStatus", "Make a palette first."); return; }
  const blob = await canvasToBlob(paletteSwatchSheet(paletteLast.items), "image/png");
  if (!blob) { setError("paletteStatus", "This browser could not encode PNG. Please try again."); return; }
  downloadBlob(blob, "ak-premium-palette.png");
  setStatus("paletteStatus", "Done. Palette image downloaded.");
});

const paletteOutput = $("paletteOutput");
if (paletteOutput) paletteOutput.addEventListener("click", (event) => {
  const sw = event.target.closest ? event.target.closest(".swatch") : null;
  if (sw && sw.dataset.hex) copyTextToClipboard(sw.dataset.hex, "paletteStatus", "Copied " + sw.dataset.hex + ".");
});
