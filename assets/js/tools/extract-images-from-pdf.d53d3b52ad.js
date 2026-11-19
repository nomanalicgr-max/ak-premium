/* AK Premium v12 — extract-images-from-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

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
        const blob = await pdfImageToBlob(img);
        if (!blob) { skipped++; continue; }
        const fname = "ak-premium-image-" + p + "-" + n + ".png";
        blobs.push({ name: fname, blob });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = fname; a.textContent = "Download " + fname;
        out.appendChild(a); out.appendChild(document.createElement("br"));
      }
    }
    if (!blobs.length) {
      setStatus("extractImagesStatus", skipped ? "Found " + skipped + " embedded image(s), but none could be read as PNG. Try PDF to Images for a picture of the page." : "No embedded images were found in this PDF. It may be text only, or made of vector shapes.");
      return;
    }
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
    setStatus("extractImagesStatus", "Done. Found " + blobs.length + " image(s)" + (skipped ? " (" + skipped + " skipped: unreadable format)" : "") + "." + zipMsg);
  } catch (e) { if (!setPdfError("extractImagesStatus", e)) setError("extractImagesStatus", "Could not read the images in this PDF. Please check the file."); }
});
