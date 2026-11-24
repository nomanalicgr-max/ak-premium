/* AK Premium v12 — pdf-metadata-editor (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

function formatDateTimeLocal(d) {
  if (!d || isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

/* Format a Date as ISO 8601 with its LOCAL timezone offset
   (e.g. 2026-02-03T04:05:00+05:00). toISOString() always converts to
   UTC, which can move the date to the previous day for timezones east
   of UTC — the date the user typed would no longer appear in the XMP
   packet. The offset form keeps the typed local date visible and is
   still a valid XMP date. */

function buildXmpPacket(m) {
  const escXml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const li = (v) => "<rdf:li>" + escXml(v) + "</rdf:li>";
  const altLi = (v) => '<rdf:li xml:lang="x-default">' + escXml(v) + "</rdf:li>";
  let x = '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="AK Premium">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">\n';
  if (m.title) x += "<dc:title><rdf:Alt>" + altLi(m.title) + "</rdf:Alt></dc:title>\n";
  if (m.author) x += "<dc:creator><rdf:Seq>" + li(m.author) + "</rdf:Seq></dc:creator>\n";
  if (m.subject) x += "<dc:description><rdf:Alt>" + altLi(m.subject) + "</rdf:Alt></dc:description>\n";
  if (m.keywords && m.keywords.length) x += "<dc:subject><rdf:Bag>" + m.keywords.map(li).join("") + "</rdf:Bag></dc:subject>\n";
  if (m.creator) x += "<xmp:CreatorTool>" + escXml(m.creator) + "</xmp:CreatorTool>\n";
  if (m.createDate) x += "<xmp:CreateDate>" + escXml(m.createDate) + "</xmp:CreateDate>\n";
  if (m.modifyDate) x += "<xmp:ModifyDate>" + escXml(m.modifyDate) + "</xmp:ModifyDate>\n";
  if (m.producer) x += "<pdf:Producer>" + escXml(m.producer) + "</pdf:Producer>\n";
  x += "</rdf:Description>\n</rdf:RDF>\n</x:xmpmeta>\n<?xpacket end=\"w\"?>";
  return x;
}

/* PDF Metadata Editor: show the current metadata when a file is chosen. */

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
    const creator = doc.getCreator() || "";
    const producer = doc.getProducer() || "";
    const created = doc.getCreationDate() || null;
    const modified = doc.getModificationDate() || null;
    const hasXmp = !!doc.catalog.get(window.PDFLib.PDFName.of("Metadata"));
    if (current) current.textContent = "Current metadata\nTitle: " + (title || "(none)") + "\nAuthor: " + (author || "(none)") + "\nSubject: " + (subject || "(none)") + "\nKeywords: " + (keywords || "(none)") + "\nCreator: " + (creator || "(none)") + "\nProducer: " + (producer || "(none)") + "\nCreated: " + (created ? created.toLocaleString() : "(none)") + "\nModified: " + (modified ? modified.toLocaleString() : "(none)") + "\nXMP packet: " + (hasXmp ? "yes" : "no");
    $("metaTitle").value = title;
    $("metaAuthor").value = author;
    $("metaSubject").value = subject;
    $("metaKeywords").value = keywords;
    if ($("metaCreator")) $("metaCreator").value = creator;
    if ($("metaProducer")) $("metaProducer").value = producer;
    if ($("metaCreated")) $("metaCreated").value = formatDateTimeLocal(created);
    if ($("metaModified")) $("metaModified").value = formatDateTimeLocal(modified);
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
    const P = window.PDFLib.PDFName;
    const preset = $("metaPreset") ? $("metaPreset").value : "edit";
    const updateXmp = $("metaXmp") ? $("metaXmp").checked : true;
    const info = doc.getInfoDict();
    const readVal = (id) => { const el = $(id); return el ? (el.value || "").trim() : ""; };
    if (preset === "remove") {
      // Remove all personal metadata: blank the Info fields and drop
      // the XMP packet. The saving app still writes its own name as
      // Producer and the save time as the dates; that cannot be
      // avoided in a browser, and the status below says so.
      ["Title", "Author", "Subject", "Keywords", "Creator"].forEach((k) => info.delete(P.of(k)));
      doc.catalog.delete(P.of("Metadata"));
      const bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-metadata.pdf");
      setStatus("metadataStatus", "Done. Title, author, subject, keywords, creator and the XMP packet were removed. The saved file still names the app that saved it as Producer and shows the save time as the dates, because every PDF app writes those two details when it saves.");
      return;
    }
    const title = readVal("metaTitle");
    const author = readVal("metaAuthor");
    const subject = readVal("metaSubject");
    const keywords = readVal("metaKeywords");
    const creator = readVal("metaCreator");
    const producer = readVal("metaProducer");
    const createdRaw = readVal("metaCreated");
    const modifiedRaw = readVal("metaModified");
    if (title) doc.setTitle(title); else info.delete(P.of("Title"));
    if (author) doc.setAuthor(author); else info.delete(P.of("Author"));
    if (subject) doc.setSubject(subject); else info.delete(P.of("Subject"));
    if (keywords) doc.setKeywords(keywords.split(",").map((k) => k.trim()).filter(Boolean));
    else info.delete(P.of("Keywords"));
    if (creator) doc.setCreator(creator); else info.delete(P.of("Creator"));
    let createIso = null, modifyIso = null;
    if (createdRaw) { const d = new Date(createdRaw); if (!isNaN(d.getTime())) { doc.setCreationDate(d); createIso = toIsoWithOffset(d); } }
    if (!createIso && doc.getCreationDate()) createIso = toIsoWithOffset(doc.getCreationDate());
    if (modifiedRaw) { const d = new Date(modifiedRaw); if (!isNaN(d.getTime())) { doc.setModificationDate(d); modifyIso = toIsoWithOffset(d); } }
    if (!modifyIso) modifyIso = toIsoWithOffset(new Date());
    if (updateXmp) {
      const packet = buildXmpPacket({
        title, author, subject,
        keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        creator, producer,
        createDate: createIso, modifyDate: modifyIso
      });
      const stream = doc.context.flateStream(new TextEncoder().encode(packet), { Type: "Metadata", Subtype: "XML" });
      doc.catalog.set(P.of("Metadata"), stream);
    }
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-metadata.pdf");
    setStatus("metadataStatus", "Done. Metadata updated" + (updateXmp ? " (Info details and XMP packet)" : " (Info details only)") + ". Note: the Producer shown in file properties is always the app that saved the file, so your Producer value is stored in the XMP packet instead; the Modification Date is likewise the save time in the file properties, and your typed date is in the XMP packet.");
  } catch (e) { if (!setPdfError("metadataStatus", e)) setError("metadataStatus", "Could not update this PDF. Please check the file."); }
});

/* Decode one page content stream to its plain bytes. Page content is
   almost always FlateDecode (zlib), which the browser's built-in
   DecompressionStream handles; anything else returns null so the caller
   can skip that page honestly instead of corrupting it. */
