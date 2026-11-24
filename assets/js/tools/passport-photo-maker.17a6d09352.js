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
  ca: { w: 591, h: 827, label: "50 × 70 mm (591 × 827 px)" },
  /* NADRA CNIC / NICOP: 35 x 45 mm, head 31.5 to 36 mm high (70 to 80% of
     the photo height), plain white background, no glasses, taken within
     the last 6 months. Pak-ID online takes a file of 60 KB or less, so the
     photo is saved at a lower quality until it fits. Punjab driving
     licence (DLIMS): 35 x 45 mm, about 34 mm from the top of the photo to
     the top of the hair, file 100 to 300 KB. */
  nadra: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)", maxKB: 60, note: "NADRA CNIC / NICOP: white background, head 31.5 to 36 mm high, no glasses, taken within the last 6 months. The Pak-ID file must be 60 KB or smaller, so the quality is lowered until it fits." },
  dl: { w: 413, h: 531, label: "35 × 45 mm (413 × 531 px)", note: "Punjab driving licence (DLIMS): about 34 mm from the top of the photo to the top of the hair, file 100 to 300 KB." }
};
/* Centre-crop rectangle of an image into a target aspect ratio. Returns
   {sx, sy, sw, sh} in source pixels. */

function passportCropRect(iw, ih, tw, th) {
  const want = tw / th, have = iw / ih;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (have > want) { sw = Math.round(ih * want); sx = Math.round((iw - sw) / 2); }
  else { sh = Math.round(iw / want); sy = Math.round((ih - sh) / 2); }
  return { sx: sx, sy: sy, sw: sw, sh: sh };
}

/* Draw the framing guide on a passport photo: a head oval (top at 8% of
   the height, 72% tall, 55% wide) and a shoulder line at 88% of the
   height, so the head sits where the official rules want it. The guide
   is a preview aid only and is never saved into the photo. */

function drawPassportGuide(ctx, w, h) {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = "#0b6e4f"; ctx.lineWidth = Math.max(2, Math.round(w / 200)); ctx.setLineDash([Math.round(w / 40), Math.round(w / 60)]);
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.44, w * 0.275, h * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.88); ctx.lineTo(w * 0.9, h * 0.88); ctx.stroke();
  ctx.restore();
}

/* Build a print sheet of identical passport photos at exact size: 4 or 6
   on a 4 x 6 in sheet (1200 x 1800 px at 300 DPI), or 8 on a 6 x 8 in
   sheet (1800 x 2400 px). Eight photos do not fit on a 4 x 6 sheet at
   exact size, so that count is not offered on 4 x 6. Returns null when
   the photo is bigger than one sheet cell (for example 50 x 70 mm). */

function passportPrintSheet(canvas, count, sheet) {
  const sheets = { "4x6": { w: 1200, h: 1800, cols: 2, rows: count === 4 ? 2 : 3 }, "6x8": { w: 1800, h: 2400, cols: 2, rows: 4 } };
  const s = sheets[sheet]; if (!s) return null;
  const cellW = s.w / s.cols, cellH = s.h / s.rows;
  if (canvas.width > cellW || canvas.height > cellH) return null;
  const out = document.createElement("canvas"); out.width = s.w; out.height = s.h;
  const ctx = out.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, s.w, s.h);
  for (let i = 0; i < count; i++) {
    const x = Math.round((i % s.cols) * cellW + (cellW - canvas.width) / 2);
    const y = Math.round(Math.floor(i / s.cols) * cellH + (cellH - canvas.height) / 2);
    ctx.drawImage(canvas, x, y);
  }
  return out;
}

let passportImg = null;
let passportLastCanvas = null;
/* Redraw the preview (centre-cropped photo, with the guide on top when
   the box is ticked) whenever the photo, the country or the guide box
   changes. The preview is a framing aid; the downloaded photo never has
   the guide drawn on it. */

