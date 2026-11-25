/* AK Premium v12 — fancy-text-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Text & writing tools (batch 4) ---------- */

function buildFancyMap(capBase, smallBase, digitBase, capEx, smallEx) {
  const m = {};
  for (let i = 0; i < 26; i++) {
    m[String.fromCharCode(65 + i)] = String.fromCodePoint(capBase + i);
    m[String.fromCharCode(97 + i)] = String.fromCodePoint(smallBase + i);
  }
  if (digitBase) for (let i = 0; i < 10; i++) m[String(i)] = String.fromCodePoint(digitBase + i);
  if (capEx) for (const k in capEx) m[k] = capEx[k];
  if (smallEx) for (const k in smallEx) m[k] = smallEx[k];
  return m;
}
const FANCY_MAPS = {
  bold: buildFancyMap(0x1D400, 0x1D41A, 0x1D7CE),
  italic: buildFancyMap(0x1D434, 0x1D44E, null, null, { h: "ℎ" }),
  boldItalic: buildFancyMap(0x1D468, 0x1D482, null),
  monospace: buildFancyMap(0x1D670, 0x1D68A, 0x1D7F6),
  script: buildFancyMap(0x1D49C, 0x1D4B6, null, { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" }, { e: "ℯ", g: "ℊ" }),
  doubleStruck: buildFancyMap(0x1D538, 0x1D552, null, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" }),
  circled: buildFancyMap(0x24B6, 0x24D0, null),
  squared: buildFancyMap(0x1F130, 0x1F130, null),
  bubble: buildFancyMap(0x1F150, 0x1F150, null),
  smallCaps: Object.assign({}, SMALL_CAPS, Object.fromEntries(Object.keys(SMALL_CAPS).map((k) => [k.toUpperCase(), SMALL_CAPS[k]])))
};
// Circled digits: 1-9 are U+2460-U+2468, 0 is U+24EA.
for (let d = 1; d <= 9; d++) FANCY_MAPS.circled[String(d)] = String.fromCodePoint(0x245F + d);
FANCY_MAPS.circled["0"] = "⓪";
// Upside-down letters (lowercase table; capitals use the lowered letter).
const UPSIDE_DOWN = { a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z", 0: "0", 1: "Ɩ", 2: "ᒐ", 3: "Ɛ", 4: "ᔭ", 5: "⅃", 6: "9", 7: "ㄥ", 8: "8", 9: "6" };
// Seeded shuffle (mulberry32) so the same seed always gives the same order.

function fancyStyles(text) {
  const s = String(text || "");
  const out = {};
  for (const name in FANCY_MAPS) {
    const map = FANCY_MAPS[name];
    out[name] = [...s].map((ch) => map[ch] || ch).join("");
  }
  out.upsideDown = [...s].reverse().map((ch) => UPSIDE_DOWN[ch.toLowerCase()] || ch).join("");
  out.strikethrough = [...s].map((ch) => ch + "\u0336").join("");
  out.underline = [...s].map((ch) => ch + "\u0332").join("");
  return out;
}
// Labelled style rows for the page script (which cannot read the core
// const tables directly when scripts are eval'd separately).

function fancyRows(text) {
  const styles = fancyStyles(text);
  return [["Bold", styles.bold], ["Italic", styles.italic], ["Bold Italic", styles.boldItalic], ["Monospace", styles.monospace], ["Script", styles.script], ["Double-struck", styles.doubleStruck], ["Circled", styles.circled], ["Squared", styles.squared], ["Bubble", styles.bubble], ["Upside-down", styles.upsideDown], ["Strikethrough", styles.strikethrough], ["Underline", styles.underline], ["Small Caps", styles.smallCaps]];
}
// The voices on this device, for the page script (same eval reason as above).

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
