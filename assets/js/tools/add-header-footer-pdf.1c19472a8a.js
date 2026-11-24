/* AK Premium v12 — add-header-footer-pdf (split from app.js). Loads after core.js, only on its own tool page. */

/* ---------- Wave 1: PDF matrix (batch 1) ---------- */

const hfDiffFirst = $("hfDiffFirst");
if (hfDiffFirst) hfDiffFirst.addEventListener("change", () => {
  const row = $("hfFirstRow"); if (row) row.style.display = hfDiffFirst.checked ? "" : "none";
});

const headerFooterBtn = $("headerFooterBtn");
if (headerFooterBtn) headerFooterBtn.addEventListener("click", async () => {
  const file = ($("headerFooterInput").files || [])[0];
  if (!file) { setError("headerFooterStatus", "Please select a PDF file first."); return; }
  if (!checkFileSize(file, "headerFooterStatus")) return;
  const header = ($("headerText").value || "").trim();
  const footer = ($("footerText").value || "").trim();
  const logoFile = ($("hfLogoInput") && $("hfLogoInput").files || [])[0];
  if (!header && !footer && !logoFile) { setError("headerFooterStatus", "Please type a header or a footer, or choose a logo image, first."); return; }
  setStatus("headerFooterStatus", "Adding header and footer…");
  try {
    const doc = await loadPdfLibDoc(file, "headerFooterStatus");
    if (!doc) return;
    const P = window.PDFLib;
    const fontName = $("hfFont") ? $("hfFont").value : "helvetica";
    const font = await doc.embedFont(fontName === "times" ? P.StandardFonts.TimesRoman : fontName === "courier" ? P.StandardFonts.Courier : P.StandardFonts.Helvetica);
    let size = $("hfSize") ? (parseInt($("hfSize").value, 10) || 10) : 10;
    size = Math.min(16, Math.max(8, size));
    const hex = ($("hfColor") && $("hfColor").value) || "#595959";
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    const color = m ? P.rgb(parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255) : P.rgb(0.35, 0.35, 0.35);
    const align = $("hfAlign") ? $("hfAlign").value : "left";
    const scope = $("hfScope") ? $("hfScope").value : "all";
    const diffFirst = $("hfDiffFirst") ? $("hfDiffFirst").checked : false;
    const firstHeader = diffFirst ? (($("hfFirstHeader") && $("hfFirstHeader").value || "").trim()) : null;
    const firstFooter = diffFirst ? (($("hfFirstFooter") && $("hfFirstFooter").value || "").trim()) : null;
    const today = new Date().toISOString().slice(0, 10);
    const total = doc.getPageCount();
    const stampText = (text, pageNum) => text.split("{page}").join(String(pageNum)).split("{total}").join(String(total)).split("{date}").join(today);
    let logo = null, logoRatio = 1;
    if (logoFile) {
      if (!checkFileSize(logoFile, "headerFooterStatus")) return;
      const buf = await readAsArrayBuffer(logoFile);
      const isPng = /png/i.test(logoFile.type || "") || /\.png$/i.test(logoFile.name || "");
      try {
        logo = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf);
        logoRatio = logo.width / logo.height;
      } catch (e) { setError("headerFooterStatus", "The logo image could not be read. Please use a PNG or JPG image."); return; }
    }
    const logoH = size + 6, logoW = logoH * logoRatio;
    let stamped = 0;
    doc.getPages().forEach((page, idx) => {
      const pageNum = idx + 1;
      const isFirst = pageNum === 1;
      if (scope === "odd" && pageNum % 2 === 0) return;
      if (scope === "even" && pageNum % 2 === 1) return;
      if (scope === "notfirst" && isFirst) return;
      if (scope === "first" && !isFirst) return;
      const hText = isFirst && diffFirst ? firstHeader : header;
      const fText = isFirst && diffFirst ? firstFooter : footer;
      const { width, height } = page.getSize();
      const drawLine = (text, y) => {
        if (!text) return;
        const maxW = width - 72 - (logo && y > height - 40 ? logoW + 6 : 0);
        let s = size;
        while (s > 7 && font.widthOfTextAtSize(text, s) > maxW) s -= 1;
        const tw = font.widthOfTextAtSize(text, s);
        let x = 36;
        if (align === "center") x = (width - tw) / 2;
        else if (align === "right") x = width - 36 - tw;
        if (logo && y > height - 40 && align === "left") x = 36 + logoW + 6;
        if (logo && y > height - 40 && align === "center") x = Math.max(36 + logoW + 6, (width - tw) / 2);
        page.drawText(text, { x, y, size: s, font, color });
      };
      if (logo) {
        const lx = align === "right" ? width - 36 - logoW : 36;
        page.drawImage(logo, { x: lx, y: height - 30 - logoH + size, width: logoW, height: logoH });
      }
      drawLine(hText ? stampText(hText, pageNum) : "", height - 30);
      drawLine(fText ? stampText(fText, pageNum) : "", 20);
      stamped++;
    });
    const bytes = await doc.save();
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "ak-premium-header-footer.pdf");
    setStatus("headerFooterStatus", "Done. Header and footer added to " + stamped + " page(s). {page}, {total} and {date} were replaced with the page number, page count and today's date.");
  } catch (e) { if (!setPdfError("headerFooterStatus", e)) setError("headerFooterStatus", "Could not add a header or footer to this PDF. Please check the file."); }
});
