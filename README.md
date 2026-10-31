# AK Premium

AK Premium is a free, static, client-side toolkit with PDF tools and an Excel automation engine. It runs entirely in the browser: HTML for structure, custom CSS for design, and JavaScript for tools. There is no server, no database, and no paid API required for the built-in tools.

## Design

Light theme only: white cards on a very light gray page (#f7f8fa), dark slate text, thin 1px borders, 14-16px rounded corners, soft subtle shadows, and one restrained indigo accent (#4f46e5) for primary buttons and active navigation. No neon gradients, no glowing effects, no dark dashboard background. The homepage is deliberately organized like a clean tool site: a compact hero with one headline, one subline, one search bar and small trending chips; tool cards grouped under PDF Tools, Convert PDFs, Excel Tools, Image Tools, Everyday Tools, Developer Tools and Calculators; each card shows only an icon, a tool name and at most one very short line; clicking a card opens a clean workspace panel below the grid with inputs, one primary action button and a single short status line. All explanations — how tools work, privacy, limits, Google Analytics and AdSense notes — live in the FAQ accordion at the bottom of the page and in this README, not on tool cards or inside workspaces. The footer is compact, with a one-line About, Privacy, Terms and Contact. The clean, organized layout takes inspiration from the general design discipline of well-known tool sites; AK Premium is not affiliated with, endorsed by, or connected to any other tool site or brand. Excel to CSV and CSV to Excel are placed in Excel Tools (the cleaner grouping for spreadsheet tools); the Convert PDFs heading is unchanged.

## Brand

The official brand is **AK Premium** everywhere: title, headings, header, footer credits, SEO meta, Open Graph, Twitter cards, and JSON-LD.

## Files

- `index.html` — all visual layout, SEO/AEO meta, Open Graph, JSON-LD, hero search, ad placeholders, organized tool grids, workspace panels, and the FAQ accordion (which also carries the Privacy, Terms and Contact information).
- `styles.css` — AK Premium light theme, organized tool grids, workspace panels, terminal, ad slots, and responsive rules.
- `app.js` — all tool logic: SPA tabs, hero search filtering, PDF tools, converters, and the rule-based Excel engine. It also holds the Google Analytics and optional conversion configuration constants.
- `README.md` — this file.

## Run locally

Open `index.html` in a modern browser. No build step is required. An internet connection is needed for the CDN libraries (jsPDF, pdf-lib, pdf.js, SheetJS, JSZip, mammoth, docx, PptxGenJS, Tesseract.js for OCR, qrcode for QR codes). If a CDN fails, the affected tool shows a clear message instead of a fake result.

## Deploy

This is a static site. Upload or push these four files to any static host (for example GitHub Pages, Vercel, or Netlify) with `index.html` at the root. No server code, environment variables, or database setup is required for the built-in tools.

## What is client-side only — honest limits

- **PDF tools:** merging, splitting, removing pages, rotating, page numbers, watermarking, text extraction, image rendering, and simple text-based conversions run in the browser with pdf-lib, pdf.js, jsPDF, SheetJS, docx, and PptxGenJS. Remove Pages validates page numbers and ranges against the real page count and refuses to remove every page. Add Watermark stamps visible diagonal text on every page; it is not document security and does not prevent copying.
- **Spreadsheet tools:** Excel to CSV exports the first sheet only. CSV to Excel accepts an uploaded .csv or pasted CSV text; quoted commas are handled by SheetJS parsing, with a plain line/comma fallback for simple CSV.
- **Phase 1 tools:** Organize PDF validates that a new order lists every page from 1 to the page count exactly once. Edit PDF adds new text only; it does not edit or delete existing text in a PDF. Image Compressor output is JPEG, so transparency is flattened. Image Resizer and Converter use the browser canvas; WebP encoding depends on the browser and shows a clear message when it is unavailable. OCR (Image to Text) uses Tesseract.js, downloads language data on its first run and may take time, and works best on clear printed text — it is not reliable for handwriting or low-quality photos, and it never fakes output. QR codes are generated with the qrcode library; passwords use crypto.getRandomValues, never Math.random alone. Word Counter, JSON, Base64, Age, Percentage and BMI tools run entirely on the text and numbers you enter, with no file upload.
- **Compress PDF:** re-saving a PDF in the browser does not fully recompress embedded images. Image-heavy PDFs may shrink only a little. The UI says this plainly.
- **Protect / Unlock PDF:** full password encryption and removal are not implemented with the free client-side libraries here, so AK Premium does not fake them. Use a trusted desktop PDF app for encrypted files.
- **e-Sign:** the canvas produces a visual signature PNG only. It is not a legal digital signature or certificate-based signing.
- **PDF to Word / PPT and PPT to PDF:** these are simple, text-based conversions. Original layout, fonts, tables, images, charts, and animations are not preserved.
- **Excel, VBA, regex, and DAX outputs:** these are working templates from a rule-based keyword engine. They have not been run against your workbook or Power BI model. Replace placeholders with your own ranges, sheet names, and columns, and test on a copy of your data first. VBA in particular must be reviewed before use, and the placeholder password in the advanced VBA template must be changed.
- **Pixel-perfect conversion:** for complex layouts, `app.js` contains clearly commented, optional integration points: `CONVERT_API_KEY` and `CLOUDCONVERT_API_KEY`. Both are empty by default, optional, and free-tier (1,000 monthly actions) only. No key is required for the built-in tools, and AK Premium never fakes a conversion when a key is absent.

## Connect Google Analytics later (no layout change)

1. Create a Google Analytics 4 property and copy its measurement ID (it looks like `G-XXXXXXXXXX`).
2. In `app.js`, set `const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";` — replace the empty string only, nothing else.
3. Redeploy the same files. The code loads `gtag` only when this value is non-empty, so nothing changes until you add it.
4. Verify in Google Analytics Realtime that page views arrive. Do not paste a measurement ID into HTML comments or public issues; keep it only in `app.js` as shown.

## Apply for Google AdSense later (no layout change)

AK Premium is already prepared for AdSense, but approval is decided by Google, not by this site. To maximise your chances:

1. **Ad slots are placeholders only.** The leaderboard (728x90), two sidebar slots (160x600), and inline boxes are labelled “Ad Space — Google AdSense / Ezoic placeholder”. Paste your real AdSense code inside those divs only when you receive it. Do not paste real ad code before approval.
2. **Add `ads.txt`.** When AdSense gives you a publisher ID, publish an `ads.txt` file at your domain root with the exact line AdSense provides. This file is not included here because the publisher ID is not known yet.
3. **Keep the required pages live.** This site includes a one-line About, Privacy and Terms answers in the FAQ, and Contact (contact email: nomanalicgr@gmail.com), all reachable from the compact footer and the FAQ section. Keep them accurate and reachable.
4. **Use original content.** Keep the tool descriptions, FAQ answers, and About text original. Do not copy text, images, or files from other sites, and do not upload copyrighted material through the tools.
5. **Make the site complete before applying.** Publish the site on its final domain, check that every button either works or explains honestly what is needed, remove any broken links, and ensure the site loads on mobile. AdSense typically rejects thin, unfinished, or mostly placeholder sites.
6. **Traffic and policy.** Drive real, lawful traffic. Do not click your own ads, do not ask others to click ads, and do not place ads on pages that violate AdSense policies.

## Ad placeholders

Search `index.html` for “Ad space” and for the HTML comments “Paste AdSense code inside this div later.” Those are the only places to paste ad code later. The layout is designed to stay intact with or without real ads.

## Contact

AK Premium — nomanalicgr@gmail.com
