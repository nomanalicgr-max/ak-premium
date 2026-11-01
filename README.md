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
