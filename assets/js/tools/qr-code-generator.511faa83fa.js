/* AK Premium v12 — qr-code-generator (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Phase 1 handlers: Everyday ---------- */

function qrPayloadForType(type, f) {
  const t = String(type || "url");
  if (t === "url") {
    let u = String(f.url || "").trim();
    if (!u) return { error: "Please enter a link." };
    if (!/^https?:\/\//i.test(u) && !/^mailto:|^tel:|^sms:/i.test(u)) u = "https://" + u;
    return { payload: u };
  }
  if (t === "wifi") {
    const ssid = String(f.ssid || "").trim();
    if (!ssid) return { error: "Please enter the Wi-Fi network name." };
    const esc = (s) => String(s).replace(/([\\;,":])/g, "\\$1");
    return { payload: "WIFI:T:" + (f.encryption || "WPA") + ";S:" + esc(ssid) + ";P:" + esc(f.password || "") + ";H:" + (f.hidden ? "true" : "false") + ";;" };
  }
  if (t === "vcard") {
    const name = String(f.name || "").trim();
    if (!name) return { error: "Please enter a name for the contact." };
    const lines = ["BEGIN:VCARD", "VERSION:3.0", "FN:" + name];
    if (f.phone) lines.push("TEL:" + f.phone);
    if (f.email) lines.push("EMAIL:" + f.email);
    if (f.org) lines.push("ORG:" + f.org);
    lines.push("END:VCARD");
    return { payload: lines.join("\n") };
  }
  if (t === "email") {
    const addr = String(f.email || "").trim();
    if (!addr || addr.indexOf("@") === -1) return { error: "Please enter a valid email address." };
    let u = "mailto:" + addr;
    const q = [];
    if (f.subject) q.push("subject=" + encodeURIComponent(f.subject));
    if (f.body) q.push("body=" + encodeURIComponent(f.body));
    if (q.length) u += "?" + q.join("&");
    return { payload: u };
  }
  if (t === "sms") {
    const num = String(f.number || "").trim();
    if (!num) return { error: "Please enter a phone number." };
    return { payload: "SMSTO:" + num + ":" + (f.message || "") };
  }
  if (t === "phone") {
    const num = String(f.number || "").trim();
    if (!num) return { error: "Please enter a phone number." };
    return { payload: "tel:" + num.replace(/[\s-]/g, "") };
  }
  if (t === "location") {
    const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: "Please enter a latitude from -90 to 90 and a longitude from -180 to 180." };
    return { payload: "geo:" + lat + "," + lng };
  }
  if (t === "payment") {
    const detail = String(f.detail || "").trim();
    if (!detail) return { error: "Please enter the payment link or account detail." };
    return { payload: detail };
  }
  const text = String(f.text || "").trim();
  if (!text) return { error: "Please enter some text." };
  return { payload: text };
}
/* Draw a QR code (qrcode-generator) onto a canvas with a 4-module quiet
   zone, in the chosen colours, with an optional logo in the middle on a
   white backing. */

function drawQrCanvas(qr, size, dark, light, logoImg) {
  const n = qr.getModuleCount();
  const margin = 4;
  const cell = Math.max(1, Math.floor(size / (n + margin * 2)));
  const px = (n + margin * 2) * cell;
  const canvas = document.createElement("canvas"); canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = light; ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
    }
  }
  if (logoImg) {
    const lw = Math.round(px * 0.22), lh = Math.round(px * 0.22);
    const x = Math.round((px - lw) / 2), y = Math.round((px - lh) / 2);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 4, y - 4, lw + 8, lh + 8);
    ctx.drawImage(logoImg, x, y, lw, lh);
  }
  return canvas;
}
/* The same QR code as an SVG string, for crisp printing at any size. */

function qrSvgString(qr, cellSize, dark, light) {
  const n = qr.getModuleCount();
  const margin = 4;
  const size = (n + margin * 2) * cellSize;
  let s = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + size + "\" height=\"" + size + "\" viewBox=\"0 0 " + size + " " + size + "\">";
  s += "<rect width=\"" + size + "\" height=\"" + size + "\" fill=\"" + light + "\"/>";
  s += "<path fill=\"" + dark + "\" d=\"";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) s += "M" + ((c + margin) * cellSize) + " " + ((r + margin) * cellSize) + "h" + cellSize + "v" + cellSize + "h-" + cellSize + "Z";
    }
  }
  s += "\"/></svg>";
  return s;
}
/* Read a generated QR code back with jsQR (Apache-2.0). Returns {data}
   or {error}. */

