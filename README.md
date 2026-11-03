# AK Premium — v2

Every tool you need to work with PDFs in one place, plus AK Premium Excel, image, business and calculator tools.

## What is new in v2
- Hero and category tabs in the style of a modern PDF tool site: All, Organize PDF, Optimize PDF, Convert PDF, Edit PDF, PDF Security, PDF Intelligence.
- Top navigation keeps All Tools, PDF Tools, Convert, Excel Tools and FAQ visible. Image, Everyday, Developer, Calculators, Business and Design tools are in a vertical More dropdown.
- Modern VIP look: Plus Jakarta Sans headings, Inter body, red to purple to blue gradient hero and buttons.
- 62 tool cards total: the previous 49 tools plus 13 new tools — Unlock PDF, Protect PDF, Crop PDF, Redact PDF, PDF to PDF/A, Repair PDF, Compare PDF, PDF to Markdown, Scan to PDF, OCR PDF, PDF Forms, Local Summarizer, Translate Helper.

## Privacy: browser only
All built-in tools process files locally in your browser using pdf-lib, pdf.js, jsPDF, SheetJS and Tesseract.js. No PDF, image or spreadsheet file is uploaded to an AK Premium server. Library files load from public CDNs.

## Honest limits
- Protect PDF is not a standard PDF password. Standard PDF encryption needs a native engine, so Protect encrypts the whole file in your browser with AES-GCM. Only this site's Unlock tool, with the same password, can reopen that .akenc file.
- Unlock PDF for a standard password-protected PDF rebuilds a text PDF from extracted text. Layout may change. It does not crack or guess passwords.
- PDF to PDF/A is an archive-style copy with metadata set, not certified PDF/A validation.
- Redact covers matching text with a black box on a copy. Check the result before sharing sensitive files, as the original text layer is not guaranteed to be removed by every reader.
- Local Summarizer picks key sentences in your browser. No AI server is used. Translate Helper only extracts text for translation elsewhere, so no text is sent to a translation service by AK Premium.
- Compress re-saves a PDF; image-heavy PDFs may shrink only a little. e-Sign is a visual signature PNG, not a legal digital signature. Complex PDF to Word, PDF to PPT and PPT to PDF conversions are text-based, so original layout is not preserved. Scanned-image PDFs without a text layer cannot be read by text extraction unless OCR is used.
- Excel formulas, VBA, regex and DAX are templates. Test them on a copy of your data first.

## SEO / AEO
Title, meta description, keywords, Open Graph and Twitter cards, WebApplication JSON-LD with all 62 features, and FAQPage JSON-LD are in index.html. robots.txt allows all and points to sitemap.xml. sitemap.xml lists only the homepage, because category views are URL hashes on the same page, not separate URLs.

## Files
index.html, styles.css, app.js, README.md, robots.txt, sitemap.xml. Live site: https://ak-premium.vercel.app/

## File preview (2026-11-01 update)

- When a PDF is chosen, AK Premium shows its name, size and page count and renders page 1 with pdf.js under the file chooser, before Convert is pressed, so the user can confirm the right document. Images show a thumbnail the same way.
- Previews are made in the browser only; files are not uploaded.
- If a PDF cannot be rendered (for example password-protected), the name and size are still shown.
- Tool grid now uses auto-fit columns, so rows stretch to fill the row and no large empty slot is left at the end of a row.

## v3 (2026-11-03, preview only, not yet deployed)
- Fixed search bug: a trending chip (e.g. VBA Macro Writer) no longer returns 0 results when a PDF tab was active; search now wins over the PDF tab filter, and chip clicks reset the tab to All.
- Fixed Privacy/Terms: footer now links to real pages (about.html, privacy.html, terms.html, disclaimer.html, contact.html) instead of closed FAQ anchors that could be hidden by category filtering.
- iLovePDF-style layout: light premium hero with balanced, centred text, centred tabs and chips, full-width grid (no ad sidebars) so 6 cards fit per row on desktop, taller cards, colourful icons kept.
- Dedicated tool page: clicking a card hides the grid and shows that tool on its own page view, with a Back to all tools button, big file dropzone, centred file preview, and a shareable #tool-<id> link. All existing tool logic is kept; no tool was rewritten.
- AdSense readiness: About, Privacy, Terms, Disclaimer and Contact pages with real content, footer links on every page, sitemap now lists home + 5 pages, robots allow all + sitemap link. AdSense/Adsterra ad code is NOT yet added; it needs an approved account and a code snippet from the provider.
