/* AK Premium v12 — resize-pdf-page-size (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

async function decodeContentStream(stream) {
  const dict = stream.dict;
  const raw = (typeof stream.getContents === "function") ? stream.getContents() : null;
  if (!raw) return null;
  const filter = dict.get(window.PDFLib.PDFName.of("Filter"));
  if (!filter) return raw;
  const names = (typeof filter.asArray === "function" ? filter.asArray() : [filter]).map((f) => f.toString());
  if (names.length === 1 && names[0] === "/FlateDecode" && !dict.get(window.PDFLib.PDFName.of("DecodeParms")) && typeof DecompressionStream !== "undefined") {
    try {
      // Inflate with a writer + reader, not Blob.stream(): Blob.stream()
      // is missing in some environments (and in jsdom), while the
      // stream writer/reader pair works everywhere DecompressionStream
      // exists.
      const ds = new DecompressionStream("deflate");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      const chunks = [];
      const reading = (async () => {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          chunks.push(part.value);
        }
      })();
      await writer.write(raw);
      await writer.close();
      await reading;
      let total = 0;
      for (const c of chunks) total += c.length;
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { out.set(c, off); off += c.length; }
      return out;
    } catch (e) { return null; }
  }
  return null;
}

/* Resize one page in place, without rasterising: the page's own content
   stream is wrapped in a scale-and-centre transform, the MediaBox and
   CropBox are set to the target size, and every annotation rectangle
   (links and form-field widgets, including QuadPoints) is scaled by the
   same amount, so links and fields stay where they belong. Vector text
   and drawings stay vector. Returns {ok} or {ok:false, reason}. The
   text inside a form field keeps its original font size, so a field
   shrunk a lot may clip its text; that is stated on the page. */

async function resizePdfPageInPlace(doc, pageIndex, targetW, targetH) {
  const P = window.PDFLib.PDFName;
  const page = doc.getPage(pageIndex);
  const mb = page.getMediaBox();
  if (!mb.width || !mb.height) return { ok: false, reason: "page has no size" };
  const scale = Math.min(targetW / mb.width, targetH / mb.height);
  const tx = (targetW - mb.width * scale) / 2 - mb.x * scale;
  const ty = (targetH - mb.height * scale) / 2 - mb.y * scale;
  const cont = page.node.Contents();
  if (!cont) return { ok: false, reason: "page has no content" };
  const refs = (typeof cont.asArray === "function") ? cont.asArray() : [cont];
  let old = [];
  for (const r of refs) {
    const st = doc.context.lookup(r);
    if (!st || typeof st.getContents !== "function") return { ok: false, reason: "unreadable content" };
    const dec = await decodeContentStream(st);
    if (dec === null) return { ok: false, reason: "unsupported content encoding (not FlateDecode)" };
    old.push(dec);
  }
  const enc = new TextEncoder();
  const parts = [enc.encode("q " + scale + " 0 0 " + scale + " " + tx + " " + ty + " cm\n")];
  for (const d of old) { parts.push(d); parts.push(enc.encode("\n")); }
  parts.push(enc.encode("Q"));
  let total = 0;
  for (const p of parts) total += p.length;
  const wrapped = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { wrapped.set(p, off); off += p.length; }
  page.node.set(P.of("Contents"), doc.context.flateStream(wrapped));
  page.setMediaBox(0, 0, targetW, targetH);
  page.setCropBox(0, 0, targetW, targetH);
  for (const b of ["BleedBox", "TrimBox", "ArtBox"]) page.node.delete(P.of(b));
  const annots = page.node.Annots();
  if (annots) for (let i = 0; i < annots.size(); i++) {
    const a = doc.context.lookup(annots.get(i));
    if (!a || typeof a.get !== "function") continue;
    const rect = a.get(P.of("Rect"));
    if (rect && typeof rect.asArray === "function") {
      const v = rect.asArray().map((n) => n.asNumber());
      if (v.length === 4) a.set(P.of("Rect"), doc.context.obj([tx + v[0] * scale, ty + v[1] * scale, tx + v[2] * scale, ty + v[3] * scale]));
    }
    const qp = a.get(P.of("QuadPoints"));
    if (qp && typeof qp.asArray === "function") {
      const q = qp.asArray().map((n) => n.asNumber());
      const nq = [];
      for (let j = 0; j + 1 < q.length; j += 2) nq.push(tx + q[j] * scale, ty + q[j + 1] * scale);
      if (nq.length) a.set(P.of("QuadPoints"), doc.context.obj(nq));
    }
  }
  return { ok: true, scale };
}

const pageSizeSelect = $("pageSizeSelect");
if (pageSizeSelect) pageSizeSelect.addEventListener("change", () => {
  const row = $("resizeCustomRow"); if (row) row.style.display = pageSizeSelect.value === "Custom" ? "" : "none";
});

const resizePageBtn = $("resizePageBtn");
if (resizePageBtn) resizePageBtn.addEventListener("click", async () => {
  const file = ($("resizePageInput").files || [])[0];
  if (!file) { setError("resizePageStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "resizePageStatus")) return;
  const sizeSel = $("pageSizeSelect") ? $("pageSizeSelect").value : "A4";
  const sizes = { A4: [595.28, 841.89], Letter: [612, 792], Legal: [612, 1008] };
  let target = sizes[sizeSel];
  let sizeLabel = sizeSel;
  if (sizeSel === "Custom") {
    const wMm = $("resizeCustomW") ? parseFloat($("resizeCustomW").value) : NaN;
    const hMm = $("resizeCustomH") ? parseFloat($("resizeCustomH").value) : NaN;
    if (!wMm || !hMm || wMm < 50 || hMm < 50 || wMm > 1200 || hMm > 1200) { setError("resizePageStatus", "Please enter a custom width and height in millimetres, each between 50 and 1200."); return; }
    target = [wMm * 72 / 25.4, hMm * 72 / 25.4];
    sizeLabel = wMm + " × " + hMm + " mm";
  }
  if (!target) target = sizes.A4;
  setStatus("resizePageStatus", "Resizing pages to " + sizeLabel + "…");
  try {
    const doc = await loadPdfLibDoc(file, "resizePageStatus");
    if (!doc) return;
    const count = doc.getPageCount();
    const sel = parsePageList($("resizePages") ? $("resizePages").value : "all", count);
    if (sel.error) { setError("resizePageStatus", sel.error); return; }
    let done = 0;
    const skipped = [];
    for (const idx of sel.pages) {
      const r = await resizePdfPageInPlace(doc, idx, target[0], target[1]);
      if (r.ok) done++;
      else skipped.push("page " + (idx + 1) + " (" + r.reason + ")");
    }
    if (!done) { setError("resizePageStatus", "No page could be resized. " + (skipped.join("; ") || "Please check the file.")); return; }
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-resized.pdf");
    setStatus("resizePageStatus", "Done. " + done + " page(s) resized to " + sizeLabel + (sel.pages.length < count ? "; the other pages kept their original size" : "") + (skipped.length ? ". Skipped: " + skipped.join("; ") : "") + ". Text and drawings stay vector; form fields and links were scaled with their pages.");
  } catch (e) { if (!setPdfError("resizePageStatus", e)) setError("resizePageStatus", "Could not resize this PDF. Please check the file."); }
});
