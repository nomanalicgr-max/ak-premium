/* AK Premium v12 — pdf-metadata-editor (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const metadataInput = $("metadataInput");
if (metadataInput) metadataInput.addEventListener("change", async () => {
  const file = (metadataInput.files || [])[0];
  const current = $("metadataCurrent");
  if (!file) { if (current) current.textContent = ""; return; }
  if (!checkFileSize(file, "metadataStatus")) return;
  setStatus("metadataStatus", "Reading metadata…");
  try {
    const doc = await loadPdfLibDoc(file, "metadataStatus");
    if (!doc) return;
    const title = doc.getTitle() || "";
    const author = doc.getAuthor() || "";
    const subject = doc.getSubject() || "";
    const keywords = doc.getKeywords() || "";
    if (current) current.textContent = "Current metadata\nTitle: " + (title || "(none)") + "\nAuthor: " + (author || "(none)") + "\nSubject: " + (subject || "(none)") + "\nKeywords: " + (keywords || "(none)");
    $("metaTitle").value = title;
    $("metaAuthor").value = author;
    $("metaSubject").value = subject;
    $("metaKeywords").value = keywords;
    setStatus("metadataStatus", "Current metadata shown above. Change the fields and press Update Metadata.");
  } catch (e) { if (!setPdfError("metadataStatus", e)) setError("metadataStatus", "Could not read this PDF. Please check the file."); }
});

const metadataBtn = $("metadataBtn");
if (metadataBtn) metadataBtn.addEventListener("click", async () => {
  const file = ($("metadataInput").files || [])[0];
  if (!file) { setError("metadataStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "metadataStatus")) return;
  setStatus("metadataStatus", "Updating metadata…");
  try {
    const doc = await loadPdfLibDoc(file, "metadataStatus");
    if (!doc) return;
    const title = ($("metaTitle").value || "").trim();
    const author = ($("metaAuthor").value || "").trim();
    const subject = ($("metaSubject").value || "").trim();
    const keywords = ($("metaKeywords").value || "").trim();
    const info = doc.getInfoDict();
    const P = window.PDFLib.PDFName;
    if (title) doc.setTitle(title); else info.delete(P.of("Title"));
    if (author) doc.setAuthor(author); else info.delete(P.of("Author"));
    if (subject) doc.setSubject(subject); else info.delete(P.of("Subject"));
    if (keywords) doc.setKeywords(keywords.split(",").map((k) => k.trim()).filter(Boolean));
    else info.delete(P.of("Keywords"));
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-metadata.pdf");
    setStatus("metadataStatus", "Done. Metadata updated.");
  } catch (e) { if (!setPdfError("metadataStatus", e)) setError("metadataStatus", "Could not update this PDF. Please check the file."); }
});
