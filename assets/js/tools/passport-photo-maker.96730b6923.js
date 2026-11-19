/* AK Premium v12 — passport-photo-maker (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

const passportInput = $("passportInput");
/* Passport sizes at 300 DPI, from the common official rules: Pakistan, UK,
   EU and UAE 35 x 45 mm; India and USA 2 x 2 in; Canada 50 x 70 mm. */
const PASSPORT_SIZES = {
  pk: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)" },
  in: { w: 600, h: 600, label: "2 × 2 in (600 × 600 px)" },
  us: { w: 600, h: 600, label: "2 × 2 in (600 × 600 px)" },
  uk: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)" },
  eu: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)" },
  ae: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)" },
  ca: { w: 591, h: 827, label: "50 × 70 mm (591 × 827 px)" }
};
let passportImg = null;
if (passportInput) passportInput.addEventListener("change", async () => {
  const file = (passportInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "passportStatus")) return;
  try {
    passportImg = await loadImageFromFile(file);
    setStatus("passportStatus", "Photo loaded: " + (passportImg.naturalWidth || passportImg.width) + " x " + (passportImg.naturalHeight || passportImg.height) + " px. Pick a country and press Make Passport Photo.");
  } catch (e) { setError("passportStatus", "Could not read this photo. Please try a JPG, PNG or WebP file."); }
});

const passportCountry = $("passportCountry");
if (passportCountry) passportCountry.addEventListener("change", () => {
  const s = PASSPORT_SIZES[passportCountry.value] || PASSPORT_SIZES.pk;
  setStatus("passportSizeNote", "Selected size: " + s.label + ".");
});

const passportBtn = $("passportBtn");
if (passportBtn) passportBtn.addEventListener("click", async () => {
  if (!passportImg) { setError("passportStatus", "Please select a photo first."); return; }
  const code = ($("passportCountry") || {}).value || "pk";
  const target = PASSPORT_SIZES[code] || PASSPORT_SIZES.pk;
  setStatus("passportStatus", "Making a " + target.label + " photo…");
  try {
    const iw = passportImg.naturalWidth || passportImg.width, ih = passportImg.naturalHeight || passportImg.height;
    const want = target.w / target.h, have = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (have > want) { sw = Math.round(ih * want); sx = Math.round((iw - sw) / 2); }
    else { sh = Math.round(iw / want); sy = Math.round((ih - sh) / 2); }
    const canvas = document.createElement("canvas"); canvas.width = target.w; canvas.height = target.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, target.w, target.h);
    ctx.drawImage(passportImg, sx, sy, sw, sh, 0, 0, target.w, target.h);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    if (!blob) { setError("passportStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-passport-photo-" + code + ".jpg");
    setStatus("passportStatus", "Done. Passport photo downloaded (" + target.w + " x " + target.h + " px).");
  } catch (e) { setError("passportStatus", "Could not make this passport photo. Please try again."); }
});
