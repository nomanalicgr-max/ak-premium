# AK Premium v4 — Testing Record

## v8 (Phase 3) — 11 November 2026
- Harness: ~/workspace/tools/jsdom-test/run-v8.js — ALL CHECKS PASSED
  (85 pages: 68 tool pages + homepage + tools index + 6 info pages +
  /pakistan + /whats-new + 7 Urdu pages; sitemap 84 URLs).
- Known-answer checks, all pass: salary tax 200,000/month in Tax Year
  2027 gives 156,000 annual tax (slab table has 5 rows, source line
  "data verified 9 Nov 2026 · Source: FBR"); lakh grouping re-renders
  156,000 as 1,56,000; Zakat with 1,000,000 cash and a silver rate of
  10,000 gives 25,000 due; EMI of 1,000,000 at 12% for 5 years gives
  22,244.45; share link ?taxMonthly=200000&taxYear=2027 prefills and
  calculates on load.
- Workspace checks, all pass: merge page wraps the file input in a
  dropzone and the Merge button starts disabled; 25 calculator inputs
  use a decimal keyboard and none is type=number any more.
- Not verified: real-browser render, Lighthouse, CLS, dark-mode visual
  pass of every component, Urdu copy proofread.

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
  0300-1234567 and 03001234567; email, CNIC, date, URL and number
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

## Fresh-browser verification (2026-11-09, after cache-bust) — 7 of 13 PASS

The workspace fix and cache-bust worked: in a fresh browser the tool
areas render, file pickers and buttons are visible, thumbnails appear,
and these passed: Homepage (68 cards, search "tax" = 2 tools),
Image Compressor (JPEG 380.4 KB -> 99.6 KB at a 100 KB target, link
downloaded), Salary Tax Calculator (TY2027, Rs 200,000/month -> tax
Rs 156,000/year, Rs 13,000/month, take-home Rs 187,000), Land
Converter (1 Kanal = 20 Marla, 5,445 sq ft), Amount to Words
(125,000 EN + UR), Sitemap (75 URLs), robots.txt, 404 page.

Four failures found, all fixed below:
1. Cookie consent: Accept/Reject did not dismiss the banner. Cause:
   the stylesheet sets `.consent-banner{display:flex}`, which
   overrides the `hidden` attribute's `display:none`, so
   `banner.hidden = true` had no visual effect. The clicks did save
   the choice; the banner just never disappeared. Fix: added
   `.consent-banner[hidden]{display:none}` to styles.css.
2. PDF tools (Merge, Split, Compress, Protect): the work completed
   and the status said "downloaded", but no download button or link
   was ever shown, so the result could not be opened or verified.
   Fix: `downloadBlob` now always leaves a visible "Download
   <filename>" link in the active tool area, next to the status
   line, in addition to the automatic download. The link stays
   usable for 10 minutes.
3. Redact: "Could not redact this PDF." The full redact flow was
   reproduced in Node with a real canvas and PASSES (page 1 text
   destroyed, page 2 intact), so the logic is sound; the browser
   failure reason was hidden by a generic catch. Fix: the error
   message now shows the real reason, e.g. "Could not redact this
   PDF. (…)", and the success message now reports the true number
   of pages with matches (it previously reported the total page
   count).
4. Formula Generator: SUMIF built `=SUMIF(A2:A20, Lahore, B2:B20)`
   without quotes around Lahore, and stray text `100">` rendered
   next to the Condition field. Cause: the criteria value was
   inserted raw, and the placeholder `"Approved" or ">100"` broke
   the input HTML attribute. Fix: wizard fields now HTML-escape
   placeholders, and a `quoteCriteria` helper quotes plain-text
   criteria/lookup values (numbers, cell references, sheet
   references and comparisons are left alone). Verified in jsdom:
   SUMIF now builds `=SUMIF(A2:A20, "Lahore", B2:B20)`.

Asset version bumped to ?v=3 for this redeploy so browsers fetch
the new files.

## Re-verification (2026-11-09, ?v=3) — downloads verified independently

