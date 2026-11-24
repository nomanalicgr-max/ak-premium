/* AK Premium v12 — extract-images-from-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

async function extractPdfRawImages(file) {
  if (!window.PDFLib) return null;
  const P = window.PDFLib.PDFName;
  let doc;
  try {
    const bytes = await readAsArrayBuffer(file);
    doc = await window.PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (e) { return null; }
  const out = [];
  for (let p = 0; p < doc.getPageCount(); p++) {
    const page = doc.getPage(p);
    let res;
    try { res = page.node.Resources(); } catch (e) { continue; }
    if (!res) continue;
    const xo = res.lookup(P.of("XObject"));
    if (!xo || typeof xo.entries !== "function") continue;
    let n = 0;
    for (const [key] of xo.entries()) {
      let img;
      try { img = xo.lookup(key); } catch (e) { continue; }
      if (!img || !img.dict) continue;
      const dict = img.dict;
      const subtype = dict.get(P.of("Subtype"));
      if (!subtype || subtype.toString() !== "/Image") continue;
      const filter = dict.get(P.of("Filter"));
      const filters = filter ? (typeof filter.asArray === "function" ? filter.asArray().map((f) => f.toString()) : [filter.toString()]) : [];
      const w = dict.get(P.of("Width")), h = dict.get(P.of("Height"));
      const width = w ? w.asNumber() : 0, height = h ? h.asNumber() : 0;
      const raw = (typeof img.getContents === "function") ? img.getContents() : null;
      if (!raw) continue;
      n++;
      const base = "ak-premium-image-" + (p + 1) + "-" + n;
      const hasMask = !!dict.get(P.of("SMask"));
      if (filters.includes("/DCTDecode")) {
        out.push({ page: p + 1, name: base + ".jpg", blob: new Blob([raw], { type: "image/jpeg" }), format: "JPEG (original bytes)", width, height, note: hasMask ? "transparency mask not kept" : "" });
      } else if (filters.includes("/JPXDecode")) {
        out.push({ page: p + 1, name: base + ".jp2", blob: new Blob([raw], { type: "image/jp2" }), format: "JPEG 2000 (original bytes)", width, height, note: "" });
      } else if (filters.includes("/JBIG2Decode")) {
        out.push({ page: p + 1, name: base + ".jb2", blob: new Blob([raw], { type: "application/octet-stream" }), format: "JBIG2 (original bytes)", width, height, note: "raw JBIG2 data — it needs its globals segment to open in a viewer" });
      }
    }
  }
  return out;
}

const extractImagesBtn = $("extractImagesBtn");
if (extractImagesBtn) extractImagesBtn.addEventListener("click", async () => {
  const file = ($("extractImagesInput").files || [])[0];
  if (!file) { setError("extractImagesStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "extractImagesStatus")) return;
  if (!(await ensurePdfJs("extractImagesStatus"))) return;
  setStatus("extractImagesStatus", "Reading images…");
  try {
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const out = $("extractImagesResults"); out.innerHTML = "";
    const blobs = [];
    let skipped = 0;
    // First pass: original-format bytes (JPEG, JPEG 2000, JBIG2).
    const raw = await extractPdfRawImages(file);
    const rawKeys = new Set();
    if (raw) for (const r of raw) { blobs.push(r); rawKeys.add(r.page + ":" + r.width + "x" + r.height); }
    // Second pass: pdf.js decodes everything else to PNG. A picture
    // already saved in its original format is not listed a second time
    // as a PNG (matched by page and size).
    const OPS = window.pdfjsLib.OPS;
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const opList = await page.getOperatorList();
      const seen = new Set();
      let n = 0;
      for (let i = 0; i < opList.fnArray.length; i++) {
        if (opList.fnArray[i] !== OPS.paintImageXObject) continue;
        const name = opList.argsArray[i][0];
        if (!name || seen.has(name)) continue;
        seen.add(name);
        n++;
        const img = await getPdfImageObj(page, name);
        if (!img) { skipped++; continue; }
        if (rawKeys.has(p + ":" + img.width + "x" + img.height)) continue;
        const blob = await pdfImageToBlob(img);
        if (!blob) { skipped++; continue; }
        blobs.push({ page: p, name: "ak-premium-image-" + p + "-" + n + ".png", blob, format: "PNG (decoded)", width: img.width, height: img.height, note: "" });
      }
    }
    if (!blobs.length) {
      setStatus("extractImagesStatus", skipped ? "Found " + skipped + " embedded image(s), but none could be read. Try PDF to Images for a picture of the page." : "No embedded images were found in this PDF. It may be text only, or made of vector shapes. Vector drawings are not extracted; use PDF to Images for a picture of the page.");
      return;
    }
    blobs.forEach((b) => {
      const row = document.createElement("div");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b.blob); a.download = b.name; a.textContent = "Download " + b.name;
      row.appendChild(a);
      const meta = document.createElement("span");
      meta.textContent = " — page " + b.page + ", " + b.format + (b.width ? ", " + b.width + "×" + b.height + " px" : "") + (b.note ? " (" + b.note + ")" : "");
      row.appendChild(meta);
      out.appendChild(row);
    });
    let zipMsg = "";
    if (window.JSZip) {
      const zip = new window.JSZip();
      blobs.forEach((b) => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "ak-premium-images.zip");
      zipMsg = " ZIP download also started.";
    } else {
      zipMsg = " ZIP needs JSZip, which did not load.";
    }
    const originals = blobs.filter((b) => /original bytes/.test(b.format)).length;
    setStatus("extractImagesStatus", "Done. Found " + blobs.length + " image(s)" + (originals ? " (" + originals + " in original format)" : "") + (skipped ? " (" + skipped + " skipped: unreadable format)" : "") + "." + zipMsg);
  } catch (e) { if (!setPdfError("extractImagesStatus", e)) setError("extractImagesStatus", "Could not read the images in this PDF. Please check the file."); }
});
