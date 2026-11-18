/* AK Premium v12 — pdf-to-images (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- New PDF tools: Remove Pages + Add Watermark ---------- */

const pdfImagesBtn = $("pdfImagesBtn");
if (pdfImagesBtn) pdfImagesBtn.addEventListener("click", async () => {
  const file = ($("pdfImagesInput").files || [])[0];
  if (!file) { setError("pdfImagesStatus", "Please select a PDF file first."); return; }
  if (!needLibrary(!!window.pdfjsLib, "pdf.js", "pdfImagesStatus")) return;
  try {
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const bytes = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const out = $("pdfImagesOutput"); out.innerHTML = "";
    const blobs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) continue;
      blobs.push({ name: "ak-premium-page-" + i + ".png", blob });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "ak-premium-page-" + i + ".png"; a.textContent = "Download page " + i + " PNG";
      out.appendChild(a); out.appendChild(document.createElement("br"));
    }
    if (window.JSZip && blobs.length) {
      const zip = new window.JSZip();
      blobs.forEach((b) => zip.file(b.name, b.blob));
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, "ak-premium-pages.zip");
      setStatus("pdfImagesStatus", "Done. PNG links are above; ZIP download also started.");
    } else {
      setStatus("pdfImagesStatus", "Done. PNG links are above. ZIP needs JSZip, which did not load.");
    }
  } catch (e) { if (!setPdfError("pdfImagesStatus", e)) setError("pdfImagesStatus", "Could not render this PDF to images. Please check the file."); }
});