The visible download links work: Merge, Split (both modes), Compress
and Protect all produced real downloaded files, and I verified the
files myself with pdf-lib/qpdf (the browser agent cannot open its
own downloads):
- Merged PDF: 10 pages (2 x 5-page inputs) — PASS
- Split PDF (ranges 1-3, 5): 4 pages — PASS
- Split ZIP: 5 one-page PDFs — PASS
- Compressed PDF: 5 pages — PASS
- Protected PDF: encrypted, needs password; decrypts with test1234
  to 5 pages; wrong password rejected as WRONG_PASSWORD — PASS
- Formula Generator: `=SUMIF(A2:A20, "Lahore", B2:B20)` with quotes,
  no stray text — PASS
- Tax Calculator and Land Converter spot re-checks — PASS

Two items remained:
1. Cookie consent: no banner appeared in the agent's "fresh" tabs,
   because that browser profile is persistent and already holds a
   stored choice from an earlier run. That is itself evidence the
   choice now persists (the banner is hidden when a choice is
   stored). The click-to-dismiss was verified in jsdom (Accept ->
   banner hidden, localStorage "accepted") and the
   `.consent-banner[hidden]{display:none}` rule is in the deployed
   stylesheet diff. Treated as fixed; a true first-visit click test
   is still worth doing in a brand-new incognito window.
2. Redact: FAILED with the exact error "Cannot perform Construct on
   a detached ArrayBuffer". Root cause found: pdf.js sends its copy
   of the file to a Web Worker, which detaches (empties) the buffer,
   so pdf-lib's `PDFDocument.load(bytes)` on the same buffer throws.
   The same pattern exists nowhere else in app.js (only Redact
   passes one buffer to both libraries). Fix: pdf.js now gets
   `bytes.slice(0)` (a copy) and pdf-lib keeps the original.
   Verified in Node with a real canvas: 1 match, page 1 text
   destroyed, page 2 intact ("Second page, no secret here.").
   Compress wording also fixed in the same patch: a larger output
   now says "N% larger" instead of the misleading "0% smaller".

Asset version bumped to ?v=4 for this redeploy.

## Live re-verification (after ?v=4 redact fix) — 2026-11-09 12:24-12:27 PKT

Head commit at test time: f3cd817. All three checks PASS, verified
twice (browser agent + my own check of the downloaded files).

1. REDACT — PASS. Live status: "Done. Redacted 1 match(es) on 1
   page(s) — those pages are now images with no text layer, so the
   covered text cannot be copied." Download link present
   (ak-premium-redacted.pdf, 11,313 bytes). My own check of the
   downloaded file: page 1 text is EMPTY (SecretWord gone, page is
   an image), page 2 still reads "Second page, no secret here."
   The detached-ArrayBuffer bug is fixed on live.
2. UNLOCK — PASS. sample-protected.pdf (qpdf-encrypted, password
   test1234) unlocked live: "Done. Unlocked PDF downloaded with its
   original pages and layout." Downloaded file: 5 pages, NOT
   encrypted. Wrong password ("wrongpassword") gives the exact
   message: "Wrong password. Please check the password and try
   again."
3. MERGE — PASS. 2 files x 2 pages merged; downloaded file is
   4 pages, visible download link present.
4. CONSENT — NOT verified by a fresh first-visit click: the browser
   automation has no incognito window, so a true first visit could
   not be simulated. What stands: jsdom click test (Accept ->
   banner hidden, localStorage "accepted"), the deployed
   `.consent-banner[hidden]{display:none}` rule, and the banner
   staying absent on repeat visits (stored choice honoured).
   A real first-visit check on a fresh phone/browser is still
   worth doing by hand.

No console errors were reported in any round. Compress "N% larger"
wording is live in code (sizeChangeNote); it was not re-run live
in this round — the earlier live run already showed the honest
numbers (2.3 KB -> 67.2 KB) and the wording only changes the label.

## v5 fixes (2026-11-10) — user-reported: empty cards, contact form error, hero fit, mobile

Four issues, all with a real root cause found in the code:

1. EMPTY TOOL CARDS — the cards were blank white boxes with no icon.
   Root cause (two bugs): (a) the card template uses `<use href="#i-...">`
   but the 18 `<symbol>` definitions from the v3 index were never copied
   into the v4 pages, so every icon reference pointed at nothing;
   (b) the template used class `tool-icon` while the CSS styles
   `.tool-card .icon`, so even a present icon would have had no tile.
   Fix: the sprite is now injected after `<body>` on every generated
   page, and the card class is `icon`. jsdom check: all 68 `<use>`
   references on all 76 pages resolve to a `<symbol>` on the same page.
