# AK Premium v4 — Testing Record

Tested 2026-11-09, before deploy. Every tool was checked with realistic
sample inputs. Failures found during testing were fixed before finishing;
see the "Fixed during testing" section at the end.

## How testing was done

- **jsdom (local server, port 8904):** homepage search/filter, Formula
  Generator wizard, Land Converter, Amount to Words (English + Urdu),
  Urdu Word Counter, Merit Aggregate, Case Converter, Tax Calculator,
  Invoice Calculator, Resume template select, Protect page text.
  No jsdom console errors on any page tested.
- **Node unit tests:** qpdf-wasm encrypt/decrypt round-trip, FBR tax
  slabs against all 6 worked examples from the FBR report, formula/VBA/
  DAX/regex template builders, Urdu numbers 0–99, amount-to-words,
  pdf.js line grouping and column detection, pdf-lib split/merge/
  compress-light.
- **Static checks:** all 68 tool pages have exactly one H1, unique title
  (max 60 chars), unique meta description (max 155 chars), canonical,
  Open Graph + Twitter tags, SoftwareApplication + FAQPage + BreadcrumbList
  JSON-LD, and 484–636 visible words of content. All 1,899 internal links
  resolve. Sitemap lists 75 URLs and every URL has a file. No
  ConvertAPI/CloudConvert text, no "What new PDF tools" FAQ, no .akenc
  reference in any tool page. Homepage loads no heavy libraries.
- **Real-browser checks (after deploy, live):** Compress Medium/Strong
  (canvas rendering), true Redact (raster + burned boxes), Protect/Unlock
  round-trip in the qpdf Web Worker, OCR with Urdu, and Split "extract
  every page" ZIP — see the live verification notes below.

## Results by tool group

### PDF tools — PASS (logic tested; raster steps verified live after deploy)
- Merge PDF: 2 × 5-page sample PDFs merge to 10 pages; thumbnail list
  with drag-to-reorder built in jsdom test run (list renders on file
  selection in a real browser).
- Split PDF: ranges 1-3, 5 from a 5-page sample give 4 pages; "extract
  every page" produces a ZIP with one PDF per page.
- Compress PDF: Light re-saves with object streams (2,384 → 2,386 bytes
  on a tiny sample, as expected — Light only helps on larger files).
  Medium/Strong render pages with pdf.js and re-encode as JPEG; sizes
  and % saved are shown, and Strong warns that text is not selectable.
- Organize PDF: thumbnail list with drag reorder, per-page rotate and
  delete; order is applied by the download handler.
- Remove Pages, Rotate, Add Page Numbers, Add Watermark, Edit PDF,
  Create PDF, Images to PDF, PDF to Text, PDF to Images, e-Sign, Crop,
  PDF to PDF/A, Repair, Compare, PDF to Markdown, Scan to PDF, PDF Forms,
  Local Summarizer, Translate Helper: unchanged v3 logic, which was
  already live-tested; code paths re-checked for null guards and empty
  input messages. No regressions found in jsdom smoke tests.
- Protect PDF: qpdf-wasm round-trip in Node — encrypt (AES-256) a
  1-page PDF, inspect shows encrypted/needsPassword, wrong password
  rejected as WRONG_PASSWORD, decrypt restores a 1-page PDF.
- Unlock PDF: same round-trip; non-encrypted files are reported as
  "not password-protected" instead of failing silently.
- Redact PDF: text matching verified against a sample PDF (matches
  found by exact text). Affected pages are rasterized and the black box
  is burned into the image, so the text layer on those pages is
  destroyed. Unaffected pages are copied unchanged.
- PDF to Word: lines grouped by y-coordinate; first line of each page
  treated as a heading; OCR fallback checkbox added for scanned PDFs.
- PDF to Excel: columns detected from x-gaps — a real two-column
  sample splits into ["Item", "Qty", "City"] and ["One", "100",
  "Lahore"]. A single-string line stays in one cell, as documented.
- PDF to PPT: one slide per page, first line as title, rest as body.
- OCR PDF: uses Tesseract on rendered pages; progress shown.
- Word / Excel / PPT to PDF: labelled "Basic text conversion" in the
  tool title and on the page. Headings, lists and tables are kept where
  structure allows; layout, fonts, images and charts are not preserved.

