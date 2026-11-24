/* AK Premium v12 — image-converter (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: Image tools (batch 2) ---------- */

function encodeBmpFromCanvas(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, w, h);
  const rowBytes = w * 3, pad = (4 - (rowBytes % 4)) % 4, stride = rowBytes + pad;
  const dataSize = stride * h, fileSize = 54 + dataSize;
  const buf = new Uint8Array(fileSize), dv = new DataView(buf.buffer);
  buf[0] = 0x42; buf[1] = 0x4D; /* "BM" */
  dv.setUint32(2, fileSize, true); dv.setUint32(10, 54, true);
  dv.setUint32(14, 40, true); dv.setInt32(18, w, true); dv.setInt32(22, h, true);
  dv.setUint16(26, 1, true); dv.setUint16(28, 24, true);
  dv.setUint32(34, dataSize, true); dv.setUint32(38, 2835, true); dv.setUint32(42, 2835, true);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y, off = 54 + y * stride;
    for (let x = 0; x < w; x++) {
      const i = (srcY * w + x) * 4, o = off + x * 3;
      buf[o] = d[i + 2]; buf[o + 1] = d[i + 1]; buf[o + 2] = d[i];
    }
  }
  return new Blob([buf], { type: "image/bmp" });
}

/* Encode a canvas as a static GIF89a blob. Browsers cannot save GIF from a
   canvas, so the palette (median cut, 256 colours) and the LZW stream are
   written by hand. Pure: takes a canvas, touches no element ids. Routed to
   the image-converter bundle (split-app.py TOOL_NAMES), not core. */

function encodeGifFromCanvas(canvas) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext("2d");
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data, n = w * h;
  /* Median cut: split the colour boxes by their widest channel until 256. */
  function medianCutPalette() {
    const step = Math.max(1, Math.floor(n / 50000));
    const cols = [];
    for (let i = 0; i < n; i += step) cols.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
    let boxes = [cols];
    while (boxes.length < 256) {
      let bi = -1, spread = -1, ch = 0;
      for (let b = 0; b < boxes.length; b++) {
        const box = boxes[b];
        if (box.length < 2) continue;
        for (let c = 0; c < 3; c++) {
          let mn = 255, mx = 0;
          for (let i = 0; i < box.length; i++) { if (box[i][c] < mn) mn = box[i][c]; if (box[i][c] > mx) mx = box[i][c]; }
          if (mx - mn > spread) { spread = mx - mn; bi = b; ch = c; }
        }
      }
      if (bi < 0) break;
      const box = boxes[bi].slice().sort((a, b) => a[ch] - b[ch]);
      const mid = Math.floor(box.length / 2);
      boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.map((box) => {
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < box.length; i++) { r += box[i][0]; g += box[i][1]; b += box[i][2]; }
      const m = Math.max(1, box.length);
      return [Math.round(r / m), Math.round(g / m), Math.round(b / m)];
    });
  }
  const palette = medianCutPalette();
  /* Map each pixel to its nearest palette colour. */
  const idx = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    let best = 0, bestD = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const dr = r - palette[p][0], dg = g - palette[p][1], db = b - palette[p][2];
      const dd = dr * dr + dg * dg + db * db;
      if (dd < bestD) { bestD = dd; best = p; if (dd === 0) break; }
    }
    idx[i] = best;
  }
  /* GIF LZW: clear code 256, end code 257, code size grows 9 to 12 bits,
     dictionary resets on a clear code. Bits are packed least-significant
     bit first. */
  function lzwEncode(indices) {
    const minCodeSize = 8, clearCode = 256, eoiCode = 257;
    let codeSize = 9, nextCode = 258;
    let dict = new Map();
    const out = [];
    let bitBuf = 0, bitCnt = 0;
    function emit(code) {
      bitBuf |= code << bitCnt; bitCnt += codeSize;
      while (bitCnt >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitCnt -= 8; }
    }
    function resetDict() { dict = new Map(); nextCode = 258; codeSize = 9; }
    emit(clearCode);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i], key = prefix * 256 + k;
      if (dict.has(key)) { prefix = dict.get(key); continue; }
      emit(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;
      } else { emit(clearCode); resetDict(); }
      prefix = k;
    }
    emit(prefix); emit(eoiCode);
    if (bitCnt > 0) out.push(bitBuf & 0xFF);
    return new Uint8Array(out);
  }
  const compressed = lzwEncode(idx);
  const gctSize = 256 * 3, total = 13 + gctSize + 10 + 1 + compressed.length + 256 + 1;
  const buf = new Uint8Array(total);
  let o = 0;
  function wstr(s) { for (let i = 0; i < s.length; i++) buf[o++] = s.charCodeAt(i); }
  function u16(v) { buf[o++] = v & 0xFF; buf[o++] = (v >> 8) & 0xFF; }
  wstr("GIF89a"); u16(w); u16(h);
  buf[o++] = 0xF7; /* global colour table, 256 entries */ buf[o++] = 0; buf[o++] = 0;
  for (let p = 0; p < 256; p++) {
    const c = palette[p] || [0, 0, 0];
    buf[o++] = c[0]; buf[o++] = c[1]; buf[o++] = c[2];
  }
  buf[o++] = 0x2C; u16(0); u16(0); u16(w); u16(h); buf[o++] = 0;
  buf[o++] = 8; /* LZW minimum code size */
  let off = 0;
  while (off < compressed.length) {
    const chunk = Math.min(255, compressed.length - off);
    buf[o++] = chunk;
    buf.set(compressed.subarray(off, off + chunk), o); o += chunk; off += chunk;
  }
  buf[o++] = 0; buf[o++] = 0x3B;
  return new Blob([buf.slice(0, o)], { type: "image/gif" });
}