2. CONTACT FORM ERROR — pressing Send showed an error page. Root cause:
   the form was `<form action="mailto:..." method="get">`, which makes
   the browser navigate to `mailto:...?name=...&email=...&body=...` —
   invalid mailto parameters that browsers reject. Fix: the form is now
   handled in common.js — it builds a proper
   `mailto:?subject=...&body=...` with encodeURIComponent and opens it
   with an anchor click, so the page never navigates anywhere. A success
   note appears, and a Copy message button is revealed as a fallback
   when no email app is set up. jsdom check: submit leaves the URL
   unchanged, mailto is correctly encoded, success note shows.
3. HERO DID NOT FIT — the hero was capped at 1180px and centered while
   the tool grid spanned the full page width. Fix: the homepage now
   uses one shared container (`.home-wrap`, max-width 1280px) and the
   hero spans its full width, so hero and grid edges line up at every
   screen size.
4. MOBILE LAYOUT — the contact form fields sat side by side and
   overflowed, and the grid stayed at 150px minimum columns. Fix:
   form fields stack full-width; at 640px the grid is 2 equal columns
   with tighter cards and header; at 420px it is a single column.
   Live mobile screenshot check still to do after deploy.

Asset version bumped to ?v=5. Head commit: 8e52680 (Vercel Ready).

Live verification 2026-11-10 14:48-14:49 PKT (fresh tab, 1920px):
1. ICONS — PASS. Every card shows a small coloured icon tile.
   Confirmed twice: the browser agent's report, and my own look at the
   rendered homepage PDF (Create PDF pink doc icon, Images to PDF blue
   image icon, Merge PDF merge icon, and so on). No empty cards.
2. HERO — PASS. Hero edges line up with the tool grid (both span
   x=330 to x=1570 in the 1920px screenshot).
3. CONTACT — PASS. Fields stacked full-width; submitted Test User /
   test@example.com / test message: page stayed put, no error page,
   success note shown verbatim, Copy message button appeared. No
   email was sent (mailto by design).
4. MOBILE — NOT VERIFIED by a real render. The browser automation
   cannot resize its window and DevTools/device emulation would not
   open, and there is no local headless browser on this machine.
   The mobile CSS rules (stacked form, 2 columns at 640px, 1 column
   at 420px) are deployed and were checked structurally in jsdom, but
   a real 390px render still needs checking on a phone.

## v5.1 — Google Forms contact form (2026-11-10)

User asked to replace the mailto contact form with a Google Form.
Form created via the Google Forms connector in his own Google account:
"Contact AK Premium", form ID 1CidO_9A3CcXY3KtnMM2iBfRgqlKX2k8fG-Q28fQfcjA,
published and accepting responses. Questions: Your name (required),
Your email (required), Which tool is this about? (optional), Message
(required, paragraph). Email is asked as a question, not collected
from a Google sign-in, so anyone can write in without an account.
contact.html now embeds it as an iframe (?embedded=true) with an
inline height (820px) so it renders correctly even before the updated
stylesheet is re-fetched, plus a fallback link to open the form in a
new tab. The old mailto form is gone; the "Email us" mailto button
stays. jsdom check: iframe src correct, no mailto form, email button
and fallback link present.
Live verification 2026-11-10 15:06-15:09 PKT: deployed (GitHub HEAD
5ccbfef, Vercel Ready). The contact page renders the embedded
"Contact AK Premium" Google Form with all four fields, Submit/Clear
form buttons, the fallback link, and the "Email us" button. PASS.

## v5.2 — contact form on the right, no scroll (2026-11-10)