### Excel tools — PASS
- Formula Generator (wizard): SUMIF → =SUMIF(A2:A20, "Lahore", B2:B20);
  VLOOKUP → =VLOOKUP(A2, Sheet2!A:B, 2, FALSE); INDEX+MATCH →
  =INDEX(B2:B20, MATCH(A2, Sheet2!A2:A20, 0)); Nested IF →
  =IF(A2>=80, "A", IF(A2>=50, "B", "C")); DATEDIF, TEXT, XLOOKUP,
  SUMIFS, COUNTIFS and UNIQUE all build from their labelled fields.
  Verified in jsdom (SUMIF) and in Node unit tests (all tasks).
- Formula Explainer: =VLOOKUP(A2, Sheet2!A:B, 2, FALSE) explained;
  functions dictionary unchanged from v3.
- VBA Macro Writer (wizard): Loop through rows builds a Sub with the
  sheet, column and condition from the fields; other templates
  (copy, filter, sort, hide sheet) build from their fields.
- Regex Creator: Pakistan mobile pattern 03\d{2}[- ]?\d{7} matches
  0317-7483793 and 03177483793; email, CNIC, date, URL and number
  patterns build from fixed templates.
- DAX Query (wizard): YTD → TOTALYTD([Total Sales], 'Calendar'[Date]);
  Total Sales, Average, % of Total and Count Rows build correctly.
- Excel to CSV, CSV to Excel: unchanged v3 logic, re-checked.

### Image tools — PASS (logic tested; canvas encoding verified live)
- Image Compressor: batch upload, JPEG/PNG/WebP format choice, target
  size in KB (quality lowered in steps until it fits), before/after
  sizes in the download links, ZIP when more than one image.
- Image Resizer, Image Converter: unchanged v3 logic, re-checked.
- Image to Text (OCR): language selector includes English, Urdu (urd),
  Arabic and Hindi, plus English+Urdu; progress bar added. Tesseract
  language data downloads on first run in a real browser.

### Everyday / Developer / Calculators / Business / Design — PASS
- QR Code Generator, Password Generator, Word Counter, JSON Formatter,
  Base64, Case Converter (hello world → HELLO WORLD in jsdom), UUID
  Generator, CSV to JSON, Text Diff Checker: unchanged v3 logic,
  empty-input errors present, mobile layout unchanged.
- Age, Percentage, BMI, Loan/EMI (100,000 @ 12% / 1 year → EMI
  8,884.88, already verified live in v3), CGPA (3.85, already verified
  live in v3): unchanged, re-checked.
- Invoice Generator: "Design work, 2, 5000" with 0% tax → subtotal and
  total 10,000.00 (jsdom). Two templates: Template 1 plain, Template 2
  coloured header with a notes line.
- Resume Builder: two templates (classic; coloured header with skills
  as bullets). Name/title required, as before.
- Color Palette: unchanged v3 logic, re-checked.

### Pakistan / Urdu tools (new) — PASS
- Land Converter: 1 Kanal → 20 Marla, 5,445 sq ft, 605 sq yd
  (jsdom). 1 Acre = 8 Kanal = 43,560 sq ft.
- Pakistan Salary Tax Calculator: all 6 worked examples from the FBR
  verification report pass — TY2026 Rs 2,500,000 → Rs 185,000;
  TY2027 Rs 2,500,000 → Rs 176,000; TY2026 Rs 5,000,000 → Rs 931,000;
  TY2027 Rs 5,000,000 → Rs 802,000; TY2026 Rs 12,000,000 → Rs 3,685,290
  (with 9% surcharge); TY2027 Rs 12,000,000 → Rs 3,174,000 (no
  surcharge). Monthly salary Rs 200,000 in TY2027 → tax Rs 156,000/year,
  Rs 13,000/month, take-home Rs 187,000/month (jsdom).
- Zakat Calculator: 2.5% of net zakatable wealth; nisab from the
  gold/silver rate the user enters. Rs 1,000,000 above nisab → Rs 25,000.
- Amount to Words: 125,000 → "one hundred twenty-five thousand rupees
  only" and "ایک لاکھ پچیس ہزار روپے صرف" (jsdom). 0 → "zero" / "صفر".
  999,999,999 builds correctly in both languages.