function qrScanTest(canvas) {
  if (!window.jsQR) return { error: "The scan-test library (jsQR) did not load. Check your connection and try again." };
  const ctx = canvas.getContext("2d");
  if (!ctx) return { error: "This browser could not read the QR code." };
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = window.jsQR(img.data, canvas.width, canvas.height);
  if (!found) return { error: "The code could not be read back. Try a bigger size or a higher error-correction level." };
  return { data: found.data };
}
/* Render the extra fields for the chosen QR type into qrFields. The URL
   type needs no extra fields; the link box stays as it is. */

function renderQrFields() {
  const wrap = $("qrFields"); if (!wrap) return;
  const type = ($("qrType") || {}).value || "url";
  const row = $("qrTextRow"); if (row) row.style.display = type === "url" ? "" : "none";
  const field = (id, label, ph, inputType) => "<label class=\"field-label\" for=\"" + id + "\">" + label + "</label><input id=\"" + id + "\" type=\"" + (inputType || "text") + "\" class=\"text-input\" placeholder=\"" + ph + "\" autocomplete=\"off\">";
  if (type === "wifi") wrap.innerHTML = field("qrFieldSsid", "Wi-Fi network name", "MyHomeWiFi") + "<label class=\"field-label\" for=\"qrFieldEncryption\">Security</label><select id=\"qrFieldEncryption\" class=\"select-input\"><option value=\"WPA\">WPA / WPA2</option><option value=\"WEP\">WEP</option><option value=\"nopass\">Open network</option></select>" + field("qrFieldPassword", "Wi-Fi password", "Leave empty for an open network", "password") + "<label class=\"checkbox-label\"><input type=\"checkbox\" id=\"qrFieldHidden\"> Hidden network</label>";
  else if (type === "vcard") wrap.innerHTML = field("qrFieldName", "Full name", "Mirza Noman Ali") + field("qrFieldPhone", "Phone", "0300-1234567", "tel") + field("qrFieldEmail", "Email", "name@example.com", "email") + field("qrFieldOrg", "Company (optional)", "Cougar Knitwear");
  else if (type === "email") wrap.innerHTML = field("qrFieldEmail", "Email address", "name@example.com", "email") + field("qrFieldSubject", "Subject (optional)", "Hello") + field("qrFieldBody", "Message (optional)", "Write your message here");
  else if (type === "sms") wrap.innerHTML = field("qrFieldNumber", "Phone number", "0300-1234567", "tel") + field("qrFieldMessage", "Message", "Hello");
  else if (type === "phone") wrap.innerHTML = field("qrFieldNumber", "Phone number", "0300-1234567", "tel");
  else if (type === "location") wrap.innerHTML = field("qrFieldLat", "Latitude", "31.5204", "number") + field("qrFieldLng", "Longitude", "74.3587", "number");
  else if (type === "payment") wrap.innerHTML = field("qrFieldDetail", "Payment link or account detail", "Paste the payment link or account number") + "<p class=\"field-hint\">Payment QR formats differ by app, so paste the link or detail exactly as the app gives it.</p>";
  else wrap.innerHTML = "";
}
let qrLast = null;
let qrLogoImg = null;

