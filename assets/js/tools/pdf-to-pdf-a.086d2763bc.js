/* AK Premium v12 — pdf-to-pdf-a (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Advanced Batch 5: pdf-a, repair, compare, markdown, scan, ocr ---------- */

function listPdfFonts(doc) {
  const PL = window.PDFLib;
  const out = [];
  const seen = new Set();
  try {
    for (const page of doc.getPages()) {
      let res = null;
      try { res = page.node.Resources(); } catch (e) { continue; }
      if (!res) continue;
      const fontDict = res.lookup(PL.PDFName.of("Font"));
      if (!fontDict || !(fontDict instanceof PL.PDFDict)) continue;
      for (const [key, ref] of fontDict.entries()) {
        let fd = null;
        try { fd = doc.context.lookup(ref); } catch (e) { continue; }
        if (!fd || !(fd instanceof PL.PDFDict)) continue;
        const base = fd.get(PL.PDFName.of("BaseFont"));
        const name = base && base.decodeText ? base.decodeText() : String(base || key);
        if (seen.has(name)) continue;
        seen.add(name);
        let embedded = false;
        const descRef = fd.get(PL.PDFName.of("FontDescriptor"));
        if (descRef) {
          try {
            const desc = doc.context.lookup(descRef);
            if (desc && desc instanceof PL.PDFDict) {
              embedded = desc.has(PL.PDFName.of("FontFile")) || desc.has(PL.PDFName.of("FontFile2")) || desc.has(PL.PDFName.of("FontFile3"));
            }
          } catch (e) { /* unreadable descriptor: treat as not embedded */ }
        }
        const plain = name.replace(/^[A-Z]{6}\+/, "");
        const standard = /^(Helvetica|Times-Roman|Courier|Symbol|ZapfDingbats)(-(Bold|Oblique|BoldOblique|Italic|BoldItalic))?$/.test(plain);
        out.push({ name, embedded, standard });
      }
    }
  } catch (e) { /* font walk is a bonus; the checklist reports what it could read */ }
  return out;
}
/* Word-level diff via diff-match-patch: words become "lines" for
   diff_linesToChars_ so diffs land on word boundaries. Returns
   [[op, words]] with op -1 removed, 0 same, 1 added. No semantic cleanup:
   with word tokens the raw diff is already precise. */

const pdfaPdfBtn = $("pdfaPdfBtn");
/* Extra PDF/A controls: the checklist output, filled in when the file is
   checked. (Created here, inside the pdfa chunk, so the splitter keeps it
   in the pdf-to-pdf-a bundle.) */
const pdfaExtraWrap = document.createElement("div");
pdfaExtraWrap.innerHTML = '<div id="pdfaChecklist" aria-live="polite"></div>';

const pdfaPdfBtnEl = $("pdfaPdfBtn");
if (pdfaPdfBtnEl && pdfaPdfBtnEl.parentNode) pdfaPdfBtnEl.parentNode.insertBefore(pdfaExtraWrap, pdfaPdfBtnEl);
if (pdfaPdfBtn) pdfaPdfBtn.addEventListener("click", async () => {
  const file = ($("pdfaInput").files || [])[0]; if (!file) { setError("pdfaPdfStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "pdfaPdfStatus")) return;
  try {
    const doc = await loadPdfLibDoc(file, "pdfaPdfStatus"); if (!doc) return;
    /* Checklist on the ORIGINAL file, before new metadata is written. */
    const checks = [];
    const origTitle = doc.getTitle() || "";
    checks.push({ label: "Title metadata", ok: !!origTitle.trim(), detail: origTitle.trim() ? '"' + origTitle.trim() + '"' : "no title set — the archive copy will use the title box above" });
    const origAuthor = doc.getAuthor() || "";
    checks.push({ label: "Author metadata", ok: !!origAuthor.trim(), detail: origAuthor.trim() ? '"' + origAuthor.trim() + '"' : "no author set" });
    const created = doc.getCreationDate();
    checks.push({ label: "Creation date", ok: !!created, detail: created ? created.toISOString().slice(0, 10) : "no creation date set" });
    const fonts = listPdfFonts(doc);
    if (!fonts.length) checks.push({ label: "Fonts embedded", ok: true, detail: "no fonts used (no text on any page)" });
    else {
      const bad = fonts.filter((f) => !f.embedded && !f.standard);
      checks.push({ label: "Fonts embedded", ok: !bad.length, detail: fonts.map((f) => f.name + (f.embedded ? " (embedded)" : f.standard ? " (standard font — built into PDF readers)" : " (NOT embedded)")).join(", ") });
    }
    const sizes = doc.getPages().map((p) => { const s = p.getSize(); return Math.round(s.width) + "x" + Math.round(s.height); });
    const sameSize = new Set(sizes).size <= 1;
    checks.push({ label: "All pages the same size", ok: sameSize, detail: sameSize ? sizes[0] + " pt on every page" : "mixed page sizes: " + [...new Set(sizes)].join(", ") });
    if (await ensurePdfJs("pdfaPdfStatus")) {
      const pdf = await window.pdfjsLib.getDocument({ data: await readAsArrayBuffer(file) }).promise;
      const noText = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const tc = await (await pdf.getPage(i)).getTextContent();
        if (!tc.items.some((it) => (it.str || "").trim())) noText.push(i);
      }
      checks.push({ label: "Text layer on every page", ok: !noText.length, detail: noText.length ? "page(s) " + noText.join(", ") + " have no text (scanned pages?) — run OCR PDF first" : "all " + pdf.numPages + " page(s) have text" });
    }
    const passed = checks.filter((c) => c.ok).length;
    const out = $("pdfaChecklist");
    if (out) out.innerHTML = "<h3>Archive checklist — " + passed + " of " + checks.length + " passed</h3>" + "<ul>" + checks.map((c) => "<li>" + (c.ok ? "Pass: " : "Fail: ") + escapeHtml(c.label) + " — " + escapeHtml(c.detail) + "</li>").join("") + "</ul><p>This is a local checklist only. It is not a certified PDF/A validation.</p>";
    doc.setTitle($("pdfaTitle").value || origTitle || "Archive document"); doc.setAuthor("AK Premium"); doc.setSubject("Archive copy"); doc.setKeywords(["archive", "PDF/A-style"]); doc.setProducer("AK Premium browser tool"); doc.setCreator("AK Premium");
    const bytes = await doc.save(); downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-archive.pdf");
    setStatus("pdfaPdfStatus", "Done. Archive-style copy downloaded (" + passed + " of " + checks.length + " checklist items passed). This is not a certified PDF/A validation.");
  } catch (e) { if (!setPdfError("pdfaPdfStatus", e)) setError("pdfaPdfStatus", "Could not make an archive copy."); }
});