/* Pack PNG blobs into an .ico file (one entry per size, PNG data inside,
   which Windows, macOS and browsers all accept). Pure: touches no element
   ids. Routed to the image-converter bundle (split-app.py TOOL_NAMES). */

function packIcoFromPngs(parts) {
  const n = parts.length;
  const header = 6 + n * 16;
  let total = header;
  for (let i = 0; i < n; i++) total += parts[i].bytes.length;
  const buf = new Uint8Array(total), dv = new DataView(buf.buffer);
  dv.setUint16(0, 0, true); dv.setUint16(2, 1, true); dv.setUint16(4, n, true);
  let off = header;
  for (let i = 0; i < n; i++) {
    const p = parts[i], e = 6 + i * 16;
    buf[e] = p.size >= 256 ? 0 : p.size; buf[e + 1] = p.size >= 256 ? 0 : p.size;
    buf[e + 2] = 0; buf[e + 3] = 0;
    dv.setUint16(e + 4, 1, true); dv.setUint16(e + 6, 32, true);
    dv.setUint32(e + 8, p.bytes.length, true); dv.setUint32(e + 12, off, true);
    buf.set(p.bytes, off); off += p.bytes.length;
  }
  return new Blob([buf], { type: "image/x-icon" });
}

/* Find the EXIF APP1 segment (including its FFE1 marker + length) in JPEG
   bytes, or null when the file has none. Pure byte walk, no element ids. */

function extractJpegApp1Exif(bytes) {
  try {
    const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (d.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off + 4 <= d.byteLength) {
      if (d.getUint8(off) !== 0xFF) return null;
      const marker = d.getUint8(off + 1), len = d.getUint16(off + 2);
      if (marker === 0xDA || marker === 0xD9) return null;
      if (marker === 0xE1 && len > 8 && d.getUint32(off + 4) === 0x45786966) {
        return bytes.slice(off, off + 2 + len);
      }
      off += 2 + len;
    }
  } catch (e) { /* fall through */ }
  return null;
}

/* Insert an EXIF APP1 segment right after the SOI marker of a JPEG.
   When resetOrientation is true, the Orientation tag inside the EXIF is
   set to 1 first, so a photo that was already rotated does not carry a
   stale "rotate me" tag. Returns the new bytes, or null when the input
   is not a JPEG or has no EXIF segment to copy. Pure. */

