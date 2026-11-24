/* AK Premium v12 — rotate-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- PDF Studio ---------- */

const rotatePdfBtn = $("rotatePdfBtn");
if (rotatePdfBtn) rotatePdfBtn.addEventListener("click", async () => {
  const file = ($("rotateInput").files || [])[0];
  if (!file) { setError("rotatePdfStatus", "Please select a PDF file first."); return; }
  try {
    const doc = await loadPdfLibDoc(file, "rotatePdfStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    /* Per-page angles when the picker rendered; otherwise the single angle
       in the Angle list applies to every page, as before. */
    const perPage = rotAngles.length === count ? rotAngles : null;
    const globalAngle = parseInt($("rotateAngle").value, 10);
    doc.getPages().forEach((page, i) => {
      // Add to the page's existing rotation instead of replacing it, so a
      // page already rotated 90 degrees becomes 180, not 90 again.
      const angle = perPage ? perPage[i] : globalAngle;
      const current = page.getRotation().angle || 0;
      page.setRotation(window.PDFLib.degrees((current + angle) % 360));
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-rotated.pdf");
    setStatus("rotatePdfStatus", "Done. Rotated PDF downloaded." + (perPage ? " Each page turned by the angle shown on its thumbnail." : ""));
  } catch (e) { if (!setPdfError("rotatePdfStatus", e)) setError("rotatePdfStatus", "Could not rotate this PDF. Please check the file."); }
});

/* ---------- Rotate PDF: per-page picker, OSD auto-rotate, deskew ---------- */

const rotatePdfBtnEl = $("rotatePdfBtn");
if (rotatePdfBtnEl && rotatePdfBtnEl.parentNode) rotatePdfBtnEl.parentNode.insertBefore(rotExtraWrap, rotatePdfBtnEl);

const rotateInput = $("rotateInput");

const rotateAngleSel = $("rotateAngle");
if (rotateAngleSel) rotateAngleSel.addEventListener("change", () => {
  const v = parseInt(rotateAngleSel.value, 10) || 0;
  rotAngles = rotAngles.map(() => v);
  document.querySelectorAll("#rotPicker .rot-angle").forEach((sel) => { sel.value = String(v); });
});
if (rotateInput) rotateInput.addEventListener("change", async () => {
  const file = (rotateInput.files || [])[0]; const picker = $("rotPicker"); if (!file || !picker) return;
  picker.innerHTML = ""; rotAngles = []; rotPdf = null;
  if (!(await ensurePdfJs("rotatePdfStatus"))) return;
  try {
    rotPdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
    const base = rotateAngleSel ? parseInt(rotateAngleSel.value, 10) || 0 : 0;
    for (let i = 1; i <= rotPdf.numPages; i++) {
      rotAngles.push(base);
      const page = await rotPdf.getPage(i);
      const vp = page.getViewport({ scale: 0.35 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      const item = document.createElement("div"); item.className = "thumb";
      item.appendChild(cv);
      const label = document.createElement("div"); label.textContent = "Page " + i; item.appendChild(label);
      const sel = document.createElement("select"); sel.className = "rot-angle"; sel.setAttribute("aria-label", "Rotate page " + i);
      [0, 90, 180, 270].forEach((a) => { const o = document.createElement("option"); o.value = String(a); o.textContent = a + "°"; if (a === base) o.selected = true; sel.appendChild(o); });
      sel.addEventListener("change", () => { rotAngles[i - 1] = parseInt(sel.value, 10) || 0; });
      item.appendChild(sel);
      picker.appendChild(item);
    }
    setStatus("rotatePdfStatus", rotPdf.numPages + " page(s) loaded. Pick an angle on each thumbnail, or leave the Angle list to turn every page the same way.");
  } catch (e) { rotPdf = null; rotAngles = []; }
});

const rotAutoBtn = $("rotAutoBtn");
if (rotAutoBtn) rotAutoBtn.addEventListener("click", async () => {
  if (!rotPdf) { setError("rotatePdfStatus", "Choose a PDF file first, so the text direction can be checked."); return; }
  if (!window.Tesseract) {
    const ok = await Promise.race([loadLibrary("tesseract", "rotatePdfStatus"), new Promise((r) => setTimeout(() => r(false), 20000))]);
    if (!ok || !window.Tesseract) { setError("rotatePdfStatus", "The text-direction library could not be loaded. Check your connection and try again."); return; }
  }
  setStatus("rotatePdfStatus", "Checking the text direction on each page...");
  try {
    const notes = [];
    for (let i = 1; i <= rotPdf.numPages; i++) {
      const page = await rotPdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      let deg = 0;
      try {
        const res = await window.Tesseract.detect(cv);
        const d = res && res.data ? res.data : res;
        const o = d ? d.orientation_degrees : 0;
        if (o === 0 || o === 90 || o === 180 || o === 270) deg = o;
      } catch (e) { deg = 0; }
      const fix = (360 - deg) % 360;
      rotAngles[i - 1] = fix;
      const sel = document.querySelectorAll("#rotPicker .rot-angle")[i - 1];
      if (sel) sel.value = String(fix);
      notes.push("Page " + i + ": text turned " + deg + "°" + (fix ? " — will rotate " + fix + "°" : " — already upright"));
    }
    setStatus("rotatePdfStatus", "Text direction checked. " + notes.join(". ") + ". Press Rotate PDF to apply.");
  } catch (e) { setError("rotatePdfStatus", "Could not check the text direction. Please try again."); }
});

const rotDeskewBtn = $("rotDeskewBtn");
if (rotDeskewBtn) rotDeskewBtn.addEventListener("click", async () => {
  const file = ($("rotateInput").files || [])[0];
  if (!file) { setError("rotatePdfStatus", "Please select a PDF file first."); return; }
  if (!rotPdf) { setError("rotatePdfStatus", "Choose a PDF file first, so the tilt can be measured."); return; }
  setStatus("rotatePdfStatus", "Measuring the tilt on each page...");
  try {
    const doc = await loadPdfLibDoc(file, "rotatePdfStatus");
    if (!doc) return;
    const out = await window.PDFLib.PDFDocument.create();
    const report = [];
    for (let i = 1; i <= rotPdf.numPages; i++) {
      const page = await rotPdf.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const scale = Math.min(1, 900 / Math.max(vp.width, vp.height));
      const svp = page.getViewport({ scale });
      const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(svp.width)); cv.height = Math.max(1, Math.round(svp.height));
      const ctx = cv.getContext("2d");
      let angle = 0;
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport: svp }).promise;
        try {
          const img = ctx.getImageData(0, 0, cv.width, cv.height);
          const dark = new Uint8Array(cv.width * cv.height);
          let n = 0;
          for (let p = 0; p < dark.length; p++) {
            const lum = (img.data[p * 4] + img.data[p * 4 + 1] + img.data[p * 4 + 2]) / 3;
            if (lum < 128) { dark[p] = 1; n++; }
          }
          if (n > 20) angle = deskewBestAngle(dark, cv.width, cv.height);
        } catch (e) { angle = 0; }
      }
      const src = doc.getPage(i - 1); const { width, height } = src.getSize();
      if (!angle || Math.abs(angle) < 0.5) {
        const [copied] = await out.copyPages(doc, [i - 1]); out.addPage(copied);
        report.push("Page " + i + ": no tilt found");
        continue;
      }
      /* Tilted page: rebuild it from a rotated render, so the text layer
         is lost on that page only — the status says so plainly. */
      const rvp = page.getViewport({ scale: 2 });
      const rc = document.createElement("canvas"); rc.width = rvp.width; rc.height = rvp.height;
      await page.render({ canvasContext: rc.getContext("2d"), viewport: rvp }).promise;
      const fc = document.createElement("canvas"); fc.width = rc.width; fc.height = rc.height;
      const fctx = fc.getContext("2d");
      fctx.fillStyle = "#fff"; fctx.fillRect(0, 0, fc.width, fc.height);
      /* deskewBestAngle returns the correction angle itself (negative when
         the text slopes down to the right), so rotate by that angle. */
      fctx.translate(fc.width / 2, fc.height / 2); fctx.rotate(angle * Math.PI / 180); fctx.drawImage(rc, -rc.width / 2, -rc.height / 2);
      const jpg = await out.embedJpg(fc.toDataURL("image/jpeg", 0.92));
      const pg = out.addPage([width, height]);
      pg.drawImage(jpg, { x: 0, y: 0, width, height });
      report.push("Page " + i + ": tilted " + Math.abs(angle).toFixed(1) + "°, straightened (rebuilt as an image)");
    }
    const bytes = await out.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-deskewed.pdf");
    setStatus("rotatePdfStatus", "Done. " + report.join(". ") + ". Straightened pages are rebuilt as images, so their text is no longer selectable on those pages.");
  } catch (e) { if (!setPdfError("rotatePdfStatus", e)) setError("rotatePdfStatus", "Could not straighten this PDF. Please check the file."); }
});