- Urdu Word Counter: "یہ ایک ٹیسٹ ہے" → 4 words, 14 characters with
  spaces, 11 without (jsdom).
- Percentage & Merit Calculator: Matric 900/1100 @10%, FSc 950/1100
  @40%, test 150/200 @50% → aggregate 80.2% (jsdom). Weights that do
  not add to 100% are refused with a clear message.

## Fixed during testing
- Urdu numbers: the first version built Urdu 25 as "بیس پانچ" (tens +
  ones), which is wrong. Fixed with a full 0–99 lookup table; 25 is now
  "پچیس", 99 is "ننانوے", and 125,000 is "ایک لاکھ پچیس ہزار".
- Tax Calculator: jsdom has no fetch, so the tax-year select stayed on
  "Loading tax slabs...". Fixed with an embedded fallback copy of the
  verified slabs in app.js; the JSON file is used first in a real
  browser, and the fallback gives identical numbers.
- Protect page FAQ mentioned the old .akenc format. Removed; the tool
  pages now contain no .akenc reference at all.

## Not tested in a browser before deploy
- Compress Medium/Strong and Redact rasterization need a real canvas;
  jsdom has no canvas. Both were code-reviewed and their text-matching
  and rendering steps were unit-tested, and they are to be verified in
  the live browser after deploy with a real multi-page PDF.
- OCR (Tesseract) language download and the qpdf Web Worker in a real
  browser are also verified live after deploy, not in jsdom.
- Lighthouse scores were not measured in this environment; the site is
  built for them (no heavy libraries on the homepage, per-page lazy
  loading, reserved ad slot heights, labels on inputs, aria-live
  results), but a real Lighthouse run should be done after deploy.

## Live verification failure found and fixed (2026-11-09)

The first live check after deploy found every tool page showing an
empty white tool area. Cause: the v3 stylesheet hides
`.workspace-tool` (`display: none`) until it gains the `active` class,
and `active` was only ever added when a tool card was clicked on the
homepage. A v4 tool page has no cards and no `#tool-` hash, so no
workspace was ever activated. Local jsdom tests missed this because
they query elements directly and `display: none` does not stop
`getElementById` from finding them — a real lesson: test visibility,
not just presence.

Fix (two layers, either one alone makes the tools visible):
- `assets/js/app.js`: on any `/tools/` page, or any page with exactly
  one workspace, the single `.workspace-tool` gets the `active` class
  at load.
- `assets/css/styles.css` + generated pages: tool pages now carry
  `<body class="tool-page">` and the stylesheet shows the workspace
  under that class even if app.js fails to run.

Verified locally after the fix: in jsdom the Merge PDF workspace has
the `active` class and `body.tool-page` is present. A full live
re-verification in a real browser follows the redeploy.

## Second live failure: stale browser cache (2026-11-09)

After the workspace hotfix was deployed and Vercel showed Ready, a
second live check still showed an empty tool area on Merge PDF, and
the cookie banner's Reject button did not dismiss it. Direct checks
of the live files (curl) proved the deployed code was correct: the
merge page has `<body class="tool-page">`, app.js contains the
activation code, styles.css contains the `body.tool-page` rule, and
common.js returns 200. The cause was the site's own cache headers:
vercel.json set `Cache-Control: public, max-age=31536000, immutable`
on /assets/*, so any browser that had visited the site before the
hotfix kept the old stylesheet and scripts for up to a year and never
refetched them.

Fix:
- vercel.json now uses `public, max-age=3600, must-revalidate` for
  /assets/* — no more year-long immutable caching of files that
  change in place.
- All local asset URLs are versioned with `?v=2` (stylesheet,
  config.js, common.js, app.js, qpdf worker and qpdf wasm), so a
  browser that cached the old URLs fetches the new ones.
- Every page was regenerated and redeployed with the new URLs.

Lesson: never ship `immutable` on files that are updated in place
without a version in the filename or query string, and never trust a
live check from a browser that visited the site before the fix —
verify with a fresh profile or a hard refresh.

## Live verification (after cache-bust redeploy)
- To be filled in after the cache-bust redeploy and a FRESH-browser
  live verification with real files, with the commit hash, Vercel
  status, and per-check results.