function drawPassportPreview() {
  const pv = $("passportPreview"); if (!pv || !passportImg) return;
  const code = ($("passportCountry") || {}).value || "pk";
  const target = PASSPORT_SIZES[code] || PASSPORT_SIZES.pk;
  const iw = passportImg.naturalWidth || passportImg.width, ih = passportImg.naturalHeight || passportImg.height;
  const r = passportCropRect(iw, ih, target.w, target.h);
  pv.width = target.w; pv.height = target.h;
  const ctx = pv.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, target.w, target.h);
  ctx.drawImage(passportImg, r.sx, r.sy, r.sw, r.sh, 0, 0, target.w, target.h);
  if ((($("passportGuide") || {}).checked !== false)) drawPassportGuide(ctx, target.w, target.h);
}
if (passportInput) passportInput.addEventListener("change", async () => {
  const file = (passportInput.files || [])[0]; if (!file) return;
  if (!checkFileSize(file, "passportStatus")) return;
  try {
    passportImg = await loadImageFromFile(file);
    drawPassportPreview();
    setStatus("passportStatus", "Photo loaded: " + (passportImg.naturalWidth || passportImg.width) + " x " + (passportImg.naturalHeight || passportImg.height) + " px. Pick a country and press Make Passport Photo.");
  } catch (e) { setError("passportStatus", "Could not read this photo. Please try a JPG, PNG or WebP file."); }
});

const passportCountry = $("passportCountry");
if (passportCountry) passportCountry.addEventListener("change", () => {
  const s = PASSPORT_SIZES[passportCountry.value] || PASSPORT_SIZES.pk;
  setStatus("passportSizeNote", "Selected size: " + s.label + "." + (s.note ? " " + s.note : ""));
  drawPassportPreview();
});

const passportGuide = $("passportGuide");
if (passportGuide) passportGuide.addEventListener("change", drawPassportPreview);

const passportBtn = $("passportBtn");
if (passportBtn) passportBtn.addEventListener("click", async () => {
  if (!passportImg) { setError("passportStatus", "Please select a photo first."); return; }
  const code = ($("passportCountry") || {}).value || "pk";
  const target = PASSPORT_SIZES[code] || PASSPORT_SIZES.pk;
  setStatus("passportStatus", "Making a " + target.label + " photo…");
  try {
    const iw = passportImg.naturalWidth || passportImg.width, ih = passportImg.naturalHeight || passportImg.height;
    const r = passportCropRect(iw, ih, target.w, target.h);
    const canvas = document.createElement("canvas"); canvas.width = target.w; canvas.height = target.h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, target.w, target.h);
    ctx.drawImage(passportImg, r.sx, r.sy, r.sw, r.sh, 0, 0, target.w, target.h);
    passportLastCanvas = canvas;
    /* NADRA Pak-ID takes a file of 60 KB or less: lower the quality step
       by step until it fits, and report the final size. */
    let q = 0.92, blob = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      blob = await canvasToBlob(canvas, "image/jpeg", q);
      if (!blob) break;
      if (!target.maxKB || blob.size <= target.maxKB * 1024) break;
      q = [0.85, 0.75, 0.65][attempt] || 0.65;
    }
    if (!blob) { setError("passportStatus", "This browser could not encode JPG. Please try again."); return; }
    downloadBlob(blob, "ak-premium-passport-photo-" + code + ".jpg");
    let msg = "Done. Passport photo downloaded (" + target.w + " x " + target.h + " px, " + humanBytes(blob.size) + ").";
    if (target.maxKB) msg += blob.size <= target.maxKB * 1024 ? " Fits the NADRA 60 KB limit." : " Still over the NADRA 60 KB limit at the lowest quality, so Pak-ID may refuse it.";
    setStatus("passportStatus", msg);
  } catch (e) { setError("passportStatus", "Could not make this passport photo. Please try again."); }
});

/* Print sheet: the last photo made, repeated at exact size on one sheet.
   4 or 6 photos go on a 4 x 6 in sheet; 8 go on a 6 x 8 in sheet, because
   8 do not fit on 4 x 6 at exact size. */

const passportSheetBtn = $("passportSheetBtn");
if (passportSheetBtn) passportSheetBtn.addEventListener("click", async () => {
  if (!passportLastCanvas) { setError("passportStatus", "Make a passport photo first, then print a sheet from it."); return; }
  const count = parseInt(($("passportSheetCount") || {}).value || "6", 10) || 6;
  const sheet = count === 8 ? "6x8" : "4x6";
  const out = passportPrintSheet(passportLastCanvas, count, sheet);
  if (!out) { setError("passportStatus", "A print sheet is only offered for 35 x 45 mm photos, because a bigger photo does not fit a 4 x 6 or 6 x 8 sheet at exact size."); return; }
  const blob = await canvasToBlob(out, "image/jpeg", 0.92);
  if (!blob) { setError("passportStatus", "This browser could not encode JPG. Please try again."); return; }
  downloadBlob(blob, "ak-premium-passport-sheet-" + count + "up.jpg");
  setStatus("passportStatus", "Done. Print sheet downloaded (" + count + " photos on a " + sheet + " in sheet, " + out.width + " x " + out.height + " px).");
});
