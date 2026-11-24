/* AK Premium v12 — ppt-to-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Converters ---------- */

async function parsePptxSlides(zip) {
  const tag = (parent, name) => { const els = parent.getElementsByTagNameNS("*", name); return els && els.length ? els[0] : null; };
  const tags = (parent, name) => Array.from(parent.getElementsByTagNameNS("*", name) || []);
  const emu = (v) => parseInt(v || "0", 10) / 12700;
  const slideNames = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  let slideW = 720, slideH = 540;
  try {
    const pres = zip.files["ppt/presentation.xml"];
    if (pres) {
      const xml = await pres.async("string");
      const cx = xml.match(/<p:sldSz[^>]*cx="(\d+)"/);
      const cy = xml.match(/<p:sldSz[^>]*cy="(\d+)"/);
      if (cx && cy) { slideW = parseInt(cx[1], 10) / 12700; slideH = parseInt(cy[1], 10) / 12700; }
    }
  } catch (e) {}
  const mediaType = (name) => /\.png$/i.test(name) ? "image/png" : /\.gif$/i.test(name) ? "image/gif" : "image/jpeg";
  const slides = [];
  for (const name of slideNames) {
    const slideNum = name.match(/slide(\d+)\.xml/)[1];
    const rels = {};
    const relFile = zip.files["ppt/slides/_rels/slide" + slideNum + ".xml.rels"];
    if (relFile) {
      const relXml = await relFile.async("string");
      Array.from(relXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)).forEach((m) => { rels[m[1]] = m[2]; });
    }
    const xml = await zip.files[name].async("string");
    const xdoc = new DOMParser().parseFromString(xml, "text/xml");
    const shapes = [];
    const images = [];
    tags(xdoc, "pic").forEach((pic) => {
      const blip = tag(pic, "blip");
      const xfrm = tag(pic, "xfrm");
      const off = xfrm ? tag(xfrm, "off") : null, ext = xfrm ? tag(xfrm, "ext") : null;
      const rid = blip ? (blip.getAttribute("r:embed") || blip.getAttribute("embed")) : null;
      const target = rid && rels[rid] ? rels[rid] : null;
      if (!target || !off || !ext) return;
      const mediaName = "ppt/" + target.replace(/^\.\.\//, "");
      images.push({ x: emu(off.getAttribute("x")), y: emu(off.getAttribute("y")), w: emu(ext.getAttribute("cx")), h: emu(ext.getAttribute("cy")), mediaName, type: mediaType(mediaName) });
    });
    tags(xdoc, "sp").forEach((sp) => {
      const xfrm = tag(sp, "xfrm");
      const off = xfrm ? tag(xfrm, "off") : null, ext = xfrm ? tag(xfrm, "ext") : null;
      const paras = [];
      tags(sp, "p").forEach((p) => {
        const pPr = tag(p, "pPr");
        const algn = pPr ? (pPr.getAttribute("algn") || "l") : "l";
        const defRPr = pPr ? tag(pPr, "defRPr") : null;
        const defSz = defRPr ? parseInt(defRPr.getAttribute("sz") || "", 10) : NaN;
        const defColorEl = defRPr ? tag(defRPr, "srgbClr") : null;
        const runs = [];
        tags(p, "r").forEach((r) => {
          const t = tag(r, "t");
          if (!t) return;
          const rPr = tag(r, "rPr");
          const sz = rPr ? parseInt(rPr.getAttribute("sz") || "", 10) : NaN;
          const size = !isNaN(sz) ? sz / 100 : !isNaN(defSz) ? defSz / 100 : 18;
          const clr = rPr ? tag(rPr, "srgbClr") : null;
          const color = (clr && clr.getAttribute("val")) || (defColorEl && defColorEl.getAttribute("val")) || "";
          runs.push({ text: t.textContent, bold: !!(rPr && rPr.getAttribute("b") === "1"), italic: !!(rPr && rPr.getAttribute("i") === "1"), size, color });
        });
        if (runs.length) paras.push({ align: algn, runs });
      });
      if (!paras.length) return;
      shapes.push({ x: off ? emu(off.getAttribute("x")) : 0, y: off ? emu(off.getAttribute("y")) : 0, w: ext ? emu(ext.getAttribute("cx")) : slideW, h: ext ? emu(ext.getAttribute("cy")) : 40, paras });
    });
    for (const im of images) {
      const f = zip.files[im.mediaName];
      if (!f) continue;
      const b64 = await f.async("base64");
      im.dataUrl = "data:" + im.type + ";base64," + b64;
    }
    slides.push({ width: slideW, height: slideH, shapes, images: images.filter((im) => im.dataUrl) });
  }
  return slides;
}

const pptPdfBtn = $("pptPdfBtn");
if (pptPdfBtn) pptPdfBtn.addEventListener("click", async () => {
  const file = ($("pptPdfInput").files || [])[0];
  if (!file) { setError("pptPdfStatus", "Please select a PowerPoint (.pptx) file first."); return; }
  const JsPDF = getJsPdf();
  if (!needLibrary(!!JsPDF, "jsPDF", "pptPdfStatus") || !needLibrary(!!window.JSZip, "JSZip", "pptPdfStatus")) return;
  try {
    const data = await readAsArrayBuffer(file);
    const zip = await window.JSZip.loadAsync(data);
    const slides = await parsePptxSlides(zip);
    if (!slides.length) { setError("pptPdfStatus", "No slide text was found in this .pptx file. This basic conversion cannot read it."); return; }
    const doc = new JsPDF({ orientation: slides[0].width >= slides[0].height ? "landscape" : "portrait", unit: "pt", format: [slides[0].width, slides[0].height] });
    let shapeCount = 0, imageCount = 0;
    for (let si = 0; si < slides.length; si++) {
      const sl = slides[si];
      if (si > 0) doc.addPage([sl.width, sl.height], sl.width >= sl.height ? "landscape" : "portrait");
      // images first (they sit behind the text boxes)
      for (const im of sl.images) {
        const fmt = im.type === "image/png" ? "PNG" : "JPEG";
        try { doc.addImage(im.dataUrl, fmt, im.x, im.y, im.w, im.h); imageCount++; } catch (e) {}
      }
      for (const sh of sl.shapes) {
        let y = sh.y;
        for (const para of sh.paras) {
          const size = Math.max.apply(null, para.runs.map((r) => r.size || 12));
          const align = para.align === "ctr" ? "center" : para.align === "r" ? "right" : "left";
          // pageH is huge on purpose: text stays on its own slide page
          y = drawRichTextRuns(doc, para.runs, { x: sh.x, y, maxWidth: sh.w, size, lineHeight: size * 1.4, pageH: 100000, bottomMargin: 0, topMargin: sh.y, align });
        }
        shapeCount++;
      }
      if (!sl.shapes.length && !sl.images.length) {
        doc.setFontSize(12);
        doc.text("(No text on this slide)", 20, 20);
      }
    }
    doc.save("ak-premium-ppt-to-pdf.pdf");
    setStatus("pptPdfStatus", "Done. PDF downloaded (" + slides.length + " slide(s), " + shapeCount + " text box(es), " + imageCount + " image(s)). Slide thumbnails and exact PowerPoint layout are not kept — check the pages before sharing.");
  } catch (e) { setError("pptPdfStatus", "Could not convert this PowerPoint file to PDF. This is a basic, text-only conversion."); }
});