User said the embedded form looked bad: it sat centred in the middle
of the page, and it scrolled inside its frame. Fix: the contact page
is now two columns — the text (intro, Email us button, What to tell
us) on the left, the Google Form on the right. The iframe is taller
(1000px desktop, 1150px on small screens) so the four questions and
the Submit button fit without an inner scrollbar. The layout CSS is
inlined in the contact page head so it applies on first load even
while the stylesheet is still cached, and the same rules live in
styles.css. Info and tool pages also gain a proper centred container
(.page, max-width 1180px) — they had no side padding at all before.
jsdom check: two columns, left has Email us + What to tell us, right
has Send a message + iframe at 1000px, inline CSS present.
Live verification 2026-11-10 15:15 PKT (fresh tab, 1920px, HEAD
3c5b203): LAYOUT PASS — two columns, text left, form right, content
centred in a 1180px container (margins match the CSS exactly).
FORM PASS — all four fields and Submit visible, no inner scrollbar
(the full form renders inside the frame). TEXT PASS — left column
reads cleanly, no overlap. Note: the saved page PDF renders single
column because it is Letter-size print (816px wide), which is below
the 820px stacking breakpoint — that is the print view, not the
screen view. The live HTML was also confirmed served with the new
layout by curl.

## v6 — Phase 1 design system (2026-11-11)

New harness: `~/workspace/tools/jsdom-test/run-v6.js`, 37 checks, ALL PASS.
- 76 pages: every `<use>` resolves to a `<symbol>` on the same page (220 uses);
  1 h1, canonical, title, valid JSON-LD on every page; theme flash script
  present before the stylesheet link; 2 font preloads; 2 theme-color metas;
  og:image + summary_large_image; `?v=6` on all four assets; no `ilove`
  naming anywhere; icon theme toggle (sun/moon, aria-pressed) and flat SVG
  brand mark + tagline on every page.
- Homepage: 68 cards, all with `data-group`; 6 Pakistan (green tile),
  7 Excel (teal tile), 6 limited tools (warning tile).
- CSS: `!important` only in the reduced-motion rule; no gradients; no
  dead classes; no hard-coded colour outside the token blocks; tokens
  match the spec exactly; 3 @font-face rules; Urdu typography rules;
  focus-visible, callout and loading-button styles present.
- Fonts on disk verified as woff2 (Inter 72,920 B; Plus Jakarta Sans
  27,348 B; Noto Nastaliq Urdu 239,060 B). OG image verified 1200x630.
- Functional in jsdom: flash script applies a saved dark theme, follows
  OS dark with nothing saved, defaults to light; toggle syncs
  aria-pressed, flips theme and saves it; search "merge" shows only
  Merge PDF and announces the count; clearing search shows all 68.
- Contrast computed in Python for 25 token pairs: all pass WCAG AA
  (text >= 4.5:1, icons >= 3:1). One failure found and fixed before
  deploy: dark button hover #6366f1 was 4.47:1, changed to #4338ca
  (7.9:1); dark button press #3730a3 is 9.93:1.
- NOT verified in this phase: real-browser render (desktop/mobile),
  Lighthouse scores, CLS with the new self-hosted fonts, dark-mode
  visual check of every component (hero, chips, tabs, FAQ, footer,
  dropzone, thumbs, output-box, terminal, consent banner, swatches,
  forms, tables). Those need the live browser check after deploy.

## v7 (Phase 2) — 11 November 2026

- Harness: ~/workspace/tools/jsdom-test/run-v7.js — all checks pass.
  Covers the v6 head contract on 78 pages (new: /pakistan, /whats-new),
  74 homepage cards (68 + 6 Popular), section order, badges, format
  pills, Urdu subtitles, SearchAction JSON-LD, header dropdown/burger/
  mobile menu, footer columns, sitemap (77 URLs), and functional search
  (spaceless "pdftoword", Urdu "زکوٰۃ", no-results box, clear button,
  "/" shortcut, /?q=merge prefill).
- Fixed during testing: footer had no /pakistan link (added); Zakat was
  spelled with Arabic teh marbuta U+0629 instead of Urdu U+06C3 (fixed
  in build.py, plus Arabic-to-Urdu letter normalisation in normText);
  the whats-new page legitimately mentions the old "ilove" naming and
  ?v=6 in its history, so the harness exempts it from those two checks.
- Not verified: real-browser render (desktop/mobile), Lighthouse scores,
  dark-mode visual check of every component, keyboard-only walkthrough
  in a real browser.