function qrGenerate() {
  const type = ($("qrType") || {}).value || "url";
  const val = (id) => { const el = $(id); return el ? el.value : ""; };
  const chk = (id) => { const el = $(id); return !!(el && el.checked); };
  const f = { url: val("qrText"), text: val("qrText"), ssid: val("qrFieldSsid"), encryption: val("qrFieldEncryption"), password: val("qrFieldPassword"), hidden: chk("qrFieldHidden"), name: val("qrFieldName"), phone: val("qrFieldPhone"), email: val("qrFieldEmail"), org: val("qrFieldOrg"), subject: val("qrFieldSubject"), body: val("qrFieldBody"), number: val("qrFieldNumber"), message: val("qrFieldMessage"), lat: val("qrFieldLat"), lng: val("qrFieldLng"), detail: val("qrFieldDetail") };
  const built = qrPayloadForType(type, f);
  if (built.error) { setError("qrStatus", built.error); return; }
  const size = parseInt(val("qrSize") || "320", 10) || 320;
  const ec = val("qrEc") || "M";
  const dark = val("qrDark") || "#000000";
  const light = val("qrLight") || "#ffffff";
  if (!window.qrcode) { loadLibrary("qrcode", "qrStatus").then((ok) => { if (ok) qrGenerate(); }); return; }
  try {
    const qr = window.qrcode(0, ec);
    qr.addData(built.payload);
    qr.make();
    const canvas = drawQrCanvas(qr, size, dark, light, qrLogoImg);
    const container = $("qrContainer");
    if (container) { container.innerHTML = ""; container.appendChild(canvas); }
    qrLast = { qr: qr, canvas: canvas, payload: built.payload, size: size, dark: dark, light: light };
    setStatus("qrStatus", "Done. QR code generated (" + qr.getModuleCount() + " x " + qr.getModuleCount() + " modules, error correction " + ec + ")." + (qrLogoImg ? " A logo in the middle can make the code harder to scan, so test it with Scan test." : ""));
  } catch (e) { setError("qrStatus", "Could not generate this QR code. Please try shorter text."); }
}

const qrType = $("qrType");
if (qrType) qrType.addEventListener("change", renderQrFields);
renderQrFields();

const qrBtn = $("qrBtn");
if (qrBtn) qrBtn.addEventListener("click", qrGenerate);

const qrLogoInput = $("qrLogoInput");
if (qrLogoInput) qrLogoInput.addEventListener("change", async () => {
  const file = (qrLogoInput.files || [])[0]; if (!file) { qrLogoImg = null; return; }
  if (!checkFileSize(file, "qrStatus")) return;
  try {
    qrLogoImg = await loadImageFromFile(file);
    if (qrLast) qrGenerate();
    else setStatus("qrStatus", "Logo loaded. Generate the code to place it in the middle.");
  } catch (e) { setError("qrStatus", "Could not read this logo image."); }
});

const qrDownloadBtn = $("qrDownloadBtn");
if (qrDownloadBtn) qrDownloadBtn.addEventListener("click", async () => {
  if (!qrLast) { setStatus("qrStatus", "Generate a QR code first, then download it."); return; }
  const blob = await canvasToBlob(qrLast.canvas, "image/png");
  if (!blob) { setError("qrStatus", "Could not download this QR code."); return; }
  downloadBlob(blob, "ak-premium-qr.png"); setStatus("qrStatus", "Done. QR PNG downloaded.");
});

const qrDownloadSvgBtn = $("qrDownloadSvgBtn");
if (qrDownloadSvgBtn) qrDownloadSvgBtn.addEventListener("click", () => {
  if (!qrLast) { setStatus("qrStatus", "Generate a QR code first, then download it."); return; }
  downloadBlob(new Blob([qrSvgString(qrLast.qr, 10, qrLast.dark, qrLast.light)], { type: "image/svg+xml" }), "ak-premium-qr.svg");
  setStatus("qrStatus", "Done. QR SVG downloaded.");
});

const qrScanBtn = $("qrScanBtn");
if (qrScanBtn) qrScanBtn.addEventListener("click", async () => {
  if (!qrLast) { setError("qrStatus", "Generate a QR code first."); return; }
  setStatus("qrStatus", "Reading the code back…");
  if (!window.jsQR) { const ok = await loadLibrary("jsqr", "qrStatus"); if (!ok) return; }
  const found = qrScanTest(qrLast.canvas);
  if (found.error) { setError("qrStatus", found.error); return; }
  setStatus("qrStatus", found.data === qrLast.payload ? "Scan test passed. The code reads back exactly what you typed." : "Scan test read something different: " + found.data);
});

/* Passphrase words: a 1,296-word systematic sample (every sixth word) of
   the EFF large wordlist (7,776 words), which the EFF publishes under a
   Creative Commons Attribution licence. Hyphenated words were left out so
   a hyphen separator never looks like part of a word. 1,296 words is
   about 10.3 bits of entropy per word, so 6 words is about 62 bits. */