function spliceJpegExif(jpegBytes, app1Bytes, resetOrientation) {
  if (!jpegBytes || jpegBytes.length < 2 || jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) return null;
  if (!app1Bytes || app1Bytes.length < 10) return null;
  let seg = app1Bytes;
  if (resetOrientation) {
    seg = app1Bytes.slice();
    try {
      const d = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
      const tiff = 4 + 6; /* FFE1 + length + "Exif\0\0" */
      const le = d.getUint16(tiff) === 0x4949;
      const ifd = tiff + d.getUint32(tiff + 4, le);
      const n = d.getUint16(ifd, le);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (d.getUint16(e, le) === 0x0112) { d.setUint16(e + 8, 1, le); break; }
      }
    } catch (e) { /* keep the segment unchanged */ }
  }
  const out = new Uint8Array(2 + seg.length + (jpegBytes.length - 2));
  out.set(jpegBytes.subarray(0, 2), 0);
  out.set(seg, 2);
  out.set(jpegBytes.subarray(2), 2 + seg.length);
  return out;
}

/* Read the EXIF orientation (1-8) of a file: exifr first when it loaded
   (it reads JPEG, TIFF, PNG and WebP), otherwise the built-in JPEG parser.
   Returns 1 when there is no orientation tag or the file cannot be read. */

function tiffImageToCanvas(buf) {
  if (!window.UTIF || !window.UTIF.decode) throw new Error("TIFF library (UTIF.js) did not load. Check your connection and try again.");
  const ifds = window.UTIF.decode(buf);
  if (!ifds || !ifds.length) throw new Error("This TIFF file could not be read. It may be damaged or use an unsupported layout.");
  const ifd = ifds[0];
  const cmpr = ifd["t259"] ? ifd["t259"][0] : 1;
  if (cmpr === 8 && !(window.pako && window.pako.inflate)) throw new Error("This TIFF uses deflate compression and the helper library did not load. Check your connection and try again.");
  if (cmpr === 6 || cmpr === 7) throw new Error("This TIFF holds a JPEG-compressed image, which cannot be decoded here. Convert it to an uncompressed TIFF first.");
  try {
    window.UTIF.decodeImage(buf, ifd);
  } catch (e) {
    /* UTIF.js captures pako at its own load time, so a pako that arrived
       after UTIF still leaves its internal inflate undefined. Turn that
       into a plain message instead of a raw TypeError. */
    if (e && /inflate/.test(e.message || "")) throw new Error("This TIFF uses deflate compression and the helper library did not load in time. Check your connection and try again.");
    throw e;
  }
  const w = ifd.width, h = ifd.height;
  if (!w || !h || !ifd.data) throw new Error("This TIFF file could not be decoded.");
  const samples = ifd["t277"] ? ifd["t277"][0] : 3;
  const bits = ifd["t258"] ? ifd["t258"][0] : 8;
  const photo = ifd["t262"] ? ifd["t262"][0] : 2;
  const raw = ifd.data, rgba = new Uint8ClampedArray(w * h * 4);
  const cmap = ifd["t320"] || null;
  for (let i = 0; i < w * h; i++) {
    let r = 0, g = 0, b = 0, a = 255;
    if (bits === 16) {
      const o = i * samples * 2;
      const v = (v0) => Math.min(255, Math.round(v0 / 257));
      if (samples >= 3) { r = v(raw[o] * 256 + raw[o + 1]); g = v(raw[o + 2] * 256 + raw[o + 3]); b = v(raw[o + 4] * 256 + raw[o + 5]); }
      else { const gv = v(raw[o] * 256 + raw[o + 1]); r = g = b = photo === 0 ? 255 - gv : gv; }
      if (samples >= 4) a = v(raw[o + 6] * 256 + raw[o + 7]);
    } else if (photo === 3 && cmap) {
      const ci = raw[i] * 3;
      r = cmap[ci] >> 8; g = cmap[ci + 1] >> 8; b = cmap[ci + 2] >> 8;
    } else if (samples === 1) {
      const gv = raw[i]; r = g = b = photo === 0 ? 255 - gv : gv;
    } else if (samples === 4) {
      const o = i * 4; r = raw[o]; g = raw[o + 1]; b = raw[o + 2]; a = raw[o + 3];
    } else {
      const o = i * 3; r = raw[o]; g = raw[o + 1]; b = raw[o + 2];
    }
    const o4 = i * 4; rgba[o4] = r; rgba[o4 + 1] = g; rgba[o4 + 2] = b; rgba[o4 + 3] = a;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").putImageData(new ImageData(rgba, w, h), 0, 0);
  return { canvas: canvas, orientation: (ifd["t274"] && ifd["t274"][0]) || 1 };
}

/* Decode any image file the converter accepts into a canvas, with EXIF
   orientation applied when autoRotate is true. TIFF goes through UTIF.js;
   everything else through the browser image loader. Returns
   {canvas, orientation, isTiff}. Routed to image-converter (TOOL_NAMES). */

async function imageFileToCanvas(file, opts) {
  const o = Object.assign({ autoRotate: true, statusId: null }, opts || {});
  const name = (file.name || "").toLowerCase();
  const buf = await file.arrayBuffer();
  const isTiff = name.endsWith(".tif") || name.endsWith(".tiff") || (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2A && buf[3] === 0x00) || (buf[0] === 0x4D && buf[1] === 0x4D && buf[2] === 0x00 && buf[3] === 0x2A);
  if (isTiff) {
    if (!needLibrary(!!window.UTIF, "UTIF.js", o.statusId)) throw new Error("UTIF.js did not load.");
    const ifds = window.UTIF.decode(buf);
    /* UTIF.js captures pako at its own load time, so pako must already be
       there when UTIF loads: the image-converter registry lists pako
       FIRST. This lazy load is only a retry when that script failed. */
    if (ifds && ifds.length && ifds[0]["t259"] && ifds[0]["t259"][0] === 8 && !window.pako) {
      const ok = await loadLibrary("pako", o.statusId);
      if (!ok) throw new Error("This TIFF uses deflate compression and the helper library did not load.");
    }
    const t = tiffImageToCanvas(buf);
    if (o.autoRotate && t.orientation > 1) {
      return { canvas: orientedImageCanvas(t.canvas, t.orientation), orientation: t.orientation, isTiff: true };
    }
    return { canvas: t.canvas, orientation: t.orientation, isTiff: true };
  }
  const img = await loadImageFromFile(file);
  const orientation = o.autoRotate ? await exifOrientationOfFile(file) : 1;
  if (orientation > 1) {
    return { canvas: orientedImageCanvas(img, orientation), orientation: orientation, isTiff: false };
  }
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return { canvas: canvas, orientation: orientation, isTiff: false };
}

/* PNG to JPG: quality slider + a background colour for the see-through
   parts (JPG has no transparency). EXIF orientation is applied on load. */

/* ---------- Phase 1 handlers: Image ---------- */

const imgConvertBtn = $("imgConvertBtn");
if (imgConvertBtn) imgConvertBtn.addEventListener("click", async () => {
  const files = Array.from(($("imgConvertInput").files || []));
  if (!files.length) { setError("imgConvertStatus", "Please select an image first."); return; }
  const format = $("imgConvertFormat").value;
  const quality = $("imgConvertQuality") ? parseFloat($("imgConvertQuality").value) || 0.92 : 0.92;
  const batch = $("imgConvertBatch") && $("imgConvertBatch").checked;
  const autoRotate = !$("imgConvertAutoRotate") || $("imgConvertAutoRotate").checked;
  const keepExif = $("imgConvertKeepExif") && $("imgConvertKeepExif").checked;
  const mime = format === "jpg" ? "image/jpeg" : (format === "png" ? "image/png" : (format === "webp" ? "image/webp" : "image/avif"));
  if (format === "avif" && !canvasSupportsAvif()) { setError("imgConvertStatus", "This browser cannot save AVIF images. Please choose PNG, JPG or WebP."); return; }
  const list = batch ? files : files.slice(0, 1);
  const ext = format === "jpg" ? "jpg" : format;
  const out = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (!checkFileSize(file, "imgConvertStatus")) return;
      if (list.length > 1) setStatus("imgConvertStatus", "Converting " + (i + 1) + " of " + list.length + "...");
      const decoded = await imageFileToCanvas(file, { autoRotate: autoRotate, statusId: "imgConvertStatus" });
      const canvas = decoded.canvas;
      const base = (file.name || "image").replace(/\.[^.]+$/, "") || "image";
      let blob;
      if (format === "bmp") {
        blob = encodeBmpFromCanvas(canvas);
      } else if (format === "gif") {
        blob = encodeGifFromCanvas(canvas);
      } else if (format === "ico") {
        const parts = [];
        for (const size of [16, 32, 48]) {
          const c = document.createElement("canvas"); c.width = size; c.height = size;
          const s = Math.min(size / canvas.width, size / canvas.height);
          const dw = Math.max(1, Math.round(canvas.width * s)), dh = Math.max(1, Math.round(canvas.height * s));
          c.getContext("2d").drawImage(canvas, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh);
          const pb = await canvasToBlob(c, "image/png");
          if (pb) parts.push({ size: size, bytes: new Uint8Array(await pb.arrayBuffer()) });
        }
        if (!parts.length) { setError("imgConvertStatus", "This browser could not build the icon. Please choose PNG or JPG."); return; }
        blob = packIcoFromPngs(parts);
      } else {
        const c = canvas;
        const out2 = document.createElement("canvas"); out2.width = c.width; out2.height = c.height;
        const ctx2 = out2.getContext("2d");
        if (mime === "image/jpeg") { ctx2.fillStyle = "#ffffff"; ctx2.fillRect(0, 0, out2.width, out2.height); }
        ctx2.drawImage(c, 0, 0);
        blob = await canvasToBlob(out2, mime, quality);
        if (!blob) { setError("imgConvertStatus", "This browser cannot encode " + format.toUpperCase() + ". Please choose PNG or JPG."); return; }
        if (format === "jpg" && keepExif) {
          const inBytes = new Uint8Array(await file.arrayBuffer());
          const app1 = extractJpegApp1Exif(inBytes);
          if (app1) {
            const spliced = spliceJpegExif(new Uint8Array(await blob.arrayBuffer()), app1, autoRotate && decoded.orientation > 1);
            if (spliced) blob = new Blob([spliced], { type: "image/jpeg" });
          }
        }
      }
      out.push({ name: base + "." + ext, blob: blob });
    }
    if (out.length === 1) {
      downloadBlob(out[0].blob, out[0].name);
      setStatus("imgConvertStatus", "Done. Converted image downloaded (" + out[0].name + ")." + (format === "gif" ? " GIF output is a still image, not an animation." : ""));
    } else {
      if (!window.JSZip) { setError("imgConvertStatus", "The ZIP library did not load. Convert one image at a time, or check your connection and try again."); return; }
      const zip = new window.JSZip();
      out.forEach((o) => zip.file(o.name, o.blob));
      downloadBlob(await zip.generateAsync({ type: "blob" }), "ak-premium-converted.zip");
      setStatus("imgConvertStatus", "Done. " + out.length + " image(s) converted and downloaded as a ZIP." + (format === "gif" ? " GIF output is a still image, not an animation." : ""));
    }
  } catch (e) { setError("imgConvertStatus", e && e.message ? e.message : "Could not convert this image."); }
});

/* Dark-pixel mask of image data for OCR preprocessing. A pixel counts as
   dark when its luminance is below the threshold. Pure, no ids; routed to
   the image-to-text bundle (split-app.py TOOL_NAMES). */
